// 지진가속도 차트 — ECharts 설정 (순수 함수).
//   x축은 '최근 60초' 고정 창 (데이터 범위를 따르면 점이 들어올 때마다 축이 늘었다 줄었다 한다).
//   y축 꼭대기는 진도 단계 상한 (평상시 진도 I → 0.69 gal 이라 평상시 값 0.02~0.05 는 바닥 가까이 낮게).
//   값이 커지면 그 값이 든 진도 단계의 상한으로 한 단계씩 올린다 (10-21 사용자 "진도 I 인데 10단계처럼 보여").
import { WINDOW_MS } from '@/features/menus/earthquake/channels'
import { CHART } from '@/shared/styles/palette'

export type Point = readonly [number, number]

/**
 * 진도 I~IX 상한 (gal) — 기상청 계기진도 최대지반가속도 %g 표를 gal 로 바꾼 값
 * (답: notes/gis-front/api-질문/3-지진-답-earthquake.md 8번, hpga 단위 gal)
 */
export const INTENSITY_TOP_GAL = [0.69, 2.26, 7.45, 25.1, 67.3, 144.5, 310.5, 667, 1433] as const

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const

/** 가속도(gal) → 진도 (위 표, 상한 미만이면 그 단계). 1433 gal 이상은 X (10-21 사용자 '진도 계산해서 넣자') */
export function intensityOf(gal: number): (typeof ROMAN)[number] {
  const i = INTENSITY_TOP_GAL.findIndex((t) => gal < t)
  return ROMAN[i === -1 ? ROMAN.length - 1 : i]
}

/** y축 꼭대기 — 가장 큰 값이 든 진도 단계의 상한. 진도 X 이상이면 최대 × 1.2 를 한 자리로 올림 */
export function yMax(series: ReadonlyArray<Point>): number {
  const peak = series.reduce((m, [, v]) => (v > m ? v : m), 0)
  const top = INTENSITY_TOP_GAL.find((t) => peak < t)
  if (top !== undefined) return top
  const scaled = peak * 1.2
  const step = Math.pow(10, Math.floor(Math.log10(scaled)))
  return Math.ceil(scaled / step) * step
}

/** y축 글씨 — 작은 값은 소수 4자리 (옛 화면과 같게), 커지면 칸이 좁아 줄인다 */
const yLabel = (v: number) => v.toFixed(v < 10 ? 4 : v < 100 ? 2 : 0)

const axisLabel = { color: CHART.labelLight, fontSize: 10, fontFamily: 'Roboto' }

export function chartOption(series: ReadonlyArray<Point>, now: number) {
  const top = yMax(series)
  return {
    backgroundColor: 'transparent',
    grid: { left: 44, right: 6, top: 8, bottom: 18 },
    xAxis: {
      type: 'time' as const,
      min: now - WINDOW_MS,
      max: now,
      axisLabel: { ...axisLabel, formatter: '{HH}:{mm}:{ss}', hideOverlap: true },
      axisLine: { lineStyle: { color: CHART.axisLine } },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      min: 0,
      max: top,
      // 꼭대기가 딱 떨어지는 수가 아니라 칸을 3등분으로 정한다 (안 정하면 꼭대기 줄이 빠진다)
      interval: top / 3,
      axisLabel: { ...axisLabel, formatter: yLabel },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: CHART.grid, type: 'solid' as const } },
    },
    series: [
      {
        type: 'line' as const,
        showSymbol: false,
        smooth: false,
        data: series as Array<[number, number]>,
        itemStyle: { color: CHART.series[0] },
        lineStyle: { width: 1.2, color: CHART.series[0] },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: CHART.area[0] },
              { offset: 1, color: CHART.area[1] },
            ],
          },
        },
      },
    ],
    // 1초마다 다시 그려서 애니메이션은 끈다 (켜면 선이 미끄러져 덜컹거린다)
    animation: false,
  }
}
