// 배수펌프장 상단 요약 row — W 432 × H 80, radius 14, plus-darker bg.
// "총 N / 12 개소 가동" — N 과 "가동" 은 accent color, 나머지 neutral100.
//   N > 0 (가동중) → accentGreen
//   N === 0 (꺼짐) → accentBlue

import { COLORS, PANEL_BG } from '@/styles/designTokens'

const SUMMARY_FONT = {
  fontFamily: 'Roboto',
  fontSize: '30px',
  fontWeight: 600 as const,
  lineHeight: '32px',
  textAlign: 'center' as const,
}

export function PumpSummaryRow({
  runningCount,
  totalCount,
}: {
  runningCount: number
  totalCount: number
}) {
  const accentColor =
    runningCount > 0 ? COLORS.accentGreen : COLORS.accentBlue
  return (
    <div
      className="flex items-center justify-center self-stretch"
      style={{
        width: '432px',
        height: '80px',
        flexShrink: 0,
        gap: '14px',
        borderRadius: '14px',
        background: PANEL_BG.inner,
        backgroundBlendMode: 'plus-darker',
      }}
    >
      <span style={{ ...SUMMARY_FONT, color: COLORS.neutral100 }}>총</span>
      <span style={SUMMARY_FONT}>
        <span style={{ color: accentColor }}>{runningCount}</span>
        <span style={{ color: COLORS.neutral100 }}> / {totalCount} 개소</span>
      </span>
      <span style={{ ...SUMMARY_FONT, color: accentColor }}>가동</span>
    </div>
  )
}
