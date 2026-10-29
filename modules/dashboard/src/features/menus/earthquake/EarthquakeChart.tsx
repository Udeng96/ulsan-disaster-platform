// 지진계측 차트 (pure) — 고정 시간창 시계열을 ECharts 로 렌더.
//
// 실시간 갱신이라 축을 데이터에 맞추면 점이 들어올 때마다 늘었다 줄었다 한다.
//   → x축은 type 'time' + [now - WINDOW_MS, now] 로 매 틱마다 직접 지정한다.
//   → animation 은 끈다 (켜면 점이 미끄러지듯 움직여 덜컹거림이 커진다).
//
// 차트 내부 색상 (#B8C8D6=neutral200, #F4F8FB=neutral50, #65B2FF=차트 라인) 은
// ECharts option (JS 값) 이라 CSS 변수(var(--color-*)) 를 못 써서 raw hex 로 둠.

import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { VMIN_TOP, WINDOW_MS } from './channels'

interface Props {
  /** [epoch ms, gal] — 오래된 것 → 최신. */
  series: ReadonlyArray<readonly [number, number]>
  /** 축 오른쪽 끝(현재 시각, epoch ms). */
  now: number
  headerTime: string
}

export function EarthquakeChart({ series, now, headerTime }: Props) {
  // y축 상한 — 평상시엔 고정, 지진 시에는 관측 최대에 맞춰 늘어난다.
  const yMax = useMemo(() => {
    const peak = series.reduce((m, [, v]) => (v > m ? v : m), 0)
    if (peak <= VMIN_TOP) return VMIN_TOP
    // 눈금이 지저분해지지 않게 위로 여유 20% + 한 자리로 반올림.
    const scaled = peak * 1.2
    const step = Math.pow(10, Math.floor(Math.log10(scaled)))
    return Math.ceil(scaled / step) * step
  }, [series])

  const option = useMemo(
    () => ({
      backgroundColor: 'transparent',
      grid: { left: 44, right: 6, top: 8, bottom: 18 },
      xAxis: {
        type: 'time' as const,
        // 고정 시간창 — 데이터가 이 안을 흘러간다.
        min: now - WINDOW_MS,
        max: now,
        axisLabel: {
          color: '#B8C8D6',
          fontSize: 10,
          fontFamily: 'Roboto',
          formatter: '{HH}:{mm}:{ss}',
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
        splitNumber: 3,
        axisLabel: {
          color: '#B8C8D6',
          fontSize: 10,
          fontFamily: 'Roboto',
          formatter: (v: number) => v.toFixed(4),
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: 'rgba(127, 151, 175, 0.2)', type: 'solid' },
        },
      },
      series: [
        {
          type: 'line' as const,
          showSymbol: false,
          smooth: false,
          data: series as Array<[number, number]>,
          itemStyle: { color: '#65B2FF' },
          lineStyle: { width: 1.2, color: '#65B2FF' },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(101, 178, 255, 0.35)' },
                { offset: 1, color: 'rgba(101, 178, 255, 0)' },
              ],
            },
          },
        },
      ],
      // 실시간 갱신 — 애니메이션 끔.
      animation: false,
    }),
    [series, now, yMax],
  )

  return (
    <div
      className="flex flex-col"
      style={{ width: '300px', padding: '4px 10px 4px 0', gap: '2px' }}
    >
      <div
        className="flex justify-end"
        style={{
          color: '#F4F8FB',
          textAlign: 'right',
          fontFamily: 'Roboto',
          fontSize: '10px',
          fontWeight: 400,
          lineHeight: '12px',
        }}
      >
        S: {headerTime} / D: {headerTime} / 1 sec
      </div>
      {/* 수신 전 — 빈 축만 보이면 조용한 건지 안 오는 건지 알 수 없어 문구로 알린다. */}
      <div style={{ position: 'relative', height: '100px', width: '100%' }}>
        <ReactECharts
          option={option}
          style={{ height: '100px', width: '100%' }}
          notMerge={false}
          lazyUpdate
        />
        {series.length === 0 && (
          <div
            className="flex items-center justify-center"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              color: 'rgba(244, 248, 251, 0.45)',
              fontFamily: 'Roboto',
              fontSize: '11px',
              fontWeight: 500,
            }}
          >
            수신 대기 중
          </div>
        )}
      </div>
    </div>
  )
}
