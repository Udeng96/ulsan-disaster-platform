// 급경사지 조기경보·통계 — 오른쪽 통계 패널 (500×672).
//   위: 기간(오늘·7일·30일·기간설정) + 기간 내 발령/해제 + 단계별 발령 건수 막대
//   아래: 월별 추이 (12개월, 넘치면 가로로 넘김)
//   /slope/api/alarms/stats?from=&to= — 기간이 바뀔 때만. 고른 기간은 지도 발령 버블·왼쪽 이력과 같이 쓴다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchAlarmStats, type AlarmStats } from './api'
import type { SlopeRiskLevel } from '@/features/menus/steep-slope/data'
import { RISK_TEXT, RISK_TO_VARIANT } from '@/features/menus/steep-slope/variants'
import { cn, ScrollBar } from '@/shared/ui'
import { RISK_BG } from './colors'
import { DateRangePicker } from './DateRangePicker'
import { RANGES, statsPeriod, ymd, type StatsRange } from './dates'
import { slope } from './state'

const LEVELS: { key: SlopeRiskLevel; label: string }[] = [
  { key: 'NORMAL', label: '정상(해제)' },
  { key: 'INTEREST', label: '관심' },
  { key: 'CAUTION', label: '주의' },
  { key: 'ALERT', label: '경계' },
  { key: 'SEVERE', label: '심각' },
]

const box = 'flex w-[500px] flex-[1_0_0] flex-col items-start gap-5 rounded-2xl bg-neutral-600 p-5'
const font = 'font-sans text-[16px] leading-5 font-medium'
const text = `${font} text-white`

