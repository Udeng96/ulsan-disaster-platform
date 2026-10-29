// 기상특보 marquee — 내용이 container 폭 넘으면 자동 좌측 슬라이드 (animation, 무한 loop).
// 짧으면 ellipsis 처럼 표시 (animation 비활성).
//   1) inner div 의 scrollWidth > container clientWidth 측정
//   2) overflow 시 같은 텍스트 2 회 렌더 (gap 으로 분리) + animation translateX(-50%) 무한 loop

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { COLORS, STROKES, TEXT_STYLES } from '@/styles/designTokens'

// B2 텍스트 + 흰색 + Neutral-500 25% 알파 스트로크 + nowrap.
const BASE_STYLE: CSSProperties = {
  ...TEXT_STYLES.b2,
  color: COLORS.white,
  WebkitTextStroke: STROKES.textStandard,
  whiteSpace: 'nowrap',
}

export function WarningMarquee({ text, textStyle, centered = false }: { text: string; textStyle?: CSSProperties; centered?: boolean }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)
  const [overflowed, setOverflowed] = useState(false)

  useEffect(() => {
    const measure = () => {
      const wrap = wrapperRef.current
      const inner = innerRef.current
      if (!wrap || !inner) return
      setOverflowed(inner.scrollWidth > wrap.clientWidth + 1)
    }
    measure()
    const obs = new ResizeObserver(measure)
    if (wrapperRef.current) obs.observe(wrapperRef.current)
    return () => obs.disconnect()
  }, [text])

  return (
    <div
      ref={wrapperRef}
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        minWidth: 0,
        textAlign: centered && !overflowed ? 'center' : 'left',
      }}
    >
      <div
        ref={innerRef}
        style={{
          display: 'inline-flex',
          verticalAlign: centered ? 'top' : undefined,
          gap: '48px',
          animation: overflowed
            ? 'warning-marquee 18s linear infinite'
            : undefined,
        }}
      >
        <span style={{ ...BASE_STYLE, ...textStyle }}>{text}</span>
        {/* 무한 loop 위해 동일 텍스트 한 번 더 — animation 비활성 시는 숨김 */}
        {overflowed && <span aria-hidden="true" style={{ ...BASE_STYLE, ...textStyle }}>{text}</span>}
      </div>
    </div>
  )
}
