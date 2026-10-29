// 관리자 메인 탭 미니 지도 — 선택한 CCTV + 주변 시설물.
//   운영 화면(MapBaseML) 은 컨트롤·마커·측정까지 얹혀 있어 무거우므로 여기선 쓰지 않는다.
//   · 파란 원  : 선택한 CCTV
//   · 색 원    : 시설물 (분류색 = 목록 점/범례와 동일)
//   · 점선 원  : 반경 필터 기준 (반경을 고른 경우)

import { useEffect, useRef } from 'react'
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import { TILE_URLS } from '@/features/shared/map/tileUrls'
import { circleSvg } from '@/features/shared/map/markerElement'
import { CLFY_COLOR, LABEL_BY_CODE } from './classification'
import type { FacilityPointOf } from './facilityPoints'

const ZOOM = 16
const CCTV_COLOR = '#42B8FF'
const RING_SRC = 'admin-mini-ring'

interface Props {
  lat: number
  lng: number
  /** 표시할 시설물 — 호출처가 분류/반경으로 이미 걸러서 넘긴다. */
  facilities?: readonly FacilityPointOf[]
  /** 반경(m) — 주면 CCTV 기준 점선 원을 그린다. */
  radiusM?: number | null
}

/** 반경 원 폴리곤 (64각형) — maplibre 의 circle 은 픽셀 단위라 미터 반경엔 못 쓴다. */
function ringFC(lng: number, lat: number, radiusM: number) {
  const rad = Math.PI / 180
  const dLat = radiusM / 111_320
  const dLng = radiusM / (111_320 * Math.cos(lat * rad))
  const ring: [number, number][] = []
  for (let i = 0; i <= 64; i += 1) {
    const t = (i / 64) * Math.PI * 2
    ring.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)])
  }
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Polygon' as const, coordinates: [ring] },
      },
    ],
  }
}

export function AdminCctvMiniMap({
  lat,
  lng,
  facilities = [],
  radiusM = null,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const readyRef = useRef(false)
  const cctvMarkerRef = useRef<maplibregl.Marker | null>(null)
  const facMarkersRef = useRef<maplibregl.Marker[]>([])
  const tipRef = useRef<maplibregl.Popup | null>(null)
  if (!tipRef.current) {
    tipRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      anchor: 'bottom',
      offset: [0, -12],
      className: 'cctv-tip-popup',
      maxWidth: 'none',
    })
  }

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
      center: [lng, lat],
      zoom: ZOOM,
      attributionControl: false,
    })
    mapRef.current = map
    map.on('load', () => {
      map.addSource(RING_SRC, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'admin-mini-ring-fill',
        type: 'fill',
        source: RING_SRC,
        paint: { 'fill-color': CCTV_COLOR, 'fill-opacity': 0.06 },
      })
      map.addLayer({
        id: 'admin-mini-ring-line',
        type: 'line',
        source: RING_SRC,
        paint: {
          'line-color': CCTV_COLOR,
          'line-width': 1.5,
          'line-dasharray': [3, 3],
        },
      })
      readyRef.current = true
    })
    return () => {
      tipRef.current?.remove()
      cctvMarkerRef.current?.remove()
      facMarkersRef.current.forEach((m) => m.remove())
      facMarkersRef.current = []
      readyRef.current = false
      map.remove()
      mapRef.current = null
    }
    // 최초 1회만 생성 — 좌표 변경은 아래 effect 가 처리 (지도 재생성은 비싸다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 선택이 바뀌면 CCTV 마커만 옮기고 카메라 이동 + 반경 원 갱신.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    cctvMarkerRef.current?.remove()
    const el = document.createElement('div')
    el.style.lineHeight = '0'
    el.innerHTML = circleSvg(CCTV_COLOR)
    cctvMarkerRef.current = new maplibregl.Marker({
      element: el,
      anchor: 'center',
    })
      .setLngLat([lng, lat])
      .addTo(map)
    map.easeTo({ center: [lng, lat], zoom: ZOOM, duration: 400 })

    const apply = () => {
      const src = map.getSource(RING_SRC) as maplibregl.GeoJSONSource | undefined
      src?.setData(
        radiusM
          ? ringFC(lng, lat, radiusM)
          : { type: 'FeatureCollection', features: [] },
      )
    }
    if (readyRef.current) apply()
    else map.once('load', apply)
  }, [lat, lng, radiusM])

  // 시설물 마커 — 분류색 원 + hover 이름.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    facMarkersRef.current.forEach((m) => m.remove())
    facMarkersRef.current = []
    for (const f of facilities) {
      const el = document.createElement('div')
      el.style.lineHeight = '0'
      el.innerHTML = circleSvg(CLFY_COLOR[f.clfy] ?? '#7F97AF')
      el.addEventListener('mouseenter', () => {
        const label = LABEL_BY_CODE[f.subCode] ?? f.name
        tipRef.current
          ?.setText(`${LABEL_BY_CODE[f.clfy] ?? f.clfy} / ${label}`)
          .setLngLat([f.lng, f.lat])
          .addTo(map)
      })
      el.addEventListener('mouseleave', () => tipRef.current?.remove())
      facMarkersRef.current.push(
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([f.lng, f.lat])
          .addTo(map),
      )
    }
  }, [facilities])

  return <div ref={boxRef} style={{ width: '100%', height: '100%' }} />
}
