// 배수펌프장 마커 (MapLibre) — 펌프장 lat/lng 위치에 색깔 원 표출.
//   전용 펌프 메뉴(idx 0) : 라벨 없음, anchor 'center' + region hover 강조(.pump-marker CSS).
//   레이어 메뉴(idx 5)    : 라벨보기 토글 시 boxed 라벨(마커색 테두리, 아래). 강조 없음.
//
// 사용처: 메인 지도 (MapSection). 부모가 표출 여부/라벨 여부 판단.

import { useEffect, useRef } from 'react'
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import type { PumpStation } from '@/api/pumpStation'
import { circleSvg, createLabeledCircleEl } from './markerElement'

interface Props {
  /** 지도 instance (MapBaseML onReady 콜백에서 받음). */
  map: MlMap
  /** 표출할 펌프장 배열. 빈 배열이면 마커 모두 제거. */
  stations: readonly PumpStation[]
  /** 마커 색 — 백엔드 레이어 PUMP_STATION 색. */
  color?: string
  /** 강조할 배수구역 이름 (PumpRegionPolygons hover 시, 전용 메뉴만).
   *  station.drainageZone === emphasizedRegion 인 마커에 .pump-marker-emphasized
   *  class 토글 → CSS 가 scale 1.5 + halo. null 이면 강조 해제. */
  emphasizedRegion?: string | null
  /** 원 위/아래 펌프장명 라벨 표시 (레이어 메뉴 라벨보기 토글). */
  showLabels?: boolean
}

// 전용 메뉴용 펌프 마커 — .pump-marker > .pump-marker-content > svg (anchor 'center', 강조 대상).
function createPumpMarkerElement(color: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'pump-marker'
  wrapper.style.pointerEvents = 'auto'
  wrapper.innerHTML = `<div class="pump-marker-content">${circleSvg(color)}</div>`
  return wrapper
}

export function PumpMarkers({
  map,
  stations,
  color = '#0054D3',
  emphasizedRegion,
  showLabels = false,
}: Props) {
  // id → element 매핑 (전용 메뉴 강조용). 레이어 메뉴(boxed)에선 강조 없어 미사용.
  const elByIdRef = useRef<Map<number, HTMLDivElement>>(new Map())
  const zoneByIdRef = useRef<Map<number, string>>(new Map())

  useEffect(() => {
    const markers: maplibregl.Marker[] = []
    elByIdRef.current.clear()
    zoneByIdRef.current.clear()
    stations.forEach((s) => {
      if (typeof s.lat !== 'number' || typeof s.lng !== 'number') return
      if (showLabels) {
        // 레이어 메뉴 — boxed 라벨 (아래). 강조 없음.
        const { element, anchor, offset } = createLabeledCircleEl(
          color,
          s.name,
          'boxed',
        )
        const marker = new maplibregl.Marker({ element, anchor, offset })
          .setLngLat([s.lng, s.lat])
          .addTo(map)
        markers.push(marker)
      } else {
        // 전용 펌프 메뉴 — 라벨 없음, anchor 'center' + 강조 대상.
        const el = createPumpMarkerElement(color)
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([s.lng, s.lat])
          .addTo(map)
        markers.push(marker)
        elByIdRef.current.set(s.id, el)
        zoneByIdRef.current.set(s.id, s.drainageZone)
      }
    })
    return () => {
      markers.forEach((m) => m.remove())
      elByIdRef.current.clear()
      zoneByIdRef.current.clear()
    }
  }, [map, stations, color, showLabels])

  // emphasizedRegion 변경 시 — 매칭되는 마커에 class 토글 (전용 메뉴만 element 존재).
  useEffect(() => {
    elByIdRef.current.forEach((el, id) => {
      const shouldEmph =
        emphasizedRegion != null &&
        zoneByIdRef.current.get(id) === emphasizedRegion
      el.classList.toggle('pump-marker-emphasized', shouldEmph)
    })
  }, [emphasizedRegion, stations])

  return null
}
