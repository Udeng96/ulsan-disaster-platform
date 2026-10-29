// SectionCard — Panel compound (Header + Body) 를 LeftPanel 전용 사이즈로 wrapping.
//   wrapper W 424, 헤더 W 464 × H 56 + radius top 16 + 우상단 ExpandButton,
//   본문 W 464 × H {bodyHeight} (optional bg image).
//   *header/body W 464 가 wrapper W 424 보다 넓어서 우측으로 40px overflow — 시안 디자인.
//
// 사용처: LeftPanel 의 "위성 지도", "재난 방송" 카드.

import type { CSSProperties, ReactNode } from 'react'
import { Panel } from '@/components/layout/Panel'
import { ExpandButton } from '@/components/button/ExpandButton'
import { COLORS, TEXT_STYLES } from '@/styles/designTokens'

// H3 — TEXT_STYLES.h3 + Neutral-50 색상 + Neutral-500 스트로크 + lineHeight 32 override.
const H3_TEXT: CSSProperties = {
  ...TEXT_STYLES.h3,
  color: COLORS.neutral50,
  textAlign: 'center',
  lineHeight: '32px',
  WebkitTextStroke: `1px ${COLORS.neutral500}`,
}

interface Props {
  title: string
  bodyHeight?: number
  bodyBackground?: string
  /** 우상단 확장 버튼 클릭 시 — 부모가 전체화면 모달 열기. 미지정 시 버튼 동작 없음. */
  onExpand?: () => void
  children?: ReactNode
}

export function SectionCard({
  title,
  bodyHeight = 219,
  bodyBackground,
  onExpand,
  children,
}: Props) {
  return (
    <Panel width="424px" height={`${56 + bodyHeight}px`}>
      <Panel.Header
        width="464px"
        height="56px"
        padding="9px 0 4.5px 0"
        borderRadius="16px 16px 0 0"
      >
        <span style={H3_TEXT}>{title}</span>
        {/* 확장 버튼 — 32×32, top 12 right 12 absolute */}
        <ExpandButton
          onClick={onExpand}
          style={{ position: 'absolute', top: '12px', right: '12px' }}
        />
      </Panel.Header>
      <Panel.Body
        width="464px"
        height={`${bodyHeight}px`}
        style={
          bodyBackground
            ? {
                backgroundImage: `url('${bodyBackground}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        {children}
      </Panel.Body>
    </Panel>
  )
}
