// 급경사지 계측 상세 — 센서 차트 패널 (580×672).
//   헤더(지역·센서 / 관측시간·상태) → 기간 버튼 → 차트 → 최근 실측값. 계측기 정보는 지도 팝업(SlopeSensorPopup).
//   차트는 지진가속도와 같은 ECharts.
//
// 데이터: GET /slope/api/observations/{observationItemId}/chart?range=
//   탭·센서 변경 시 조회. 경사계는 X축·Y축 2선, 나머지는 1선.
//   임계선·단위·막대 여부(series[].bar)는 응답 값 — 화면 하드코딩 없음.
//
// 실시간 탭(최근 40분 / 5분 버킷)은 1분마다 다시 받는다.
//   버킷·이동합은 서버 계산이라 화면에서 현재값을 이어붙일 수 없다.
//   시간·일·월은 집계라 탭을 누를 때만 받는다.
//

import { useEffect, useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import {
  fetchObservationChart,
  type ChartRange,
  type ObservationChart,
} from '@/api/slope'
import { RISK_BADGE_COLOR, RISK_TEXT, riskOf } from './variants'
import type { SlopeRiskLevel } from './data'

/** 하단 실측값 카드 개수. */
const RECENT_COUNT = 5
/** 실시간 탭 재조회 주기 — 업체 측정이 1분 주기. */
const REALTIME_POLL_MS = 60_000
/** series 선 색 — 경사계 X축 / Y축 순. */
const SERIES_COLOR = ['#65B2FF', '#FFB65C']

export interface SelectedSensor {
  /** 차트 조회 키 (관측항목 id). 값이 없는 센서면 null. */
  observationItemId: number | null
  area: string
  /** 센서 표기명 (경사·함수-1 등). */
  label: string
  /** 현재 계측값 (없으면 null). */
  value: number | null
  unit: string
  risk: SlopeRiskLevel
  /** 국가지점번호. */
  spotNo: string | null
  address: string | null
  installedAt: string | null
  lat: number | null
  lng: number | null
}

const PERIODS = ['실시간', '시간', '일', '월'] as const
export type ChartPeriod = (typeof PERIODS)[number]

const PERIOD_RANGE: Record<ChartPeriod, ChartRange> = {
  실시간: 'realtime',
  시간: 'hour',
  일: 'day',
  월: 'month',
}

/** x축 라벨 — 실시간/시간은 HH:mm, 일은 월-일, 월은 연-월. */
function tickLabel(at: string, range: ChartRange): string {
  const [date, time] = at.split('T')
  if (range === 'month') return date?.slice(0, 7) ?? at
  if (range === 'day') return date?.slice(5) ?? at
  return time?.slice(0, 5) ?? at
}

/** x축 칸 수 — 데이터가 빠진 구간도 빈칸으로 남겨 탭마다 칸 수를 고정한다. 실시간은 40분/5분 버킷. */
const SLOT_COUNT: Record<ChartRange, number> = {
  realtime: 9,
  hour: 7,
  day: 7,
  month: 7,
}

/** 같은 구간인지 비교할 at 앞자리 길이 (분 / 시 / 일 / 월). */
const KEY_LEN: Record<ChartRange, number> = {
  realtime: 16,
  hour: 13,
  day: 10,
  month: 7,
}

/** Date → 타임존 없는 현지 ISO ('YYYY-MM-DDTHH:mm:00') — 서버 at 과 같은 형식. */
function localIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

/** 현재 구간을 마지막으로 하는 구간 시작 시각 목록 (오래된 것 → 최신). */
function slotStarts(range: ChartRange): string[] {
  const n = SLOT_COUNT[range]
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const back = n - 1 - i
    const d = new Date(now)
    d.setSeconds(0, 0)
    if (range === 'realtime') {
      d.setMinutes(d.getMinutes() - (d.getMinutes() % 5) - back * 5)
    } else if (range === 'hour') {
      d.setMinutes(0)
      d.setHours(d.getHours() - back)
    } else if (range === 'day') {
      d.setHours(0, 0)
      d.setDate(d.getDate() - back)
    } else {
      d.setHours(0, 0)
      d.setDate(1)
      d.setMonth(d.getMonth() - back)
    }
    return localIso(d)
  })
}

