// 한 채널 row — 차트 + 인디케이터가 같은 시계열을 본다.
//   series 는 상위(EarthquakePanel) 의 SSE 훅에서 받는다 (수신 전에는 빈 배열).

import { COLORS } from '@/styles/designTokens'
import { fmtTime } from './channels'
import { EarthquakeChart } from './EarthquakeChart'
import { IntensityIndicator } from './IntensityIndicator'

// 평상시 진도 등급 — INTENSITY_LEVELS 의 최저 단계.
const DEFAULT_LEVEL = 'I'

interface Props {
  code: string
  location: string
  /** SSE 시계열 [epoch ms, gal] — 수신 전에는 빈 배열. */
  data?: ReadonlyArray<readonly [number, number]>
  /** 축 오른쪽 끝 (현재 시각). */
  now: number
}

export function ChannelRow({ code, location, data, now }: Props) {
  const level = DEFAULT_LEVEL
  const series = data ?? []

  // 최신 데이터 = 시계열 마지막. 차트 헤더와 인디케이터 모두 이걸 표시 → 항상 동기.
  const last = series[series.length - 1]
  const currentTime = last ? fmtTime(new Date(last[0])) : '--:--:--'
  const currentVal = last?.[1] ?? 0

  return (
    <div
      className="flex items-center self-stretch"
      style={{
        // 남은 높이를 채널 수로 나눠 갖는다 — '수신 중단' 배지가 뜨면 그만큼 줄어야 하므로
        //   고정 높이(136)로 두면 패널 밖으로 넘친다.
        flex: '1 0 0',
        minHeight: 0,
        borderTop: '1px solid rgba(185, 206, 232, 0.60)',
      }}
    >
      {/* 제목 cell — W 96 */}
      <div
        className="flex flex-col items-center justify-center self-stretch"
        style={{
          width: '96px',
          gap: '2px',
          borderTop: `1px solid ${COLORS.neutral450}`,
          borderLeft: `1px solid ${COLORS.neutral450}`,
          background: COLORS.neutral700,
        }}
      >
        <span
          className="text-b3"
          style={{ color: COLORS.neutral100, textAlign: 'center' }}
        >
          {code}
        </span>
        <span
          className="text-b3"
          style={{ color: COLORS.neutral100, textAlign: 'center' }}
        >
          {location}
        </span>
      </div>

      {/* 내용 영역 — W 384 (= 480 - 96), 차트 + 색상 범례 */}
      <div
        className="flex items-center self-stretch"
        style={{
          width: '384px',
          background: COLORS.neutral800,
        }}
      >
        <div
          className="flex flex-col items-center justify-center self-stretch"
          style={{
            flex: '1 0 0',
            gap: '2px',
            borderTop: `1px solid ${COLORS.neutral450}`,
            borderLeft: `1px solid ${COLORS.neutral450}`,
          }}
        >
          <EarthquakeChart series={series} now={now} headerTime={currentTime} />
        </div>
        <IntensityIndicator
          currentVal={currentVal}
          currentTime={currentTime}
          level={level}
        />
      </div>
    </div>
  )
}
