// 급경사지 계측기 마커 (MapLibre) — 종류별 (낙석감지기 / 계측기 / 강우량계).
//   category 로 필터 → 한 컴포넌트로 종류별 공용 (경사계 / 낙석감지기 / 강우량계).
//   18×18 원 (백엔드 레이어 색) + 옵션 이름 라벨 (공통 빌더).
//
// 사용처: 메인 지도 (MapSection) — 급경사지 계측 상세, 레이어 메뉴의 종류별 체크.

import { useEffect } from 'react'
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import type { SlopeCategory, SlopeInstrument } from '@/api/slope'
import {
  createLabeledCircleEl,
  type MarkerLabelStyle,
} from './markerElement'

/** 지역에 속한 계측기 + 표기용 지역명. */
export type InstrumentPoint = SlopeInstrument & { area: string }

interface Props {
  /** 지도 instance (MapBaseML onReady 콜백에서 받음). */
  map: MlMap
  /** 계측기 전체 — category 로 내부 필터. */
  instruments: readonly InstrumentPoint[]
  /** 표출할 종류. */
  category: SlopeCategory
  /** 마커 색 — 해당 레이어 색. */
  color: string
  /** 이름 라벨 표시 (라벨보기 토글). */
  showLabels?: boolean
  /** 라벨 디자인 — 레이어 메뉴는 'boxed'. */
  labelStyle?: MarkerLabelStyle
}

export function SlopeInstrumentMarkers({
  map,
  instruments,
  category,
  color,
  showLabels = false,
  labelStyle = 'boxed',
}: Props) {
  useEffect(() => {
    const markers: maplibregl.Marker[] = []
    instruments
      .filter((i) => i.category === category)
      .forEach((i) => {
        if (typeof i.lat !== 'number' || typeof i.lng !== 'number') return
        const { element, anchor, offset } = createLabeledCircleEl(
          color,
          showLabels ? i.displayName : undefined,
          labelStyle,
        )
        // 급경사지 지역 원(5) 아래, 선택 센서 핀(10) 아래.
        element.style.zIndex = '1'
        const marker = new maplibregl.Marker({ element, anchor, offset })
          .setLngLat([i.lng, i.lat])
          .addTo(map)
        markers.push(marker)
      })
    return () => {
      markers.forEach((m) => m.remove())
    }
  }, [map, instruments, category, color, showLabels, labelStyle])

  return null
}
