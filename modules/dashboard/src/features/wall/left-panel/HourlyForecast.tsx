// 시간별 예보 — 가장 가까운 3 개 시간대 표출 (3 행 × H 26).
//   row 구조: HH:MM (좌, 41px 고정) + 라벨 (우)
//   행 배경: 어두운 alpha 16% + plus-darker blend

import type { CSSProperties } from 'react'
import type { WeatherPrediction } from '@/api/weather'
import { fmtHHMM } from '@/utils/dateFormatters'
import { skyLabel } from './utils/weatherFormatters'
import { COLORS, STROKES, TEXT_STYLES } from '@/styles/designTokens'

const TEXT_B3: CSSProperties = {
  ...TEXT_STYLES.b3,
  color: COLORS.white,
  WebkitTextStroke: STROKES.textThin,
}

export function HourlyForecast({
  predictions,
}: {
  predictions: WeatherPrediction[]
}) {
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: '138px', height: '84px', gap: '3px' }}
    >
      {predictions.slice(0, 3).map((p) => (
        <div
          key={p.forecastAt}
          className="flex items-center justify-center self-stretch"
          style={{
            height: '26px',
            padding: '0 6px',
            gap: '12px',
            borderRadius: '6px',
            background: 'rgba(48, 56, 64, 0.16)',
            backgroundBlendMode: 'plus-darker',
          }}
        >
          <span
            style={{
              ...TEXT_B3,
              width: '41px',
              display: 'inline-block',
            }}
          >
            {fmtHHMM(p.forecastAt)}
          </span>
          <span style={TEXT_B3}>{skyLabel(p.skyCode, p.ptyCode)}</span>
        </div>
      ))}
    </div>
  )
}