/** ISO → 'YYYY-MM-DD HH:mm'. */
function stamp(at: string | null): string {
  return at ? `${at.slice(0, 10)} ${at.slice(11, 16)}` : '-'
}

interface Props {
  sensor: SelectedSensor | null
  period: ChartPeriod
  onPeriodChange: (p: ChartPeriod) => void
}

export function SlopeChartPanel({ sensor, period, onPeriodChange }: Props) {
  const [chart, setChart] = useState<ObservationChart | null>(null)
  const range = PERIOD_RANGE[period]
  const itemId = sensor?.observationItemId ?? null

  // 조회 — 탭 전환 / 센서 교체 시. 실시간 탭만 1분마다 다시 받는다.
  //   5분 버킷·15분 이동합은 서버가 계산하는 값이라 화면에서 점을 이어붙일 수 없다.
  //   매분 부르면 진행 중인 버킷이 차오르는 게 보인다 (조회는 관측항목 하나짜리라 가볍다).
  useEffect(() => {
    // 이전 센서의 차트가 새 응답이 올 때까지 남아 있으면 다른 데이터가 잠깐 보인다.
    setChart(null)
    if (itemId === null) return
    let cancelled = false
    const load = () =>
      fetchObservationChart(itemId, range)
        .then((c) => {
          if (!cancelled) setChart(c)
        })
        .catch((err) => console.warn('[slope-chart] 조회 실패', err))
    void load()
    if (range !== 'realtime') {
      return () => {
        cancelled = true
      }
    }
    const timer = setInterval(() => void load(), REALTIME_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [itemId, range])

  // 응답 점을 고정 칸에 맞춘다 — 빠진 구간은 값 없는 칸, 범위 밖의 오래된 점은 버린다.
  const series = useMemo(() => {
    if (!chart) return []
    const len = KEY_LEN[range]
    const starts = slotStarts(range)
    return chart.series.map((s) => {
      const byKey = new Map(s.points.map((p) => [p.at.slice(0, len), p]))
      return {
        ...s,
        points: starts.map(
          (at) => byKey.get(at.slice(0, len)) ?? { at, value: null, complete: true },
        ),
      }
    })
  }, [chart, range])

  // x축 기준은 첫 선 (경사계 X축/Y축은 같은 시각축을 공유).
  const points = useMemo(() => series[0]?.points ?? [], [series])
  const ticks = useMemo(
    () => points.map((p) => tickLabel(p.at, range)),
    [points, range],
  )
  const unit = chart?.unit ?? sensor?.unit ?? ''
  // 값 자릿수 — 낙석 감지 횟수만 정수.
  const digits = unit === '회' ? 0 : 1
  // 응답을 받은 뒤에만 판정한다 — 조회 중(chart null)에 띄우면
  // 센서를 바꿀 때마다 '없습니다' 가 깜빡였다 사라진다.
  const hasData =
    chart !== null && series.some((s) => s.points.some((p) => p.value !== null))
  const isEmpty = chart !== null && !hasData

  const marks = useMemo(
    () =>
      (chart?.thresholds ?? []).map((t) => ({
        label: t.level ?? '',
        value: t.value,
        // ECharts 는 canvas 라 CSS 변수를 못 읽는다 — hex 팔레트(배지 색) 를 쓴다.
        color: RISK_BADGE_COLOR[riskOf(t.level)],
      })),
    [chart],
  )

  // y축 최대는 '임계값 최대' 와 '데이터 최대' 중 큰 쪽 — 임계선은 값과 무관하게 항상 보여야 한다.
  const maxThreshold = marks.reduce((m, t) => Math.max(m, t.value), 0)
  const maxValue = series.reduce(
    (m, s) =>
      s.points.reduce((n, p) => (p.value === null ? n : Math.max(n, p.value)), m),
    0,
  )
  // 위로 10% 여유 — 최대치가 축 천장에 붙으면 선이 잘려 보인다.
  const yMax = Math.max(maxThreshold, maxValue, 1) * 1.1

  const option = useMemo(
    () => ({
      backgroundColor: 'transparent',
      grid: { left: 52, right: 12, top: 24, bottom: 28 },
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: { dataIndex: number }[]) => {
          const i = params[0]?.dataIndex ?? 0
          const head = points[i]
          if (!head) return ''
          const lines = series.map((s) => {
            const p = s.points[i]
            const v =
              !p || p.value === null ? '-' : `${p.value.toFixed(digits)}${unit}`
            return series.length > 1 ? `${s.label} ${v}` : v
          })
          // 진행 중인 구간만 표시한다. 지난 구간의 complete=false 는 원본 결측이라 값만 보여준다.
          const partial = !head.complete && i === points.length - 1 ? ' (집계 중)' : ''
          // 시각(X)은 굵게 첫 줄, 값(Y)은 선마다 다음 줄 — 한 줄에 붙어 있으면 경계가 안 보인다.
          return [
            `<div style="font-weight:700;margin-bottom:4px">${tickLabel(head.at, range)}${partial}</div>`,
            ...lines.map((l) => `<div>${l}</div>`),
          ].join('')
        },
      },
      // 선이 2개면(경사계 X·Y) 범례를 띄운다 — 1개면 이름이 없어 의미가 없다.
      legend:
        series.length > 1
          ? {
              show: true,
              top: 0,
              right: 12,
              itemWidth: 14,
              itemHeight: 2,
              textStyle: {
                color: '#7F97AF',
                fontSize: 11,
                fontFamily: 'Roboto',
              },
              data: series.map((s) => s.label),
            }
          : { show: false },
      xAxis: {
        type: 'category' as const,
        // 눈금 사이 band 중앙에 라벨 — false 면 첫/마지막 라벨이 grid 밖으로 삐져나간다.
        boundaryGap: true,
        data: ticks,
        axisLabel: {
          color: '#7F97AF',
          fontSize: 12,
          fontFamily: 'Roboto',
          fontWeight: 500,
          // 구간이 많으면 라벨이 겹친다 — ECharts 가 알아서 솎아내게 둔다.
          hideOverlap: true,
        },
        axisLine: { lineStyle: { color: 'rgba(127, 151, 175, 0.4)' } },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        min: 0,
        max: yMax,
        axisLabel: {
          color: '#FFF',
          fontSize: 10,
          fontFamily: 'Pretendard',
          formatter: (v: number) => `${v.toFixed(digits)} ${unit}`.trim(),
          // 천장(yMax)은 여유를 둔 값이라 눈금 간격과 안 맞는다 — 마지막 눈금 바로 위에 선·라벨이 하나 더 생긴다.
          showMaxLabel: false,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          showMaxLine: false,
          lineStyle: { color: 'rgba(127, 151, 175, 0.2)', type: 'solid' },
        },
      },
      series: series.map((s, i) => {
        // 진행 중인 마지막 버킷(complete: false)은 아직 값이 확정되지 않았다 — 흐리게.
        const data = s.points.map((p) =>
          p.complete
            ? p.value
            : { value: p.value, itemStyle: { opacity: 0.45 } },
        )
        // 값이 1개뿐이면 선이 그려지지 않아 hover 전엔 아무것도 안 보인다.
        const filled = s.points.filter((p) => p.value !== null).length
        const color = SERIES_COLOR[i % SERIES_COLOR.length]
        return {
          // bar 는 시리즈 단위로 온다 — 강우량 realtime 은 막대(5분 합계) + 선(15분 이동합).
          type: s.bar ? ('bar' as const) : ('line' as const),
          name: s.label,
          showSymbol: filled <= 1,
          symbolSize: 5,
          data,
          itemStyle: { color },
          lineStyle: { width: 1.2, color },
          barMaxWidth: 18,
          // 임계값 — 색상별 점선 + 우측 라벨. 선이 여러 개여도 한 번만 그린다.
          markLine:
            i > 0
              ? undefined
              : {
                  silent: true,
                  symbol: 'none',
                  data: marks.map((m) => ({
                    yAxis: m.value,
                    lineStyle: {
                      color: m.color,
                      type: 'dashed' as const,
                      width: 1,
                    },
                    label: {
                      // 선 오른쪽 끝 '위' — 차트 밖이 아니라 임계선 바로 위에 붙는다.
                      position: 'insideEndTop' as const,
                      // 선에서 2px 띄움 (라벨 아래 여백).
                      padding: [0, 0, 2, 0],
                      formatter: `${m.label} ${m.value}${unit}`,
                      color: m.color,
                      fontSize: 12,
                      fontFamily: 'Roboto',
                      fontWeight: 500,
                    },
                  })),
                },
        }
      }),
      animation: false,
    }),
    [ticks, series, points, marks, unit, digits, range, yMax, chart],
  )

  // 하단 실측값 — 마지막 5개 구간. 값이 없으면 자리만 '-' 로 채운다.
  const recent = points.slice(-RECENT_COUNT)
  const recentSlots = Array.from(
    { length: RECENT_COUNT },
    (_, i) => recent[i - (RECENT_COUNT - recent.length)] ?? null,
  )
  // 헤더 관측시간 — 값이 있는 마지막 구간 시각 (빈칸 시각을 관측시간으로 보이지 않게).
  const observedAt = points.findLast((p) => p.value !== null)?.at ?? null

  return (
    <div className="slope-chart-panel">
      {/* 헤더 — 지역·센서 / 관측시간·상태 */}
      <div className="slope-chart-head">
        <div className="slope-chart-title">
          {sensor ? `${sensor.area} · ${sensor.label}` : '센서를 선택하세요'}
          {/* 상태 배지는 센서명 바로 옆 — 어느 계측기의 상태인지가 붙어 읽힌다. */}
          {sensor && (
            <span
              className="slope-sensor-status"
              style={{ background: RISK_BADGE_COLOR[sensor.risk] }}
            >
              <span style={{ position: 'relative', top: '1px' }}>
                {RISK_TEXT[sensor.risk]}
              </span>
            </span>
          )}
          {/* 실제 측정 시각 — 장애 계측기는 값이 멈춘 채 유지되므로
              이 시각이 언제인지가 유일한 단서다. 배지 바로 옆, 아랫변 기준 정렬. */}
          {sensor && (
            <span className="slope-chart-observed-time">
              최근 관측시간: {stamp(observedAt)}
            </span>
          )}
        </div>
      </div>

      {/* 기간 선택 */}
      <div className="slope-chart-periods">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            className={`slope-chart-period ${p === period ? 'is-active' : ''}`}
            onClick={() => onPeriodChange(p)}
          >
            {/* 한글 잉크 중심 보정 — 1px 내림. */}
            <span style={{ position: 'relative', top: '1px' }}>{p}</span>
          </button>
        ))}
      </div>

      {/* 차트 */}
      <div className="slope-chart-area" style={{ position: 'relative' }}>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          notMerge
        />
        {sensor && isEmpty && (
          <span className="slope-chart-empty">수집된 계측값이 없습니다</span>
        )}
      </div>

      {/* 최근 실측값 */}
      <div className="slope-chart-recent">
        {recentSlots.map((p, i) => (
          <div key={p?.at ?? `empty-${i}`} className="slope-chart-recent-item">
            <span className="slope-chart-recent-time">
              {p ? tickLabel(p.at, range) : '-'}
            </span>
            <span className="slope-chart-recent-value">
              {p?.value === null || p === null ? '-' : p.value.toFixed(digits)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
