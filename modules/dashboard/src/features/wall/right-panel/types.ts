// 우측 패널 하단 3 column 공유 타입.
// Status (4 단계) 중 mini column 은 yellow(warning) 단계 안 써서 3 단계 부분집합 사용.

import type { Status } from '@/types/status'

export type StatusKind = Extract<Status, 'normal' | 'caution' | 'critical'>

export interface MiniColumnRow {
  label: string
  status: string
  kind: StatusKind
}

export interface MiniColumnSolo {
  label: string
  status: string
  kind: StatusKind
}

// 지진가속도용 계측기 cell — 코드 + 설명 + 진도 level (I~IX).
export interface MiniColumnInstrument {
  code: string
  description: string
  /** INTENSITY_LEVELS 의 label ('I' 부터 'IX' 까지). 평상시 = '0' (값 없음). */
  level: string
}
