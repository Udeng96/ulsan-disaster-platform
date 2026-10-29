// 날씨 metric 카드 — icon + label + value 한 박스.
//   W 138 × H 64, 흰 alpha 배경 + 보더, 라운드 12.
//
// 사용처 (날씨 카드 안 6 번 반복):
//   - 온도·습도, 바람, 강수량 (실황)
//   - 미세먼지, 초미세먼지, 오존 (대기질)

import type { CSSProperties, ReactNode } from 'react'
import { COLORS, GLASS_CARD, STROKES, TEXT_STYLES } from '@/styles/designTokens'

const LABEL_TEXT: CSSProperties = {
  ...TEXT_STYLES.b3,
  color: COLORS.white,
  WebkitTextStroke: STROKES.textThin,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
}

const VALUE_TEXT: CSSProperties = {
  ...TEXT_STYLES.b2,
  color: COLORS.white,
  WebkitTextStroke: STROKES.textStandard,
  whiteSpace: 'nowrap',
}

interface Props {
  icon: ReactNode
  label: string
  value: string
}

export function WeatherMetricCard({ icon, label, value }: Props) {
  return (
    <div
      className="flex flex-col items-center"
      style={{
        width: '138px',
        height: '64px',
        gap: '4px',
        padding: '10px 8px',
        background: GLASS_CARD.background,
        border: GLASS_CARD.border,
        borderRadius: '12px',
      }}
    >
      <span style={LABEL_TEXT}>
        {icon}
        {label}
      </span>
      <span style={VALUE_TEXT}>{value}</span>
    </div>
  )
}
