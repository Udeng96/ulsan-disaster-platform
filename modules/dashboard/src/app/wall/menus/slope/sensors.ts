// 계측 상세 센서 순서 — 수정사항 13번 (10-16)
import type { SlopeRiskLevel } from '@/features/menus/steep-slope/data'
import { riskOf } from '@/features/menus/steep-slope/variants'

export const RISK_RANK: Record<SlopeRiskLevel, number> = { SEVERE: 4, ALERT: 3, CAUTION: 2, INTEREST: 1, NORMAL: 0 }

/** 센서 번호(0부터)를 위험한 순으로, 같은 단계는 번호 순 — 첫 번호가 대표 센서 */
export function byRisk(insts: ReadonlyArray<{ level: string | null }>): number[] {
  return insts.map((_, n) => n).sort((a, b) => RISK_RANK[riskOf(insts[b].level)] - RISK_RANK[riskOf(insts[a].level)] || a - b)
}
