// 계측 상세 차트 — 칸 맞추기·축 글씨·ECharts 설정 (화면 없이 계산만).
//   x축 칸 수는 탭마다 고정 (빠진 구간도 빈칸으로). 실시간은 최근 40분 5분 칸 9개.
import type { ChartPoint, ChartRange, ChartSeries, ObservationChart } from './api'
import { RISK_BADGE_COLOR, riskOf } from '@/features/menus/steep-slope/variants'
import { CHART } from '@/shared/styles/palette'

export const PERIODS = ['실시간', '시간', '일', '월', '기간설정'] as const
export type ChartPeriod = (typeof PERIODS)[number]
export const PERIOD_RANGE: Record<Exclude<ChartPeriod, '기간설정'>, ChartRange> = { 실시간: 'realtime', 시간: 'hour', 일: 'day', 월: 'month' }

/** 기간설정 — 'YYYY-MM-DD' 시작·끝 (끝 날 포함). 수정사항 15번 (10-16) */
export interface CustomPeriod {
  from: string
  to: string
}

/** 기간 길이로 칸 단위를 정한다 — 3일 이하 1시간, 93일 이하 1일, 넘으면 1달 (칸이 너무 많거나 적지 않게) */
export function customBucket({ from, to }: CustomPeriod): Exclude<ChartRange, 'realtime'> {
  const days = (new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000 + 1
  return days <= 3 ? 'hour' : days <= 93 ? 'day' : 'month'
}

/** 기간설정의 구간 시작 시각들 — 시작 날 0시부터 끝 날 끝까지 (오래된 것 → 최신) */
export function periodStarts(bucket: Exclude<ChartRange, 'realtime'>, { from, to }: CustomPeriod): string[] {
  const end = new Date(`${to}T00:00:00`)
  end.setDate(end.getDate() + 1)
  const d = new Date(`${from}T00:00:00`)
  if (bucket === 'month') d.setDate(1)
  const out: string[] = []
  while (d < end) {
    out.push(localIso(d))
    if (bucket === 'hour') d.setHours(d.getHours() + 1)
    else if (bucket === 'day') d.setDate(d.getDate() + 1)
    else d.setMonth(d.getMonth() + 1)
  }
  return out
}

const SLOT_COUNT: Record<ChartRange, number> = { realtime: 9, hour: 7, day: 7, month: 7 }
/** 같은 구간인지 볼 at 앞자리 길이 (분 / 시 / 일 / 월) */
const KEY_LEN: Record<ChartRange, number> = { realtime: 16, hour: 13, day: 10, month: 7 }

/** x축 글씨 — 실시간·시간은 HH:mm, 일은 MM-DD, 월은 YYYY-MM */
export function tickLabel(at: string, range: ChartRange): string {
  const [date, time] = at.split('T')
  if (range === 'month') return date?.slice(0, 7) ?? at
  if (range === 'day') return date?.slice(5) ?? at
  return time?.slice(0, 5) ?? at
}

/** Date → 서버 at 과 같은 현지 시각 글자 ('YYYY-MM-DDTHH:mm:00') */
function localIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

/** 지금 구간을 마지막으로 하는 구간 시작 시각들 (오래된 것 → 최신) */
export function slotStarts(range: ChartRange, now = new Date()): string[] {
  const n = SLOT_COUNT[range]
  return Array.from({ length: n }, (_, i) => {
    const back = n - 1 - i
    const d = new Date(now)
    d.setSeconds(0, 0)
    if (range === 'realtime') d.setMinutes(d.getMinutes() - (d.getMinutes() % 5) - back * 5)
    else if (range === 'hour') {
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

/** 응답 점을 고정 칸에 맞춘다 — 빠진 구간은 값 없는 칸, 범위 밖의 오래된 점은 버림. 기간설정은 그 기간의 칸 */
export function fitSlots(chart: ObservationChart, range: ChartRange, now = new Date(), period?: CustomPeriod): ChartSeries[] {
  const len = KEY_LEN[range]
  const starts = period && range !== 'realtime' ? periodStarts(range, period) : slotStarts(range, now)
  return chart.series.map((s) => {
    const byKey = new Map(s.points.map((p) => [p.at.slice(0, len), p]))
    return { ...s, points: starts.map((at): ChartPoint => byKey.get(at.slice(0, len)) ?? { at, value: null, complete: true }) }
  })
}

/** 'YYYY-MM-DD HH:mm' (없으면 '-') */
export function stamp(at: string | null): string {
  return at ? `${at.slice(0, 10)} ${at.slice(11, 16)}` : '-'
}

/** 차트 그리는 방식 (수정 14) */
export interface ChartExtra {
  /** 여러 센서 전체 — 센서마다 선 하나, 마우스를 올린 선만 진하게·그 선 값만 툴팁 */
  many?: boolean
  /** 함수비 막대 — 오른쪽 % 축 (경사·함수 센서 하나를 볼 때) */
  bars?: { series: ChartSeries; unit: string }
}

/** ECharts 설정 — 임계선은 점선 + 오른쪽 위 글씨, 진행 중인 마지막 칸은 흐리게 */
export function chartOption(chart: ObservationChart | null, series: ChartSeries[], range: ChartRange, unit: string, extra: ChartExtra = {}) {
  const { many = false, bars } = extra
  const points = series[0]?.points ?? []
  const digits = unit === '회' ? 0 : 1
  const marks = (chart?.thresholds ?? []).map((t) => ({ label: t.level ?? '', value: t.value, color: RISK_BADGE_COLOR[riskOf(t.level)] }))
  // y축 꼭대기는 임계값·값 중 큰 쪽 + 10% (임계선은 늘 보여야 하고, 최대값이 천장에 붙으면 잘려 보임)
  const maxThreshold = marks.reduce((m, t) => Math.max(m, t.value), 0)
  const maxValue = series.reduce((m, s) => s.points.reduce((n, p) => (p.value === null ? n : Math.max(n, p.value)), m), 0)
  const yMax = Math.max(maxThreshold, maxValue, 1) * 1.1
  const barMax = bars ? Math.max(...bars.series.points.map((p) => p.value ?? 0), 1) * 1.1 : 0
  const font = { fontFamily: 'Roboto' }
  const colors = many ? CHART.sensors : CHART.series
  const fmtValue = (p: ChartPoint | undefined, d: number, u: string) => (!p || p.value === null ? '-' : `${p.value.toFixed(d)}${u}`)
  // 진행 중인 마지막 칸만 '집계 중' (지난 칸의 complete=false 는 원본 결측)
  const headOf = (i: number) => {
    const head = points[i]
    if (!head) return null
    const partial = !head.complete && i === points.length - 1 ? ' (집계 중)' : ''
    return `<div style="font-weight:700;margin-bottom:4px">${tickLabel(head.at, range)}${partial}</div>`
  }
  const yAxisOf = (max: number, d: number, u: string, right: boolean) => ({
    type: 'value' as const,
    min: 0,
    max,
    position: right ? ('right' as const) : ('left' as const),
    axisLabel: {
      color: CHART.white,
      fontSize: 10,
      fontFamily: 'Pretendard',
      formatter: (v: number) => `${v.toFixed(d)} ${u}`.trim(),
      // 꼭대기는 여유를 둔 값이라 눈금과 안 맞아 마지막 줄 위에 하나 더 생긴다
      showMaxLabel: false,
    },
    axisLine: { show: false },
    axisTick: { show: false },
    // 오른쪽 축은 눈금 선을 겹쳐 그리지 않는다
    splitLine: right ? { show: false } : { showMaxLine: false, lineStyle: { color: CHART.grid, type: 'solid' as const } },
  })
  const legendNames = [...series.map((s) => s.label), ...(bars ? [bars.series.label] : [])]

  return {
    backgroundColor: 'transparent',
    grid: { left: 52, right: bars ? 52 : 12, top: 24, bottom: 28 },
    tooltip: many
      ? {
          // 마우스를 올린 선 하나의 그 칸 값
          trigger: 'item' as const,
          formatter: (p: { dataIndex: number; seriesIndex: number }) => {
            const head = headOf(p.dataIndex)
            const s = series[p.seriesIndex]
            if (!head || !s) return ''
            return `${head}<div>${s.label} ${fmtValue(s.points[p.dataIndex], digits, unit)}</div>`
          },
        }
      : {
          trigger: 'axis' as const,
          formatter: (params: { dataIndex: number }[]) => {
            const i = params[0]?.dataIndex ?? 0
            const head = headOf(i)
            if (!head) return ''
            const lines = series.map((s) => {
              const v = fmtValue(s.points[i], digits, unit)
              return series.length > 1 || bars ? `${s.label} ${v}` : v
            })
            if (bars) lines.push(`${bars.series.label} ${fmtValue(bars.series.points[i], 1, bars.unit)}`)
            return [head, ...lines.map((l) => `<div>${l}</div>`)].join('')
          },
        },
    // 선이 2개 이상(경사계 X·Y, 전체)이거나 막대가 있을 때만 범례. 전체는 넘치면 넘겨 본다
    legend:
      legendNames.length > 1
        ? {
            show: true,
            type: many ? ('scroll' as const) : ('plain' as const),
            top: 0,
            right: 12,
            left: many ? 132 : 'auto',
            itemWidth: 14,
            itemHeight: 2,
            pageIconColor: CHART.white,
            pageTextStyle: { color: CHART.label, fontSize: 11, ...font },
            textStyle: { color: CHART.label, fontSize: 11, ...font },
            data: legendNames,
          }
        : { show: false },
    xAxis: {
      type: 'category' as const,
      // 칸 가운데에 글씨 — false 면 처음·끝 글씨가 밖으로 나간다
      boundaryGap: true,
      data: points.map((p) => tickLabel(p.at, range)),
      axisLabel: { color: CHART.label, fontSize: 12, fontWeight: 500, hideOverlap: true, ...font },
      axisLine: { lineStyle: { color: CHART.axisLine } },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: [yAxisOf(yMax, digits, unit, false), ...(bars ? [yAxisOf(barMax, 1, bars.unit, true)] : [])],
    series: [
      // 함수비 막대는 선 뒤에
      ...(bars
        ? [
            {
              type: 'bar' as const,
              name: bars.series.label,
              yAxisIndex: 1,
              data: bars.series.points.map((p) => (p.complete ? p.value : { value: p.value, itemStyle: { opacity: 0.45 } })),
              itemStyle: { color: CHART.moisture },
              barMaxWidth: 18,
            },
          ]
        : []),
      ...series.map((s, i) => {
        const color = colors[i % colors.length]
        const filled = s.points.filter((p) => p.value !== null).length
        return {
          // 강우량 실시간은 막대(5분 합계) + 선(15분 이동합)
          type: s.bar ? ('bar' as const) : ('line' as const),
          name: s.label,
          // 값이 하나뿐이면 선이 안 그려져 점으로. 전체는 마우스를 올릴 점이 있어야 해서 늘
          showSymbol: many || filled <= 1,
          symbolSize: 5,
          data: s.points.map((p) => (p.complete ? p.value : { value: p.value, itemStyle: { opacity: 0.45 } })),
          itemStyle: { color },
          lineStyle: { width: 1.2, color },
          barMaxWidth: 18,
          // 전체 — 올린 선만 진하게, 나머지는 흐리게 (선 위에서도 잡히게)
          ...(many
            ? {
                triggerLineEvent: true,
                emphasis: { focus: 'series' as const, lineStyle: { width: 2.4 } },
                blur: { lineStyle: { opacity: 0.12 }, itemStyle: { opacity: 0.12 } },
              }
            : {}),
          // 임계선은 첫 선에만 (한 번만 그림)
          markLine:
            i > 0
              ? undefined
              : {
                  silent: true,
                  symbol: 'none',
                  // 전체에서 다른 선에 마우스를 올려도 임계선은 흐리지 않는다
                  blur: { lineStyle: { opacity: 1 }, label: { opacity: 1 } },
                  data: marks.map((m) => ({
                    yAxis: m.value,
                    lineStyle: { color: m.color, type: 'dashed' as const, width: 1 },
                    label: { position: 'insideEndTop' as const, padding: [0, 0, 2, 0], formatter: `${m.label} ${m.value}${unit}`, color: m.color, fontSize: 12, fontWeight: 500, ...font },
                  })),
                },
        }
      }),
    ],
    animation: false,
  }
}
