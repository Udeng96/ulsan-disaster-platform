// 현재 날짜 + 시간 표출 — W 192 × H 58.
//   상단: "YYYY년 M월 D일 요일" (B2)
//   하단: 오후/오전 (31px) + HH:MM (34px)

import type { CSSProperties } from 'react'
import { COLORS, FONTS, STROKES, TEXT_STYLES } from '@/styles/designTokens'
import { fmtKoDate, fmtKoTime } from '@/utils/dateFormatters'

const DATE_TEXT: CSSProperties = {
  ...TEXT_STYLES.b2,
  color: COLORS.neutral50,
  WebkitTextStroke: STROKES.textStandard,
}

const MERIDIEM_TEXT: CSSProperties = {
  fontFamily: FONTS.sans,
  color: COLORS.neutral50,
  fontSize: '31px',
  fontWeight: 600,
  lineHeight: '34px',
  WebkitTextStroke: STROKES.textStandard,
}

const TIME_TEXT: CSSProperties = {
  fontFamily: FONTS.sans,
  color: COLORS.neutral50,
  fontSize: '34px',
  fontWeight: 700,
  lineHeight: '34px',
  letterSpacing: '1.7px',
  WebkitTextStroke: STROKES.textStandard,
}

export function CurrentDateTime({ now }: { now: Date }) {
  const { meridiem, time } = fmtKoTime(now)
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: '192px', height: '58px', gap: '6px' }}
    >
      <span style={DATE_TEXT}>{fmtKoDate(now)}</span>
      <div className="flex items-baseline" style={{ gap: '16px' }}>
        <span style={MERIDIEM_TEXT}>{meridiem}</span>
        <span style={TIME_TEXT}>{time}</span>
      </div>
    </div>
  )
}
