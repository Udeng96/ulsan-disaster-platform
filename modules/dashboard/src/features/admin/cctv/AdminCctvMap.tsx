// 관리자 '시설물' 탭 본문 지도 — 선택한 시설물에 해당하는 CCTV 를 마커로 표출.
//   클러스터 규격은 운영 지도(CctvMarkersML) 와 동일하게 맞춘다:
//     · GeoJSON source cluster (radius 50 / maxZoom 17)
//     · 클러스터는 32×32 DOM 배지 (style 에 glyphs 가 없어 symbol 텍스트 불가),
//       조회/hit 용 circle layer 는 투명
//     · 낱개는 반지름 7.5 원 + 흰 테두리

import { useEffect, useRef } from 'react'
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import { TILE_URLS } from '@/features/shared/map/tileUrls'
import { circleSvg } from '@/features/shared/map/markerElement'
import type { CctvItem } from '@/api/cctv'
import type { FacilityPoint } from './facilityPoints'

// 남구 청사 부근 — 표출할 CCTV 가 없을 때 초기 화면.
const HOME: [number, number] = [0.0, 0.0]
const HOME_ZOOM = 12

const SRC = 'admin-cctv-src'
const CLUSTER_LAYER = 'admin-cctv-cluster'
const DOT_LAYER = 'admin-cctv-dot'

const CLUSTER_RADIUS = 50
const CLUSTER_MAX_ZOOM = 17
const CLUSTER_BADGE_SIZE = 32

const COLOR = '#42B8FF'
const HOVER_STROKE = '#1EA7FF'
// 일괄 등록에서 체크된 마커 — 크게 + 초록으로 확실히 구분한다.
const CHECKED_COLOR = '#30D158'
// 시설물 지점(일괄 등록의 반경 기준점).
const FACILITY_COLOR = '#FF9F0A'
const RING_SRC = 'admin-cctv-ring'

