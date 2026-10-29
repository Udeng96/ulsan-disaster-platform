// 급경사지 지역 마커 (MapLibre) — 위험지역 3곳 (가상시설0432 / 가상시설0553 / 가상시설0680).
//   18×18 원 (백엔드 레이어 SLOPE_AREA 색) + 지역명 라벨 (공통 빌더).
//   급경사지 메뉴(idx 2) → labelStyle 'plain' (라벨 항상), 레이어 메뉴(idx 5) → 'boxed' (토글).
//
// 사용처: 메인 지도 (MapSection).

import { useEffect } from 'react'
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import {
  createAreaCircleEl,
  createLabeledCircleEl,
  createPinEl,
  type MarkerLabelStyle,
} from './markerElement'

interface Props {
  /** 지도 instance (MapBaseML onReady 콜백에서 받음). */
  map: MlMap
  /** 급경사지 지역 배열 (위험지역 / 관리지역 공용). 빈 배열이면 마커 모두 제거. */
  areas: readonly { name: string; lat: number; lng: number; grade?: string }[]
  /** 마커 색 — 백엔드 레이어 SLOPE_AREA 색. */
  color?: string
  /** 지역명 라벨 표시 (기본 true — 급경사지 메뉴). 레이어 메뉴에선 라벨보기 토글 연동. */
  showLabels?: boolean
  /** 라벨 디자인 — 전용 메뉴 'plain', 레이어 메뉴 'boxed'. */
  labelStyle?: MarkerLabelStyle
  /** 선택된 지역명 — 그 마커만 물방울 + 이름 라벨로 표출. */
  selectedName?: string | null
  /** 등급별 색 — 주면 마커 색을 등급으로 칠하고 안에 등급 글자를 넣는다. */
  gradeColors?: Record<string, string>
  /** 'area' — 지역명이 들어간 큰 원 (상시계측 위험지역 3곳). 기본은 점 마커. */
  variant?: 'dot' | 'area'
  /** 'area' 마커 z-index (default 1). 계측 상세에선 계측기 위로 올린다. */
  areaZIndex?: number
}

export function SlopeAreaMarkers({
  map,
  areas,
  color = '#F59E0B',
  showLabels = true,
  labelStyle = 'plain',
  selectedName,
  gradeColors,
  variant = 'dot',
  areaZIndex = 1,
}: Props) {
  useEffect(() => {
    const markers: maplibregl.Marker[] = []
    areas.forEach((a) => {
      if (typeof a.lat !== 'number' || typeof a.lng !== 'number') return
      if (variant === 'area') {
        // 색은 지역 상태(riskLevel) 별 — grade 필드에 상태를 담아 넘긴다.
        const areaFill = (a.grade && gradeColors?.[a.grade]) || color
        const { element, anchor, offset } = createAreaCircleEl(areaFill, a.name)
        // 총괄·관제는 관리지역 점(2) 아래(1), 계측 상세는 계측기(1) 위(5).
        element.style.zIndex = String(areaZIndex)
        markers.push(
          new maplibregl.Marker({ element, anchor, offset })
            .setLngLat([a.lng, a.lat])
            .addTo(map),
        )
        return
      }
      const isSelected = !!selectedName && a.name === selectedName
      const grade = gradeColors && a.grade ? a.grade : undefined
      const fill = (grade && gradeColors?.[grade]) || color
      const { element, anchor, offset } = isSelected
        ? createPinEl(fill, a.name, grade)
        : createLabeledCircleEl(
            fill,
            showLabels ? a.name : undefined,
            labelStyle,
            grade,
          )
      // 큰 원(1) < 점(2) < 계측기(3) < 선택 핀(10) — 선택 마커가 항상 최상단.
      element.style.zIndex = isSelected ? '10' : '2'
      const marker = new maplibregl.Marker({ element, anchor, offset })
        .setLngLat([a.lng, a.lat])
        .addTo(map)
      markers.push(marker)
    })
    return () => {
      markers.forEach((m) => m.remove())
    }
  }, [map, areas, color, showLabels, labelStyle, selectedName, gradeColors, variant, areaZIndex])

  return null
}
