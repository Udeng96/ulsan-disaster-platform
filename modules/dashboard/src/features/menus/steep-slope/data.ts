// 급경사지 area 상수 + 표출용 타입.
//   ⚠️ 계측 데이터(계측기 실시간값·차트) 연동은 재구성 중이라 아직 빈 값이다.
//      관리지역(총괄·관제)은 /slope/api/managed-areas 로 연동됨 — useManagedAreas 참고.

// 급경사지 상태 — 공통 Status (정상 / 주의 / 경계 / 심각) alias.
import type { Status } from '@/types/status'
export type SlopeStatus = Status

/** 위험도 5단계 — 지역·계측기 상태 표기. */
export type SlopeRiskLevel =
  | 'NORMAL' // 정상
  | 'INTEREST' // 관심
  | 'CAUTION' // 주의
  | 'ALERT' // 경계
  | 'SEVERE' // 심각

/** 계측기 종류. */
export type SlopeInstrumentCategory =
  | 'INCLINOMETER' // 경사계
  | 'SOIL_MOISTURE' // 토양함수계
  | 'ROCKFALL_DETECTOR' // 낙석감지기
  | 'RAIN_GAUGE' // 강우량계

export const AREAS = ['가상시설0680', '가상시설0432', '가상시설0553'] as const
export type Area = (typeof AREAS)[number]

/** facility name prefix → area 매핑 (이름 첫 단어로 추론). */
export function nameToArea(name: string): Area | null {
  if (name.startsWith('삼익')) return '가상시설0432'
  if (name.startsWith('우주')) return '가상시설0553'
  if (name.startsWith('가상시설0680')) return '가상시설0680'
  return null
}

