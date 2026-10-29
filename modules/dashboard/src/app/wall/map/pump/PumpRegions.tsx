// 배수구역 폴리곤 8곳 + 구역 이름 (옛 PumpRegionPolygons 를 새 지도로 옮김, 모양·움직임 같음).
//   interactive (배수펌프장 메뉴): 올리면 그 구역이 솟아오르고, 그 구역 펌프장 마커가 커진다
//   flat (레이어 메뉴): 평면만
//   좌표·색은 PUMP_REGIONS (실측 경계, 보존 규칙). 구역 이름은 8개뿐이라 HTML 그대로.
//   시설 점(pt-*)보다 아래 — 옛 화면에서 HTML 마커가 늘 위였던 것과 같게.
import { useEffect, useId, useMemo, useRef } from 'react'
import maplibregl, { type MapGeoJSONFeature, type MapMouseEvent, type Map as MlMap } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import { PUMP_REGIONS } from '@/features/menus/pump-station/PumpRegionOverlay'

// PUMP_REGIONS.positions 는 Leaflet 타입이지만 값은 [lat, lng] 배열
type LatLng = readonly [number, number]
const tuples = (positions: unknown) => positions as readonly LatLng[]

/** 올렸을 때 솟는 높이 (m) */
const HOVER_HEIGHT = 280
/** 작은 구역에서 커서가 떨려 깜빡이지 않게 나갈 때 기다림 */
const LEAVE_MS = 350
/** 작은 구역은 이름이 안에 안 들어가 조금 내린다 (px) */
const LABEL_OFFSET: Record<string, [number, number]> = { 가상시설0523: [0, 35], 가상시설0291: [-28, 35], 가상시설0472: [28, 35], 가상시설0502: [0, 35] }

const REGIONS = PUMP_REGIONS.filter((r) => !r.lineOnly)

function data(): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: REGIONS.map((r, i) => ({
      type: 'Feature',
      id: i,
      // 겹친 면이 깜빡이지 않게 구역마다 0.5m 씩 띄운다. 평소 두께 0.5m
      properties: { name: r.name, color: r.color, base: i * 0.5, top: i * 0.5 + 0.5 },
      geometry: { type: 'Polygon', coordinates: [tuples(r.positions).map(([lat, lng]) => [lng, lat])] },
    })),
  }
}

/** 단순 평균 가운데 [lng, lat] */
function centroid(positions: readonly LatLng[]): [number, number] {
  const n = positions.length
  return [positions.reduce((s, p) => s + p[1], 0) / n, positions.reduce((s, p) => s + p[0], 0) / n]
}

interface Props {
  map: MlMap
  mode: 'interactive' | 'flat'
  /** 채움 진하기 — 위성·지형도에선 진하게 */
  fillOpacity: number
  /** 올린 구역 이름 (interactive) */
  onHover?: (name: string | null) => void
}

export function PumpRegions({ map, mode, fillOpacity, onHover }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const ids = useMemo(() => ({ src: `pump-${uid}`, fill: `pump-${uid}-fill`, line: `pump-${uid}-line` }), [uid])
  const onHoverRef = useRef(onHover)
  useEffect(() => {
    onHoverRef.current = onHover
  })
  const opacityRef = useRef(fillOpacity)
  useEffect(() => {
    opacityRef.current = fillOpacity
  })

  useEffect(() => {
    const interactive = mode === 'interactive'
    map.addSource(ids.src, { type: 'geojson', data: data() })
    const before = map.getLayersOrder().find((l) => l.startsWith('pt-'))
    map.addLayer(
      {
        id: ids.fill,
        type: 'fill-extrusion',
        source: ids.src,
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-opacity': opacityRef.current,
          'fill-extrusion-base': ['get', 'base'],
          'fill-extrusion-height': interactive ? ['case', ['boolean', ['feature-state', 'hover'], false], HOVER_HEIGHT, ['get', 'top']] : ['get', 'top'],
          'fill-extrusion-vertical-gradient': true,
          'fill-extrusion-height-transition': { duration: 400 },
        },
      },
      before,
    )
    map.addLayer({ id: ids.line, type: 'line', source: ids.src, paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.9 } }, before)

    const labels = REGIONS.map((r) => {
      const el = document.createElement('div')
      el.style.pointerEvents = 'none'
      el.innerHTML = `<div class="marker-label-content is-plain">${r.name}</div>`
      return new maplibregl.Marker({ element: el, anchor: 'center', offset: LABEL_OFFSET[r.name] ?? [0, 0] }).setLngLat(centroid(tuples(r.positions))).addTo(map)
    })

    let hovered: number | null = null
    let leave = 0
    const onMove = (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      if (!e.features?.length) return
      window.clearTimeout(leave)
      // 겹치면 작은 구역 먼저 (PUMP_REGIONS 는 넓은 순이라 id 가 클수록 작다)
      const f = [...e.features].sort((a, b) => Number(b.id) - Number(a.id))[0]
      const id = Number(f.id)
      if (hovered === id) return
      if (hovered !== null) map.setFeatureState({ source: ids.src, id: hovered }, { hover: false })
      hovered = id
      map.setFeatureState({ source: ids.src, id }, { hover: true })
      onHoverRef.current?.((f.properties?.name as string | undefined) ?? null)
      map.getCanvas().style.cursor = 'pointer'
    }
    const onLeave = () => {
      window.clearTimeout(leave)
      leave = window.setTimeout(() => {
        if (hovered !== null) map.setFeatureState({ source: ids.src, id: hovered }, { hover: false })
        hovered = null
        onHoverRef.current?.(null)
        map.getCanvas().style.cursor = ''
      }, LEAVE_MS)
    }
    if (interactive) {
      map.on('mousemove', ids.fill, onMove)
      map.on('mouseleave', ids.fill, onLeave)
    }
    return () => {
      window.clearTimeout(leave)
      labels.forEach((m) => m.remove())
      try {
        if (interactive) {
          map.off('mousemove', ids.fill, onMove)
          map.off('mouseleave', ids.fill, onLeave)
          map.getCanvas().style.cursor = ''
        }
        for (const l of [ids.line, ids.fill]) if (map.getLayer(l)) map.removeLayer(l)
        if (map.getSource(ids.src)) map.removeSource(ids.src)
      } catch {
        // 지도가 먼저 사라짐
      }
    }
  }, [map, mode, ids])

  // 진하기만 바꿀 때는 레이어를 다시 만들지 않는다 (지도 종류 바꿀 때)
  useEffect(() => {
    if (map.getLayer(ids.fill)) map.setPaintProperty(ids.fill, 'fill-extrusion-opacity', fillOpacity)
  }, [map, ids, fillOpacity])

  return null
}
