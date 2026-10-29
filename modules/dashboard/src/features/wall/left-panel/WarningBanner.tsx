// 기상특보 banner — 빨간 pill (B5 텍스트) + 옆에 marquee (B2 텍스트).
//   warning null 이면 "발령된 특보 없음" 으로 표출 (formatWarning 안에서 처리).

import type { CSSProperties } from 'react'
import type { WeatherWarning } from '@/api/weather'
import { WarningMarquee } from './WarningMarquee'
import { formatWarning } from './utils/weatherFormatters'
import { COLORS, GLASS_CARD, TEXT_STYLES } from '@/styles/designTokens'

const PILL_TEXT: CSSProperties = {
  ...TEXT_STYLES.b5,
  color: COLORS.white,
  textAlign: 'center',
}

export function WarningBanner({
  warning,
}: {
  warning: WeatherWarning | null
}) {
  return (
    <div
      className="flex items-center"
      style={{
        width: '100%',
        gap: '12px',
        padding: '10px 12px',
        background: GLASS_CARD.background,
        border: GLASS_CARD.border,
        borderRadius: '12px',
      }}
    >
      {/* 빨간 pill */}
      <div
        className="flex items-center justify-center"
        style={{
          padding: '9px 11.25px',
          gap: '6.75px',
          borderRadius: '10px',
          background: COLORS.accentRed,
          flexShrink: 0,
        }}
      >
        <span style={PILL_TEXT}>기상특보</span>
      </div>
      <WarningMarquee text={formatWarning(warning)} />
    </div>
  )
}
