// 현재 하늘 상태 — W 64 × H 84.
//   상단: WeatherIcon (64×64)
//   하단: 라벨 ("맑음" / "구름많음" 등). 4 글자 이상이면 폰트 14px 로 축소 (1 줄 유지).
//
// skyCode (예보) 와 ptyCode (실황 / 예보) 동시 받아서 라벨 결정.

import type { CSSProperties } from 'react'
import { WeatherIcon } from '@/icons/weather/WeatherIcon'
import { skyLabel } from './utils/weatherFormatters'
import { COLORS, STROKES, TEXT_STYLES } from '@/styles/designTokens'

const LABEL_BASE: CSSProperties = {
  ...TEXT_STYLES.b2,
  color: COLORS.neutral50,
  WebkitTextStroke: STROKES.textStandard,
  textAlign: 'center',
  whiteSpace: 'nowrap',
}

interface Props {
  skyCode: number | null
  ptyCode: number | null
}

export function SkyState({ skyCode, ptyCode }: Props) {
  const label = skyLabel(skyCode, ptyCode)
  // 4 글자 이상 — 14px / lh 16 (컨테이너 폭 64 px 안에 들어가도록 축소)
  const isLong = label.length >= 4
  return (
    <div
      className="flex flex-col items-center"
      style={{ width: '64px', height: '84px' }}
    >
      <div style={{ width: '64px', height: '64px' }}>
        <WeatherIcon skyCode={skyCode} ptyCode={ptyCode} size={64} />
      </div>
      <span
        style={{
          ...LABEL_BASE,
          fontSize: isLong ? '14px' : '18px',
          lineHeight: isLong ? '16px' : '20px',
        }}
      >
        {label}
      </span>
    </div>
  )
}