export function SlopeStats() {
  const [range, setRange] = useState<StatsRange>('오늘')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [custom, setCustom] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const { from, to } = statsPeriod(range, custom)

  // 고른 기간을 지도 버블·이력과 나눈다
  useEffect(() => {
    slope.set({ alarmRange: from ? { from, to } : null })
  }, [from, to])

  const [stats, setStats] = useState<AlarmStats | null>(null)
  useEffect(() => {
    if (!from) return
    let cancelled = false
    fetchAlarmStats({ from, to })
      .then((s) => !cancelled && setStats(s))
      .catch((err) => console.warn('[slope-stats] 조회 실패', err))
    return () => {
      cancelled = true
    }
  }, [from, to])

  // 단계 이름은 서버가 한글로 준다
  const counts = LEVELS.map((l) => stats?.byLevel[RISK_TEXT[l.key]] ?? 0)
  const total = counts.reduce((a, b) => a + b, 0)
  const max = Math.max(...counts)
  const thisMonth = ymd(new Date()).slice(0, 7)
  // 월별 — 'YYYY-MM' → 'M월'. 없으면 12달 0건. 아직 안 온 달은 글씨를 흐리게 ('0건'과 구분)
  const months = useMemo(
    () =>
      (stats?.monthly ?? Array.from({ length: 12 }, (_, i) => ({ month: `${i + 1}`, count: 0 }))).map((m) => ({
        key: m.month,
        label: `${Number(m.month.slice(-2))}월`,
        count: m.count,
        future: m.month > thisMonth,
      })),
    [stats, thisMonth],
  )
  const monthMax = Math.max(...months.map((m) => m.count), 1)
  const monthsRef = useRef<HTMLDivElement>(null)
  const period = range === '기간설정' ? (custom.start ? `${ymd(custom.start)} ~ ${custom.end ? ymd(custom.end) : '-'}` : '기간을 선택하세요') : `${from} ~ ${to}`
  const closePicker = useCallback(() => setPickerOpen(false), [])

  return (
    <div className="flex h-[672px] flex-col items-start gap-3">
      <section aria-label="기간 내 발령" className={box}>
        {/* 달력(442)은 버튼이 아니라 이 줄 기준 — 버튼 기준이면 패널 왼쪽 밖으로 잘린다 */}
        <div role="tablist" className="relative flex items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={r === range}
              onClick={() => {
                setRange(r)
                setPickerOpen(r === '기간설정' ? !pickerOpen : false)
              }}
              className={cn(
                'flex w-[84px] items-center justify-center rounded-[100px] border px-3.5 py-2 font-sans text-[15px] leading-4 font-medium text-white',
                r === range ? 'border-white bg-[linear-gradient(180deg,var(--color-primary-light)_10%,var(--color-primary-dark)_90%)]' : 'border-transparent bg-neutral-450',
              )}
            >
              <span className="relative top-0.5">{r}</span>
            </button>
          ))}
          {pickerOpen && <DateRangePicker start={custom.start} end={custom.end} onChange={(start, end) => setCustom({ start, end })} onClose={closePicker} />}
        </div>

        <div className="flex items-center gap-3 self-stretch rounded-[9px] bg-neutral-450 px-4 py-3">
          <div className="flex flex-[1_0_0] flex-col items-start gap-1">
            <span className={cn(font, 'text-neutral-200')}>기간 내 발령</span>
            <span className={text}>{period}</span>
          </div>
          <span className={cn('flex items-center gap-1 text-right whitespace-nowrap', text)}>
            <span className="text-[18px]">발령 {stats?.issued ?? 0}건</span>
            <span>/</span>
            <span>해제 {stats?.released ?? 0}건</span>
          </span>
        </div>

        <div className="flex items-center justify-between self-stretch">
          <span className="font-sans text-[18px] leading-5 font-medium text-white">단계별 발령 건수</span>
          <span className={cn('text-right', text)}>총 {total}건</span>
        </div>
        <div className="flex flex-col items-start gap-[22px] self-stretch">
          {LEVELS.map((l, i) => (
            <div key={l.key} className="flex items-start gap-[57px] self-stretch">
              {/* 가장 긴 '정상(해제)' 기준 폭 — 막대 시작을 맞춘다 */}
              <span className={cn('w-[88px] shrink-0', text)}>{l.label}</span>
              <span className="flex flex-[1_0_0] items-center gap-2">
                {/* 가장 많은 단계 기준 비율 (0건도 4px), 건수가 바뀌면 0.8초 동안 늘고 준다 */}
                <span className={cn('transition-fill h-4 min-w-1 rounded', RISK_BG[RISK_TO_VARIANT[l.key]])} style={{ width: max > 0 ? `${(counts[i] / max) * 100}%` : '0%' }} />
                <span className={text}>{counts[i]}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="월별 추이" className={box}>
        <div className="font-sans text-[22px] leading-[26px] font-semibold text-white">월별 추이</div>
        <div ref={monthsRef} className="flex min-h-0 flex-[1_0_0] items-end gap-2 self-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {months.map((m) => (
            // 6개월일 때 열 폭(70) 유지 — 12개월은 가로로 넘긴다
            <div key={m.key} className="flex flex-[0_0_70px] flex-col items-center gap-1.5 self-stretch">
              {/* 위 28 은 건수 말풍선 자리 (가로 스크롤 상자가 세로로도 잘라서) */}
              <div className="group relative flex min-h-0 flex-[1_0_0] items-end justify-center self-stretch pt-7">
                <div className="relative min-h-0.5 w-9 rounded bg-primary-light" style={{ height: `${(m.count / monthMax) * 100}%` }}>
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-1.5 rounded-md bg-tooltip px-2 py-1 font-sans text-[12px] leading-[14px] font-medium whitespace-nowrap text-white opacity-0 transition-ui group-hover:opacity-100">
                    {m.count}건
                  </span>
                </div>
              </div>
              <span className={cn('text-center font-sans text-[12px] leading-[14px] font-medium text-white', m.future && 'opacity-40')}>{m.label}</span>
            </div>
          ))}
        </div>
        <ScrollBar target={monthsRef} axis="x" />
      </section>
    </div>
  )
}
