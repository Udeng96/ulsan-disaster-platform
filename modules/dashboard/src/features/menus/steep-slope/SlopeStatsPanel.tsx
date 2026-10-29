// 급경사지 조기경보·통계 — 우측 통계 패널 (500×672).
//   상단: 기간 선택 + 기간 내 발령 요약 + 단계별 발령 건수
//   하단: 월별 추이
//   데이터: /slope/api/alarms/stats?from=&to= (기간 변경 시 조회).

import { useEffect, useRef, useState } from 'react'
import { fetchAlarmStats, type AlarmStats } from '@/api/slope'
import type { SlopeRiskLevel } from './data'
import { RISK_BADGE_COLOR, RISK_TEXT } from './variants'
import { ScrollBar } from './SlopeAlertPanel'
import { SlopeDatePicker } from './SlopeDatePicker'

const RANGES = ['오늘', '7일', '30일', '기간설정'] as const

// 범위별 시작일 offset (일).
const RANGE_DAYS: Record<string, number> = {
  오늘: 0,
  '7일': 7,
  '30일': 30,
  기간설정: 0,
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 'YYYY-MM-DD ~ YYYY-MM-DD' — 끝은 오늘, 시작은 range 만큼 이전. */
function formatPeriod(range: StatsRange): string {
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - (RANGE_DAYS[range] ?? 0))
  return `${ymd(start)} ~ ${ymd(end)}`
}

// 단계별 발령 건수 — 정상(해제) ~ 심각.
const LEVELS: { key: SlopeRiskLevel; label: string }[] = [
  { key: 'NORMAL', label: '정상(해제)' },
  { key: 'INTEREST', label: '관심' },
  { key: 'CAUTION', label: '주의' },
  { key: 'ALERT', label: '경계' },
  { key: 'SEVERE', label: '심각' },
]
export type StatsRange = (typeof RANGES)[number]

interface Props {
  /** 선택 기간 알림 — 지도 발령 버블이 같은 기간을 본다. */
  onRangeChange?: (range: { from: string; to: string } | null) => void
}

