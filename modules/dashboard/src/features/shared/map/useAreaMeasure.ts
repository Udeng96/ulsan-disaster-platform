// 면적 측정 (MapLibre) — 폴리곤.
//   클릭: 꼭짓점 추가 / 마우스이동: 커서 포함 실시간 폴리곤 + 면적
//   더블클릭: 종료(폴리곤 닫고 고정) / Esc: 현재 측정 초기화
//   active=false 또는 resetSeq 변경 시 정리.

import { useEffect, type RefObject } from 'react'
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'

const SRC_FILL = 'area-measure-fill'
const SRC_LINE = 'area-measure-line'
const SRC_PTS = 'area-measure-pts'
const COLOR = '#1EA7FF'
type LngLat = [number, number]

// 구면 폴리곤 면적 (m²) — turf.area 방식.
function ringArea(coords: LngLat[]): number {
  const R = 6378137
  const rad = (d: number) => (d * Math.PI) / 180
  const len = coords.length
  if (len < 3) return 0
  let total = 0
  for (let i = 0; i < len; i++) {
    const [lng1, lat1] = coords[i]
    const [lng2, lat2] = coords[(i + 1) % len]
    total += rad(lng2 - lng1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)))
  }
  return Math.abs((total * R * R) / 2)
}
function fmtArea(m2: number): string {
  return m2 >= 1_000_000
    ? `${(m2 / 1_000_000).toFixed(2)}㎢`
    : `${Math.round(m2).toLocaleString('ko-KR')}㎡`
}
// 폴리곤 중심 (라벨 위치용) — 꼭짓점 평균.
function centroid(coords: LngLat[]): LngLat {
  const s = coords.reduce((a, c) => [a[0] + c[0], a[1] + c[1]], [0, 0])
  return [s[0] / coords.length, s[1] / coords.length]
}

const fillFC = (coords: LngLat[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features:
    coords.length >= 3
      ? [
          {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [[...coords, coords[0]]] },
          },
        ]
      : [],
})
const lineFC = (coords: LngLat[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features:
    coords.length >= 2
      ? [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates:
                coords.length >= 3 ? [...coords, coords[0]] : coords,
            },
          },
        ]
      : [],
})
const ptsFC = (coords: LngLat[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features: coords.map((c) => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: c },
  })),
})

export function useAreaMeasure(
  mapRef: RefObject<MlMap | null>,
  active: boolean,
  resetSeq: number,
) {
  useEffect(() => {
    const map = mapRef.current
    if (!map || !active) return

    let points: LngLat[] = []
    let finished = false
    let label: maplibregl.Marker | null = null

    if (!map.getSource(SRC_FILL)) {
      map.addSource(SRC_FILL, { type: 'geojson', data: fillFC([]) })
      map.addLayer({
        id: SRC_FILL,
        type: 'fill',
        source: SRC_FILL,
        paint: { 'fill-color': COLOR, 'fill-opacity': 0.15 },
      })
    }
    if (!map.getSource(SRC_LINE)) {
      map.addSource(SRC_LINE, { type: 'geojson', data: lineFC([]) })
      map.addLayer({
        id: SRC_LINE,
        type: 'line',
        source: SRC_LINE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': COLOR, 'line-width': 3 },
      })
    }
    if (!map.getSource(SRC_PTS)) {
      map.addSource(SRC_PTS, { type: 'geojson', data: ptsFC([]) })
      map.addLayer({
        id: SRC_PTS,
        type: 'circle',
        source: SRC_PTS,
        paint: {
          'circle-radius': 4,
          'circle-color': '#FFFFFF',
          'circle-stroke-color': COLOR,
          'circle-stroke-width': 2,
        },
      })
    }

    const setData = (id: string, data: FeatureCollection) => {
      const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined
      src?.setData(data)
    }

    const showLabel = (at: LngLat, text: string) => {
      if (!label) {
        const el = document.createElement('div')
        el.style.cssText =
          'padding:2px 8px;border-radius:99px;border:1px solid ' +
          COLOR +
          ';background:rgba(0,18,41,0.90);color:#fff;font-family:Roboto,sans-serif;font-size:12px;font-weight:600;line-height:16px;white-space:nowrap;pointer-events:none;'
        label = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(at)
          .addTo(map)
      } else {
        label.setLngLat(at)
      }
      label.getElement().textContent = text
    }
    const hideLabel = () => {
      label?.remove()
      label = null
    }

    const redraw = (cursor?: LngLat) => {
      const live = cursor && !finished ? [...points, cursor] : points
      setData(SRC_FILL, fillFC(live))
      setData(SRC_LINE, lineFC(live))
      setData(SRC_PTS, ptsFC(points))
      if (live.length >= 3) showLabel(centroid(live), fmtArea(ringArea(live)))
      else hideLabel()
    }

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const p = e.lngLat.toArray() as LngLat
      if (finished) {
        points = [p]
        finished = false
      } else {
        points.push(p)
      }
      redraw()
    }
    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (finished || points.length === 0) return
      redraw(e.lngLat.toArray() as LngLat)
    }
    const onDblClick = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault()
      // dblclick = click 2회 + dblclick → 마지막 꼭짓점 중복. 제거 후 종료.
      if (points.length >= 4) {
        const a = points[points.length - 1]
        const b = points[points.length - 2]
        if (a[0] === b[0] && a[1] === b[1]) points.pop()
      }
      if (points.length >= 3) {
        finished = true
        redraw()
      }
    }
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        points = []
        finished = false
        redraw()
      }
    }

    map.doubleClickZoom.disable()
    map.on('click', onClick)
    map.on('mousemove', onMouseMove)
    map.on('dblclick', onDblClick)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      map.off('click', onClick)
      map.off('mousemove', onMouseMove)
      map.off('dblclick', onDblClick)
      window.removeEventListener('keydown', onKeyDown)
      map.doubleClickZoom.enable()
      hideLabel()
      for (const id of [SRC_FILL, SRC_LINE, SRC_PTS]) {
        if (map.getLayer(id)) map.removeLayer(id)
        if (map.getSource(id)) map.removeSource(id)
      }
    }
  }, [mapRef, active, resetSeq])
}
