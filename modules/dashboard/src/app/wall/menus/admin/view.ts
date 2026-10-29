// 관리자 화면 표시 — 판정 색, 서울 시각, 값 없음('-', 사용자 10-23).
import type { Verdict } from './api'

/** 불빛·글씨 색 — 정상 초록 · 주의 노랑 · 장애 빨강 (사용자 10-22) · 실측 대기 회색 (server 모듈 색) */
export const LIGHT: Record<Verdict, string> = { OK: 'var(--color-accent-green)', WARN: 'var(--color-admin-f2d230)', FAIL: 'var(--color-accent-red)', UNKNOWN: 'var(--color-admin-5a708a)' }
/** 카드 테두리·글씨 — 주의는 피그마 Accents/Yellow var(--color-accent-yellow) */
export const CARD: Record<Verdict, string> = { ...LIGHT, WARN: 'var(--color-accent-yellow)' }
export const LABEL: Record<Verdict, string> = { OK: '정상', WARN: '주의', FAIL: '장애', UNKNOWN: '실측 대기' }

/** 서버가 안 주는 칸 (사용자 10-23 '-'로 비우기) */
export const NONE = '-'
export const or = (v: string | number | null | undefined) => (v == null || v === '' ? NONE : String(v))

const p2 = (n: number) => String(n).padStart(2, '0')
/** ISO → 서울 시각 Date 조각 (UTC 필드로 읽는다) */
const seoul = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600_000)
export const hms = (iso: string | null | undefined) => {
  if (!iso) return NONE
  const d = seoul(iso)
  return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`
}
export const mdhm = (iso: string | null | undefined) => {
  if (!iso) return NONE
  const d = seoul(iso)
  return `${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`
}
export const md = (iso: string | null | undefined) => {
  if (!iso) return NONE
  const d = seoul(iso)
  return `${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`
}

/** 가동 줄 — 「214일 연속 · 마지막 재시작 02-28 · 응답 정상」 (방화벽·스위치는 재시작 시각·응답이 옴, 서버는 일수만) */
export function uptimeLine(days: number | null | undefined, restartedAt?: string | null, rttMs?: number | null) {
  if (days == null) return '실측 대기'
  const parts = [`${days}일 연속`]
  if (restartedAt) parts.push(`마지막 재시작 ${md(restartedAt)}`)
  if (rttMs != null) parts.push(`응답 정상 (${rttMs}ms)`)
  return parts.join(' · ')
}

/** bps → 「3.7Mbps」 */
export function bps(v: number | null | undefined) {
  if (v == null) return NONE
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}Gbps`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}Mbps`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}kbps`
  return `${v}bps`
}
