// 랙 판 부품 — 포트 (밝은 몸체 + 위쪽 홈 + 아래 큰 창). 연결되면 홈·창이 초록으로 채워진다.
//   5 × 6 정수 크기 (소수점 크기는 1px 반올림으로 어긋난다). 이전 5.3 × 6.626 시안 모양을 비율대로 옮겼다.
//   ⚠️ 초록 색은 이미지 기준 추정값 — 시안 값 나오면 교체.

const HOLE_EMPTY = '#12151C'
const HOLE_FILLED = '#6CC860'

interface Props {
  /** 연결됨 — 홈·창을 초록으로 채운다. */
  filled?: boolean
}

export function RackPortWindow({ filled = false }: Props) {
  const hole = filled ? HOLE_FILLED : HOLE_EMPTY
  return (
    <svg width="5" height="6" viewBox="0 0 5 6" fill="none" style={{ flexShrink: 0 }}>
      {/* 몸체 */}
      <rect width="5" height="6" rx="0.42" fill="#E9EEF4" />
      {/* 위쪽 홈 */}
      <rect x="1" y="0" width="3" height="2" fill={hole} />
      {/* 아래 창 */}
      <rect x="1" y="2" width="3" height="3" fill={hole} />
    </svg>
  )
}