/** 클러스터 배지 32×32 — 운영 지도(CctvMarkersML) 의 normal/hover 배지와 같은 규격. */
function clusterSvg(count: number, hover: boolean): string {
  const ring = hover
    ? `<circle cx="16" cy="16" r="15" stroke="${HOVER_STROKE}" stroke-width="2"/>`
    : `<circle cx="16" cy="16" r="15" stroke="#1B1B1C" stroke-opacity="0.25" stroke-width="2"/>`
  const body = hover
    ? `<circle cx="16" cy="16" r="13" fill="#B2B4B8" fill-opacity="0.75" stroke="${HOVER_STROKE}" stroke-width="2"/>`
    : `<circle cx="16" cy="16" r="13" fill="#B2B4B8" fill-opacity="0.75" stroke="white" stroke-width="2"/>`
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
  ${ring}
  ${body}
  <text x="16" y="16" text-anchor="middle" dominant-baseline="central"
        fill="#1B1B1C" font-family="Roboto, system-ui, sans-serif" font-size="13" font-weight="700">${count}</text>
</svg>`
}

interface Props {
  cctvs: CctvItem[]
  /** 카메라를 맞출 대상 — 없으면 cctvs 전체가 보이게 맞춘다. 좌표만 있으면 된다. */
  fitTo?: ReadonlyArray<{ lat: number; lng: number }>
  /** 낱개 마커를 클릭했을 때 — 아래 플레이어에서 재생할 카메라. */
  onSelect?: (cctvId: string) => void
  selectedId?: string | null
  /** 목록에서 고른 순번 — 값이 바뀔 때마다 selectedId 위치로 이동·확대한다. */
  focusSeq?: number
  /** 일괄 등록 모드 — 체크된 id. 있으면 마커 클릭이 체크 토글이 된다. */
  checked?: Set<string>
  onToggleCheck?: (cctvId: string) => void
  /** 일괄 등록의 기준 시설물 지점 — 마커 + 반경 원으로 표시. */
  facilityPoints?: FacilityPoint[]
  /** 반경(m) — null 이면 원을 그리지 않는다. */
  radiusM?: number | null
}

/** 반경 원 폴리곤 (64각형) — maplibre 의 circle 은 픽셀 단위라 미터 반경엔 못 쓴다. */
function ringFC(points: FacilityPoint[], radiusM: number) {
  const rad = Math.PI / 180
  return {
    type: 'FeatureCollection' as const,
    features: points.map((p) => {
      const dLat = radiusM / 111_320
      const dLng = radiusM / (111_320 * Math.cos(p.lat * rad))
      const ring: [number, number][] = []
      for (let i = 0; i <= 64; i += 1) {
        const t = (i / 64) * Math.PI * 2
        ring.push([p.lng + dLng * Math.cos(t), p.lat + dLat * Math.sin(t)])
      }
      return {
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Polygon' as const, coordinates: [ring] },
      }
    }),
  }
}

/** 목록에서 골랐을 때 확대할 줌 — 클러스터 해제 줌(17)보다 커야 낱개로 풀린다. */
const FOCUS_ZOOM = 18

function toFC(cctvs: CctvItem[], checked?: Set<string>) {
  return {
    type: 'FeatureCollection' as const,
    features: cctvs.map((c) => ({
      type: 'Feature' as const,
      properties: {
        cctvId: c.cctvId,
        name: c.name,
        checked: checked?.has(c.cctvId) ? 1 : 0,
      },
      geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
    })),
  }
}

export function AdminCctvMap({
  cctvs,
  fitTo,
  onSelect,
  selectedId,
  focusSeq,
  checked,
  onToggleCheck,
  facilityPoints,
  radiusM,
}: Props) {
  // 지도 이벤트 핸들러는 한 번만 등록하므로 최신 콜백을 ref 로 참조한다.
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const onToggleRef = useRef(onToggleCheck)
  onToggleRef.current = onToggleCheck
  const facilityMarkersRef = useRef<maplibregl.Marker[]>([])

  const boxRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const readyRef = useRef(false)
  const tipRef = useRef<maplibregl.Popup | null>(null)

  useEffect(() => {
    if (!boxRef.current) return
    const map = new maplibregl.Map({
      container: boxRef.current,
      style: {
        version: 8,
        sources: {
          base: { type: 'raster', tiles: [TILE_URLS.normal], tileSize: 256 },
        },
        layers: [{ id: 'base', type: 'raster', source: 'base' }],
      },
      center: HOME,
      zoom: HOME_ZOOM,
      attributionControl: false,
    })
    mapRef.current = map

    // 클러스터 배지 — 마커를 재사용해 이동/줌 중에도 따라오게 한다 (rAF 로 프레임당 1회).
    const badges = new Map<number, maplibregl.Marker>()
    let raf = 0

    const draw = () => {
      raf = 0
      if (!map.getLayer(CLUSTER_LAYER)) return
      const feats = map.queryRenderedFeatures({ layers: [CLUSTER_LAYER] })
      const alive = new Set<number>()
      for (const f of feats) {
        const id = f.properties?.cluster_id as number | undefined
        const count = f.properties?.point_count as number | undefined
        if (id == null || count == null) continue
        alive.add(id)
        const at = (f.geometry as GeoJSON.Point).coordinates as [number, number]
        let marker = badges.get(id)
        if (!marker) {
          const el = document.createElement('div')
          el.style.lineHeight = '0'
          el.style.cursor = 'pointer'
          el.innerHTML = clusterSvg(count, false)
          el.addEventListener('mouseenter', () => {
            el.innerHTML = clusterSvg(count, true)
          })
          el.addEventListener('mouseleave', () => {
            el.innerHTML = clusterSvg(count, false)
          })
          el.addEventListener('click', () => {
            const src = map.getSource(SRC) as maplibregl.GeoJSONSource
            src.getClusterExpansionZoom(id).then((zoom) => {
              map.easeTo({ center: at, zoom, duration: 400 })
            })
          })
          // 좌표를 먼저 넣고 붙인다 — lngLat 없는 마커를 addTo 하면 maplibre 가 터진다.
          marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat(at)
            .addTo(map)
          badges.set(id, marker)
        } else {
          marker.getElement().innerHTML = clusterSvg(count, false)
          marker.setLngLat(at)
        }
      }
      // 화면에서 사라진 클러스터 정리.
      for (const [id, marker] of badges) {
        if (alive.has(id)) continue
        marker.remove()
        badges.delete(id)
      }
    }
    const requestDraw = () => {
      if (raf) return
      raf = requestAnimationFrame(draw)
    }

    map.on('load', () => {
      // 반경 원 — 시설물 지점 기준.
      map.addSource(RING_SRC, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'admin-cctv-ring-fill',
        type: 'fill',
        source: RING_SRC,
        paint: { 'fill-color': FACILITY_COLOR, 'fill-opacity': 0.08 },
      })
      map.addLayer({
        id: 'admin-cctv-ring-line',
        type: 'line',
        source: RING_SRC,
        paint: {
          'line-color': FACILITY_COLOR,
          'line-width': 1.5,
          'line-dasharray': [3, 3],
        },
      })
      map.addSource(SRC, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: CLUSTER_RADIUS,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        // 타일 최대 줌 = 클러스터 해제 줌 + 1 (높은 줌에서 옛 클러스터 잔상 방지).
        maxzoom: CLUSTER_MAX_ZOOM + 1,
      })
      // 클러스터 — 보이지 않게. DOM 배지를 그리기 위한 조회용 레이어.
      map.addLayer({
        id: CLUSTER_LAYER,
        type: 'circle',
        source: SRC,
        filter: ['has', 'point_count'],
        paint: {
          'circle-radius': CLUSTER_BADGE_SIZE / 2,
          'circle-opacity': 0,
        },
      })
      // 묶이지 않은 낱개 CCTV.
      map.addLayer({
        id: DOT_LAYER,
        type: 'circle',
        source: SRC,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'checked'], 1],
            11,
            7.5,
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'checked'], 1],
            CHECKED_COLOR,
            COLOR,
          ],
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'checked'], 1],
            3,
            1.5,
          ],
        },
      })

      // 마커 hover → 이름 툴팁. 운영 지도(CctvMarkersML) 와 같은 규격·디자인.
      const tip = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        anchor: 'bottom',
        offset: [0, -12],
        className: 'cctv-tip-popup',
        maxWidth: 'none',
      })
      map.on('mousemove', DOT_LAYER, (e) => {
        const f = e.features?.[0]
        const name = f?.properties?.name
        if (!f || typeof name !== 'string') return
        tip
          .setLngLat(
            (f.geometry as GeoJSON.Point).coordinates as [number, number],
          )
          .setText(name)
          .addTo(map)
      })
      map.on('mouseleave', DOT_LAYER, () => tip.remove())
      tipRef.current = tip

      // 낱개 마커 클릭 → 그 카메라 선택.
      map.on('click', DOT_LAYER, (e) => {
        const id = e.features?.[0]?.properties?.cctvId
        if (typeof id !== 'string') return
        // 일괄 등록 모드에서는 클릭이 체크 토글.
        if (onToggleRef.current) onToggleRef.current(id)
        else onSelectRef.current?.(id)
      })
      map.on('mouseenter', DOT_LAYER, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', DOT_LAYER, () => {
        map.getCanvas().style.cursor = ''
      })

      readyRef.current = true
      requestDraw()
    })

    map.on('move', requestDraw)
    map.on('idle', requestDraw)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      facilityMarkersRef.current.forEach((m) => m.remove())
      facilityMarkersRef.current = []
      tipRef.current?.remove()
      tipRef.current = null
      badges.forEach((m) => m.remove())
      badges.clear()
      readyRef.current = false
      map.remove()
      mapRef.current = null
    }
  }, [])

  // 선택된 카메라만 테두리를 Primary 로.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      if (!map.getLayer(DOT_LAYER)) return
      map.setPaintProperty(DOT_LAYER, 'circle-stroke-color', [
        'case',
        ['==', ['get', 'cctvId'], selectedId ?? ''],
        HOVER_STROKE,
        '#FFFFFF',
      ])
      map.setPaintProperty(DOT_LAYER, 'circle-stroke-width', [
        'case',
        ['any',
          ['==', ['get', 'cctvId'], selectedId ?? ''],
          ['==', ['get', 'checked'], 1],
        ],
        3,
        1.5,
      ])
    }
    if (readyRef.current) apply()
    else map.once('load', apply)
  }, [selectedId])

  // 시설물 지점 마커 + 반경 원.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      facilityMarkersRef.current.forEach((m) => m.remove())
      facilityMarkersRef.current = []
      for (const p of facilityPoints ?? []) {
        const el = document.createElement('div')
        el.style.lineHeight = '0'
        el.style.cursor = 'default'
        el.innerHTML = circleSvg(FACILITY_COLOR)
        // hover → 시설물 이름 툴팁 (CCTV 마커와 같은 규격).
        el.addEventListener('mouseenter', () => {
          const tip = tipRef.current
          const map = mapRef.current
          if (!tip || !map) return
          tip.setText(p.name).setLngLat([p.lng, p.lat]).addTo(map)
        })
        el.addEventListener('mouseleave', () => tipRef.current?.remove())
        facilityMarkersRef.current.push(
          new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([p.lng, p.lat])
            .addTo(map),
        )
      }
      const ring = map.getSource(RING_SRC) as
        | maplibregl.GeoJSONSource
        | undefined
      ring?.setData(
        radiusM && facilityPoints?.length
          ? ringFC(facilityPoints, radiusM)
          : { type: 'FeatureCollection', features: [] },
      )
    }
    if (readyRef.current) apply()
    else map.once('load', apply)
  }, [facilityPoints, radiusM])

  // 목록에서 고른 카메라로 이동·확대 (지도 마커 클릭으로 고른 건 이동하지 않는다).
  useEffect(() => {
    if (!focusSeq) return
    const map = mapRef.current
    const target = cctvs.find((c) => c.cctvId === selectedId)
    if (!map || !target) return
    map.flyTo({
      center: [target.lng, target.lat],
      zoom: FOCUS_ZOOM,
      duration: 700,
    })
    // 좌표는 selectedId 로 찾으므로 focusSeq 만 트리거로 쓴다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSeq])

  // 목록이 바뀌면 마커 갱신 + 전체가 보이게 카메라 이동.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined
      if (!src) return
      src.setData(toFC(cctvs, checked))
    }
    if (readyRef.current) apply()
    else map.once('load', apply)
  }, [cctvs, checked])

  // 카메라 맞추기 — fitTo(없으면 cctvs) 가 바뀔 때만.
  const fitList = fitTo ?? cctvs
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      if (fitList.length === 0) {
        map.easeTo({ center: HOME, zoom: HOME_ZOOM, duration: 400 })
        return
      }
      const b = new maplibregl.LngLatBounds()
      fitList.forEach((c) => b.extend([c.lng, c.lat]))
      // 지점이 하나뿐이어도 과하게 확대되지 않게 (주변이 같이 보이도록).
      map.fitBounds(b, { padding: 80, maxZoom: 15, duration: 500 })
    }
    if (readyRef.current) apply()
    else map.once('load', apply)
  }, [fitList])

  return (
    <div className="admin-cctv-bigmap">
      <div ref={boxRef} className="admin-cctv-bigmap-canvas" />
      <div className="admin-cctv-legend">
        <span>
          <i style={{ background: COLOR }} />
          CCTV {cctvs.length.toLocaleString()}건
        </span>
        {checked && (
          <span>
            <i style={{ background: CHECKED_COLOR }} />
            선택 {checked.size.toLocaleString()}건
          </span>
        )}
      </div>
    </div>
  )
}
