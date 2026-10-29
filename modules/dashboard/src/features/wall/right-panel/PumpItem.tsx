// 배수펌프장 grid 의 작은 아이템 — W 212 × H 80, radius 14, plus-darker bg.
// 이름 (좌) + "current / total대 가동" (우).
//   current > 0 (가동중) → accentGreen
//   current === 0 (꺼짐) → accentBlue

import { COLORS, PANEL_BG } from '@/styles/designTokens'

const BASE_FONT = {
  fontFamily: 'Roboto',
  fontSize: '22px',
  fontWeight: 600 as const,
  lineHeight: '24px',
}

export function PumpItem({
  name,
  current,
  total,
}: {
  name: string
  current: number
  total: number
}) {
  const accentColor = current > 0 ? COLORS.accentGreen : COLORS.accentBlue
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: '212px',
        height: '80px',
        gap: '10px',
        borderRadius: '14px',
        background: PANEL_BG.inner,
        backgroundBlendMode: 'plus-darker',
      }}
    >
      <span
        style={{
          ...BASE_FONT,
          color: COLORS.neutral100,
          whiteSpace: 'pre-line',
          textAlign: 'center',
        }}
      >
        {name}
      </span>
      <span style={BASE_FONT}>
        <span style={{ color: accentColor }}>{current}</span>
        <span style={{ color: COLORS.neutral100 }}> / {total}대 </span>
        <span style={{ color: accentColor }}>가동</span>
      </span>
    </div>
  )
}
