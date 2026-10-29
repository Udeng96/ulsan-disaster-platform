// 우측 패널 내부에서 공유하는 텍스트 스타일.
//   - B4_TEXT : 표 헤더 / row 라벨 / pill 안 상태 텍스트 — 흰색 + 가운데 정렬 + lh 16 + pre-line.
// 다른 텍스트 스타일 (H3 헤더, H4 미니 헤더, Roboto 인라인) 은 사용처가 1곳이라
// 각 컴포넌트 자체 상수로 유지.

import type { CSSProperties } from 'react'
import { COLORS, TEXT_STYLES } from '@/styles/designTokens'

export const B4_TEXT: CSSProperties = {
  ...TEXT_STYLES.b4,
  color: COLORS.white,
  textAlign: 'center',
  lineHeight: '16px',
  whiteSpace: 'pre-line',
}
