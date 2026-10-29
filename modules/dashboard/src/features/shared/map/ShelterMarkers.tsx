// 무더위쉼터 마커 (MapLibre) — 71곳.
//   18×18 원 (백엔드 레이어 SHELTER 색) + 옵션 이름 라벨 (공통 빌더 createLabeledCircleEl).
//   레이어 메뉴에서만 표출 → labelStyle 'boxed' (흰 박스 + 마커색 테두리).
//
// 사용처: 메인 지도 (MapSection) — 레이어 메뉴 (idx 5) + 'SHELTER' 체크 시.

import { useEffect } from 'react'
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import type { CoolingShelter } from '@/api/shelter'
import {
  createLabeledCircleEl,
  type MarkerLabelStyle,
} from './markerElement'

interface Props {
  /** 지도 instance (MapBaseML onReady 콜백에서 받음). */
  map: MlMap
  /** 무더위쉼터 배열. 빈 배열이면 마커 모두 제거. */
  shelters: readonly CoolingShelter[]
  /** 마커 색 — 백엔드 레이어 SHELTER 색. */
  color?: string
  /** 이름 라벨 표시 (라벨보기 토글). */
  showLabels?: boolean
  /** 라벨 디자인 — 레이어 메뉴는 'boxed'. */
  labelStyle?: MarkerLabelStyle
}

export function ShelterMarkers({
  map,
  shelters,
  color = '#06B6D4',
  showLabels = false,
  labelStyle = 'boxed',
}: Props) {
  useEffect(() => {
    const markers: maplibregl.Marker[] = []
    shelters.forEach((s) => {
      if (typeof s.lat !== 'number' || typeof s.lng !== 'number') return
      const { element, anchor, offset } = createLabeledCircleEl(
        color,
        showLabels ? s.name : undefined,
        labelStyle,
      )
      const marker = new maplibregl.Marker({ element, anchor, offset })
        .setLngLat([s.lng, s.lat])
        .addTo(map)
      markers.push(marker)
    })
    return () => {
      markers.forEach((m) => m.remove())
    }
  }, [map, shelters, color, showLabels, labelStyle])

  return null
}
