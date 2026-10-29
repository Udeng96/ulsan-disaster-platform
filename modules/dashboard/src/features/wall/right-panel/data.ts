// 우측 패널 하단 3 column 정적 데이터 — 모두 평상시 (값 없음) 기준.
// 백엔드 연동 전엔 모두 '0' / kind 'normal' 로 표출.

import { AREAS } from '@/features/menus/steep-slope/data'
import type { MiniColumnInstrument, MiniColumnRow } from './types'

// 육갑문 column — 수문 3개 (가상시설0286 / 가상시설0733 / 가상시설0738).
export const PUMP_STATUS_ROWS: MiniColumnRow[] = [
  { label: '가상시설0286', status: '0', kind: 'normal' },
  { label: '가상시설0733', status: '0', kind: 'normal' },
  { label: '가상시설0738', status: '0', kind: 'normal' },
]

// 급경사지 column — 3 area (가상시설0680 / 가상시설0432 / 가상시설0553).
// 가상시설0432만 2 줄 표출 (좁은 cell 폭 맞춤).
export const SLOPE_STATUS_ROWS: MiniColumnRow[] = AREAS.map((area) => ({
  label: area === '가상시설0432' ? '가상시설0429' : area,
  status: '0',
  kind: 'normal',
}))

// 지진가속도 계측기 4 종 — 실제 센서 코드 + 설명 + 진도 level.
//   가상시설0206 / 가상시설0683(3축)   — 지표면 가상시설0683 3 축 가속도계
//   가상시설0204 / 가상시설0714(Y,X)   — 건물 가상시설0714 Y, X 축
//   가상시설0205 / 가상시설0714(Y)     — 건물 가상시설0714 Y 축
//   가상시설0203 / 가상시설0715(3축)   — 건물 가상시설0715 3 축
export const SEISMIC_INSTRUMENTS: MiniColumnInstrument[] = [
  { code: '가상시설0206', description: '가상시설0683(3축)', level: '0' },
  { code: '가상시설0204', description: '가상시설0714(Y,X)', level: '0' },
  { code: '가상시설0205', description: '가상시설0714(Y)', level: '0' },
  { code: '가상시설0203', description: '가상시설0715(3축)', level: '0' },
]
