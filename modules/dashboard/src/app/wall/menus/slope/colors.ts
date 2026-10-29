// 급경사지 위험도 색 (Tailwind 클래스)
import { RISK_BADGE_COLOR, RISK_TEXT, RISK_TO_VARIANT, riskOf, type CellVariant } from '@/features/menus/steep-slope/variants'
import { SLOPE_OTHER_LEVEL } from '@/shared/styles/palette'

/** 위험도 배지 바탕 */
export const RISK_BG: Record<CellVariant, string> = {
  green: 'bg-accent-green',
  blue: 'bg-accent-teal',
  yellow: 'bg-accent-yellow',
  orange: 'bg-accent-orange',
  red: 'bg-accent-red',
}

/** 위험도 점 (svg) */
export const RISK_FILL: Record<CellVariant, string> = {
  green: 'fill-accent-green',
  blue: 'fill-accent-teal',
  yellow: 'fill-accent-yellow',
  orange: 'fill-accent-orange',
  red: 'fill-accent-red',
}

/** 정상~심각이 아닌 지구 단계('장애'·모르는 코드)의 기본 색 — 회색 (neutral-300) */
const OTHER_LEVEL_BG = 'bg-neutral-300'

/** 지구 단계 배지 글자·바탕. 비어 있으면 정상, '장애' 는 그대로, 모르는 코드는 '-' (배지 폭이 좁다) */
export function areaLevel(level: string | null | undefined): { text: string; bg: string; hex: string } {
  const risk = riskOf(level)
  if (!level || RISK_TEXT[risk] === level) return { text: RISK_TEXT[risk], bg: RISK_BG[RISK_TO_VARIANT[risk]], hex: RISK_BADGE_COLOR[risk] }
  return { text: level === '장애' ? '장애' : '-', bg: OTHER_LEVEL_BG, hex: SLOPE_OTHER_LEVEL }
}
