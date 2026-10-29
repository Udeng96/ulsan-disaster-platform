import { describe, expect, it } from 'vitest'
import type { ObservationChart } from './api'
import { chartOption, customBucket, fitSlots, periodStarts, slotStarts, stamp, tickLabel } from './chart'
import { byRisk } from './sensors'
import { monthGrid, pickRange, statsPeriod, ymd } from './dates'

const NOW = new Date(2026, 9, 16, 15, 3, 20) // 2026-10-16 15:03:20 (현지)

describe('계측 차트 칸', () => {
  it('실시간은 5분 칸 9개, 마지막이 지금 칸', () => {
    const s = slotStarts('realtime', NOW)
    expect(s).toHaveLength(9)
    expect(s.at(-1)).toBe('2026-10-16T15:00:00')
    expect(s[0]).toBe('2026-10-16T14:20:00')
  })
  it('시간·일·월은 7칸', () => {
    expect(slotStarts('hour', NOW).at(-1)).toBe('2026-10-16T15:00:00')
    expect(slotStarts('day', NOW)[0]).toBe('2026-10-10T00:00:00')
    expect(slotStarts('month', NOW)[0]).toBe('2026-04-01T00:00:00')
  })
  it('빠진 칸은 값 없음, 범위 밖 옛 점은 버림', () => {
    const chart: ObservationChart = {
      observationItemId: 1,
      category: 'RAIN_GAUGE' as ObservationChart['category'],
      unit: 'mm',
      range: 'realtime',
      thresholds: [],
      series: [{ unitType: 'U010', label: '5분', bar: true, points: [{ at: '2026-10-16T14:55:00', value: 1.5, complete: true }, { at: '2026-10-16T13:00:00', value: 9, complete: true }] }],
    }
    const [s] = fitSlots(chart, 'realtime', NOW)
    expect(s.points).toHaveLength(9)
    expect(s.points.filter((p) => p.value !== null).map((p) => p.value)).toEqual([1.5])
  })
  it('축 글씨·시각 글씨', () => {
    expect(tickLabel('2026-10-16T14:55:00', 'realtime')).toBe('14:55')
    expect(tickLabel('2026-10-16T00:00:00', 'day')).toBe('10-16')
    expect(tickLabel('2026-10-01T00:00:00', 'month')).toBe('2026-10')
    expect(stamp('2026-10-16T11:23:45')).toBe('2026-10-16 11:23')
    expect(stamp(null)).toBe('-')
  })
  it('y축 꼭대기는 임계값·값 중 큰 쪽 + 10%', () => {
    const chart = { thresholds: [{ level: '심각', value: 14 }], series: [] } as unknown as ObservationChart
    const opt = chartOption(chart, [{ unitType: 'U010', label: 'a', bar: false, points: [{ at: 'x', value: 20, complete: true }] }], 'realtime', 'mm')
    expect(opt.yAxis[0].max).toBeCloseTo(22)
    expect(chartOption(chart, [], 'realtime', 'mm').yAxis[0].max).toBeCloseTo(15.4)
  })
})

describe('조기경보 기간', () => {
  it('오늘·7일·30일은 끝이 오늘', () => {
    expect(statsPeriod('오늘', { start: null, end: null }, NOW)).toEqual({ from: '2026-10-16', to: '2026-10-16' })
    expect(statsPeriod('7일', { start: null, end: null }, NOW)).toEqual({ from: '2026-10-09', to: '2026-10-16' })
  })
  it('기간설정은 고른 날, 시작을 안 골랐으면 조회 안 함', () => {
    expect(statsPeriod('기간설정', { start: null, end: null }, NOW).from).toBeNull()
    expect(statsPeriod('기간설정', { start: new Date(2026, 8, 1), end: null }, NOW)).toEqual({ from: '2026-09-01', to: '2026-10-16' })
  })
  it('날짜 두 번 누르기 — 앞 날짜를 나중에 누르면 서로 바뀌고, 세 번째는 새 시작', () => {
    const a = new Date(2026, 9, 10)
    const b = new Date(2026, 9, 3)
    const [s1, e1] = pickRange(null, null, a)
    expect([ymd(s1), e1]).toEqual(['2026-10-10', null])
    const [s2, e2] = pickRange(s1, e1, b)
    expect([ymd(s2), ymd(e2!)]).toEqual(['2026-10-03', '2026-10-10'])
    const [s3, e3] = pickRange(s2, e2, a)
    expect([ymd(s3), e3]).toEqual(['2026-10-10', null])
  })
  it('달력은 6주, 일요일 시작', () => {
    const g = monthGrid(new Date(2026, 9, 1))
    expect(g).toHaveLength(6)
    expect(g[0][0].getDay()).toBe(0)
    expect(ymd(g[0][4])).toBe('2026-10-01') // 2026-10-01 은 목요일
  })
})

describe('수정사항 (10-16)', () => {
  it('13번 센서 순서 — 위험한 순, 같은 단계는 번호 순', () => {
    const insts = [{ level: '정상' }, { level: '경계' }, { level: null }, { level: '관심' }, { level: '경계' }]
    expect(byRisk(insts)).toEqual([1, 4, 3, 0, 2])
  })
  it('15번 기간설정 칸 단위 — 3일 이하 시간, 93일 이하 일, 넘으면 월', () => {
    expect(customBucket({ from: '2026-10-14', to: '2026-10-16' })).toBe('hour')
    expect(customBucket({ from: '2026-10-01', to: '2026-10-16' })).toBe('day')
    expect(customBucket({ from: '2026-01-01', to: '2026-10-16' })).toBe('month')
  })
  it('15번 기간설정 칸 — 시작 날 0시부터 끝 날 끝까지', () => {
    const h = periodStarts('hour', { from: '2026-10-15', to: '2026-10-16' })
    expect(h).toHaveLength(48)
    expect([h[0], h.at(-1)]).toEqual(['2026-10-15T00:00:00', '2026-10-16T23:00:00'])
    expect(periodStarts('day', { from: '2026-09-30', to: '2026-10-02' })).toEqual(['2026-09-30T00:00:00', '2026-10-01T00:00:00', '2026-10-02T00:00:00'])
    expect(periodStarts('month', { from: '2026-08-15', to: '2026-10-16' }).map((s) => s.slice(0, 7))).toEqual(['2026-08', '2026-09', '2026-10'])
  })
})
