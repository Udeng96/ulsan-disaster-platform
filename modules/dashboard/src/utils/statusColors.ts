// 상태 (Status) 별 색상 매핑 — 솔리드 / 반투명 라벨 배경 두 변종.
//
// 솔리드 (STATUS_COLOR) — 패널 cell 배경, 헤더 텍스트 색 등
//   normal #45E36C  warning #FFD600  caution #FF9230  critical #FF4245
//   → designTokens.COLORS.accent* (CSS 변수) 와 동일 값.
//
// 반투명 라벨 (STATUS_LABEL_BG, alpha 0.75) — 지도 마커 라벨 배경
//   normal 흰색 (다른 상태와 구분 위해 색상 X)
//   → rgba 형태라 alpha 분리 — 향후 alpha 토큰화 시 분리 가능.

import type { Status } from '@/types/status'
import { COLORS } from '@/styles/designTokens'

export const STATUS_COLOR: Record<Status, string> = {
  normal: COLORS.accentGreen,
  warning: COLORS.accentYellow,
  caution: COLORS.accentOrange,
  critical: COLORS.accentRed,
}

export const STATUS_LABEL_BG: Record<Status, string> = {
  normal: 'rgba(255, 255, 255, 0.75)',
  warning: 'rgba(255, 214, 0, 0.75)',
  caution: 'rgba(255, 146, 48, 0.75)',
  critical: 'rgba(255, 66, 69, 0.75)',
}
