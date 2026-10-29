// 급경사지 표 cell 색 variant + 매핑.

import { COLORS } from '@/styles/designTokens'
import type { SlopeStatus, SlopeRiskLevel } from './data'

// cell 색 variant — undefined 면 Neutral-700 (기본), 외 색 box.
// 5 상태: 정상(green) / 관심(blue) / 주의(yellow) / 경계(orange) / 심각(red)
export type CellVariant = 'green' | 'blue' | 'yellow' | 'orange' | 'red'

export const VARIANT_BG: Record<CellVariant, string> = {
  green: COLORS.accentGreen,
  blue: COLORS.accentBlue,
  yellow: COLORS.accentYellow,
  orange: COLORS.accentOrange,
  red: COLORS.accentRed,
}

// data.ts 의 SlopeStatus (4 단계) → 패널 CellVariant 매핑.
// data.ts 엔 '관심(blue)' 없음 — 4 단계만 매핑.
export const SLOPE_STATUS_TO_VARIANT: Record<SlopeStatus, CellVariant> = {
  normal: 'green',
  warning: 'yellow',
  caution: 'orange',
  critical: 'red',
}

// 백엔드 riskLevel (5 단계) → CellVariant / 텍스트 / 색.
//   NORMAL 정상(green) · INTEREST 관심(blue) · CAUTION 주의(yellow)
//   · ALERT 경계(orange) · SEVERE 심각(red)
export const RISK_TO_VARIANT: Record<SlopeRiskLevel, CellVariant> = {
  NORMAL: 'green',
  INTEREST: 'blue',
  CAUTION: 'yellow',
  ALERT: 'orange',
  SEVERE: 'red',
}

export const RISK_TEXT: Record<SlopeRiskLevel, string> = {
  NORMAL: '정상',
  INTEREST: '관심',
  CAUTION: '주의',
  ALERT: '경계',
  SEVERE: '심각',
}

// ⚠️ CSS 변수 문자열이라 CSS 에서만 쓸 수 있다 (canvas 차트는 RISK_BADGE_COLOR 사용).
export const RISK_COLOR: Record<SlopeRiskLevel, string> = {
  NORMAL: COLORS.accentGreen,
  INTEREST: COLORS.accentBlue,
  CAUTION: COLORS.accentYellow,
  ALERT: COLORS.accentOrange,
  SEVERE: COLORS.accentRed,
}

// 요약 바 상태 배지 색 — 급경사지 전용 팔레트.
export const RISK_BADGE_COLOR: Record<SlopeRiskLevel, string> = {
  NORMAL: '#45E36C',
  INTEREST: '#00D2E0',
  CAUTION: '#FFD600',
  ALERT: '#FF9230',
  SEVERE: '#FF4245',
}

// 급경사지 등급(A~E) 색 — 위험도 5단계 팔레트를 순서대로 매핑.
//   A 정상 / B 관심 / C 주의 / D 경계 / E 심각
export const GRADE_COLOR: Record<string, string> = {
  A: RISK_BADGE_COLOR.NORMAL,
  B: RISK_BADGE_COLOR.INTEREST,
  C: RISK_BADGE_COLOR.CAUTION,
  D: RISK_BADGE_COLOR.ALERT,
  E: RISK_BADGE_COLOR.SEVERE,
}

/** 서버 표기 단계(한글) → enum. 서버는 level 을 '관심' 처럼 한글로 준다. */
export function riskOf(level: string | null | undefined): SlopeRiskLevel {
  if (!level) return 'NORMAL'
  const hit = (Object.keys(RISK_TEXT) as SlopeRiskLevel[]).find(
    (k) => RISK_TEXT[k] === level,
  )
  return hit ?? 'NORMAL'
}
