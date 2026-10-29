// 거리 측정 (MapLibre) — 다중 구간 폴리라인.
//   클릭: 점 추가 / 마우스이동: 마지막 점→커서 rubber-band + 실시간 누적거리
//   더블클릭: 종료(선/거리 고정) / Esc: 현재 측정 취소
//   active=false 또는 resetSeq 변경 시 정리.

import { useEffect, type RefObject } from 'react'
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'

const SRC_LINE = 'dist-measure-line'
const SRC_PTS = 'dist-measure-pts'
const COLOR = '#1EA7FF'
type LngLat = [number, number]

// haversine 거리 (m).
function segDist(a: LngLat, b: LngLat): number {
  const R = 6371000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b[1] - a[1])
  const dLng = rad(b[0] - a[0])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
function totalDist(pts: LngLat[]): number {
  let d = 0
  for (let i = 1; i < pts.length; i++) d += segDist(pts[i - 1], pts[i])
  return d
}
function fmt(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)}km` : `${Math.round(m)}m`
}

const lineFC = (coords: LngLat[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features:
    coords.length >= 2
      ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }]
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

export function useDistanceMeasure(
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

    // 소스/레이어 준비 (중복 add 방지).
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

    // 거리 라벨 (pill) — 마지막 점/커서 위치에 누적거리.
    const showLabel = (at: LngLat, text: string) => {
      if (!label) {
        const el = document.createElement('div')
        el.style.cssText =
          'transform:translateY(-14px);padding:2px 8px;border-radius:99px;border:1px solid ' +
          COLOR +
          ';background:rgba(0,18,41,0.90);color:#fff;font-family:Roboto,sans-serif;font-size:12px;font-weight:600;line-height:16px;white-space:nowrap;pointer-events:none;'
        label = new maplibregl.Marker({ element: el, anchor: 'bottom' })
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

    // 라인/점/라벨 갱신. cursor 주면 rubber-band 포함.
    const redraw = (cursor?: LngLat) => {
      const live = cursor && !finished ? [...points, cursor] : points
      setData(SRC_LINE, lineFC(live))
      setData(SRC_PTS, ptsFC(points))
      if (live.length >= 2) showLabel(live[live.length - 1], fmt(totalDist(live)))
      else hideLabel()
    }

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const p = e.lngLat.toArray() as LngLat
      if (finished) {
        // 완료 후 새 클릭 → 새 측정 시작.
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
      e.preventDefault() // doubleClickZoom 방지
      // dblclick = click 2회 + dblclick → 마지막 점이 중복. 하나 제거 후 종료.
      if (points.length >= 3) {
        const a = points[points.length - 1]
        const b = points[points.length - 2]
        if (a[0] === b[0] && a[1] === b[1]) points.pop()
      }
      if (points.length >= 2) {
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
      if (map.getLayer(SRC_LINE)) map.removeLayer(SRC_LINE)
      if (map.getLayer(SRC_PTS)) map.removeLayer(SRC_PTS)
      if (map.getSource(SRC_LINE)) map.removeSource(SRC_LINE)
      if (map.getSource(SRC_PTS)) map.removeSource(SRC_PTS)
    }
  }, [mapRef, active, resetSeq])
}