export function SlopeStatsPanel({ onRangeChange }: Props) {
  const [range, setRange] = useState<StatsRange>('오늘')
  // 기간설정 — 버튼 아래 datepicker + 직접 고른 시작/끝.
  const [pickerOpen, setPickerOpen] = useState(false)
  const [customStart, setCustomStart] = useState<Date | null>(null)
  const [customEnd, setCustomEnd] = useState<Date | null>(null)
  const [stats, setStats] = useState<AlarmStats | null>(null)

  // 조회 구간 — 끝은 오늘, 시작은 범위만큼 이전. 기간설정은 직접 고른 날짜.
  const today = ymd(new Date())
  const from =
    range === '기간설정'
      ? customStart
        ? ymd(customStart)
        : null
      : (() => {
          const d = new Date()
          d.setDate(d.getDate() - (RANGE_DAYS[range] ?? 0))
          return ymd(d)
        })()
  const to =
    range === '기간설정' ? (customEnd ? ymd(customEnd) : today) : today

  // 선택 기간을 부모에 알린다 (지도 버블과 공유).
  const notifyRange = useRef(onRangeChange)
  notifyRange.current = onRangeChange
  useEffect(() => {
    notifyRange.current?.(from ? { from, to } : null)
  }, [from, to])

  // 기간이 바뀔 때만 조회 (폴링 아님).
  useEffect(() => {
    if (!from) return
    let cancelled = false
    fetchAlarmStats(from, to)
      .then((s) => {
        if (!cancelled) setStats(s)
      })
      .catch((err) => console.warn('[slope-stats] 조회 실패', err))
    return () => {
      cancelled = true
    }
  }, [from, to])

  // byLevel 키는 표기 단계(한글) 라 enum 라벨로 바꿔 읽는다.
  const counts = LEVELS.map((l) => stats?.byLevel[RISK_TEXT[l.key]] ?? 0)
  const total = counts.reduce((a, b) => a + b, 0)
  const max = Math.max(...counts)
  const issued = stats?.issued ?? 0
  const released = stats?.released ?? 0
  // 월별 추이 — 응답의 'YYYY-MM' 을 'M월' 라벨로. 없으면 최근 12개월 0건.
  const months = (
    stats?.monthly ?? Array.from({ length: 12 }, (_, i) => ({ month: `${i + 1}`, count: 0 }))
  ).map((m) => ({
    key: m.month,
    label: `${Number(m.month.slice(-2))}월`,
    count: m.count,
    // 아직 오지 않은 달 — '발령 0건' 과 구분되게 라벨을 흐리게.
    future: m.month > ymd(new Date()).slice(0, 7),
  }))
  const monthMax = Math.max(...months.map((m) => m.count), 1)
  const monthsRef = useRef<HTMLDivElement>(null)
  // 기간 — 끝은 항상 오늘, 시작은 선택한 범위만큼 이전.
  const period =
    range === '기간설정'
      ? customStart
        ? `${ymd(customStart)} ~ ${customEnd ? ymd(customEnd) : '-'}`
        : '기간을 선택하세요'
      : formatPeriod(range)

  return (
    <div className="slope-stats-panel">
      {/* 기간 선택 + 단계별 발령 건수 */}
      <div className="slope-stats-box">
        {/* 기간 버튼 줄 — datepicker(442) 는 버튼이 아니라 이 줄 기준으로 붙인다.
            버튼 기준이면 패널(500) 왼쪽으로 삐져나가 잘린다. */}
        <div className="slope-stats-ranges">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={`slope-stats-range ${r === range ? 'is-active' : ''}`}
              onClick={() => {
                setRange(r)
                setPickerOpen(r === '기간설정' ? !pickerOpen : false)
              }}
            >
              <span style={{ position: 'relative', top: '2px' }}>{r}</span>
            </button>
          ))}
          {pickerOpen && (
            <SlopeDatePicker
              start={customStart}
              end={customEnd}
              onChange={(s2, e2) => {
                setCustomStart(s2)
                setCustomEnd(e2)
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>

        <div className="slope-stats-summary">
          <div className="slope-stats-summary-left">
            <span className="slope-stats-summary-title">기간 내 발령</span>
            <span className="slope-stats-summary-period">{period}</span>
          </div>
          <span className="slope-stats-summary-count">
            <span className="slope-stats-issued">발령 {issued}건</span>
            <span className="slope-stats-slash">/</span>
            <span className="slope-stats-released">해제 {released}건</span>
          </span>
        </div>

        {/* 단계별 발령 건수 */}
        <div className="slope-stats-chart-head">
          <span className="slope-stats-chart-title">단계별 발령 건수</span>
          <span className="slope-stats-chart-total">총 {total}건</span>
        </div>
        <div className="slope-stats-bars">
          {LEVELS.map((l) => {
            const count = stats?.byLevel[RISK_TEXT[l.key]] ?? 0
            return (
              <div key={l.key} className="slope-stats-bar-row">
                <span className="slope-stats-bar-label">{l.label}</span>
                <span className="slope-stats-bar-track">
                  <span
                    className="slope-stats-bar-fill"
                    style={{
                      // 최대 건수 기준 비율 (0건도 최소 폭으로 보이게).
                      width: max > 0 ? `${(count / max) * 100}%` : '0%',
                      background: RISK_BADGE_COLOR[l.key],
                    }}
                  />
                  <span className="slope-stats-bar-count">{count}</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 월별 추이 */}
      <div className="slope-stats-box">
        <div className="slope-stats-title">월별 추이</div>
        <div className="slope-stats-months" ref={monthsRef}>
          {months.map((m) => (
            <div key={m.key} className="slope-stats-month">
              {/* hover 시 건수 tooltip (data-count → CSS ::after). */}
              <div className="slope-stats-month-bar-area">
                <div
                  className="slope-stats-month-bar"
                  data-count={`${m.count}건`}
                  style={{ height: `${(m.count / monthMax) * 100}%` }}
                />
              </div>
              <span
                className="slope-stats-month-label"
                style={m.future ? { opacity: 0.4 } : undefined}
              >
                {m.label}
              </span>
            </div>
          ))}
        </div>
        <ScrollBar target={monthsRef} axis="x" />
      </div>
    </div>
  )
}
