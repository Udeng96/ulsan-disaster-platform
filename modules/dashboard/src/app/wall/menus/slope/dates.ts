// 조기경보 통계 날짜 계산 (화면 없이).

/** 'YYYY-MM-DD' (현지) */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime()
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)

/** 달력 6주 × 7일 (앞뒤 달 날짜 포함, 일요일 시작) */
export function monthGrid(base: Date): Date[][] {
  const first = new Date(base.getFullYear(), base.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = new Date(start)
      day.setDate(start.getDate() + w * 7 + d)
      return day
    }),
  )
}

/** 날짜 두 번 눌러 기간 정하기 — 시작 → 끝 순. 둘 다 있으면 새로 누른 날이 시작. 끝이 시작보다 앞이면 서로 바꿈 */
export function pickRange(start: Date | null, end: Date | null, d: Date): [Date, Date | null] {
  const next = startOfDay(d)
  if (!start || end) return [next, null]
  return next < start ? [next, start] : [start, next]
}

export const RANGES = ['오늘', '7일', '30일', '기간설정'] as const
export type StatsRange = (typeof RANGES)[number]
const RANGE_DAYS: Record<StatsRange, number> = { 오늘: 0, '7일': 7, '30일': 30, 기간설정: 0 }

/** 조회 기간 — 끝은 오늘, 시작은 고른 만큼 앞. 기간설정은 고른 날 (시작을 아직 안 골랐으면 from null) */
export function statsPeriod(range: StatsRange, custom: { start: Date | null; end: Date | null }, now = new Date()): { from: string | null; to: string } {
  const today = ymd(now)
  if (range === '기간설정') return { from: custom.start ? ymd(custom.start) : null, to: custom.end ? ymd(custom.end) : today }
  const d = new Date(now)
  d.setDate(d.getDate() - RANGE_DAYS[range])
  return { from: ymd(d), to: today }
}
