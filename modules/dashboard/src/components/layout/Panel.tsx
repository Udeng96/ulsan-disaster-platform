// 패널 — Header / Body 조합 패턴 (compound component).
//
// 디자인:
//   Header: linear-gradient(180deg, #0E3E6E → #002245) + border 2px rgba(175,205,238,0.15)
//           + boxShadow 0 3px 5px rgba(0,0,0,0.15).
//           메인 앱 헤더 / 섹션 카드 헤더 / mini column 헤더 등에서 재사용.
//   Body:   flex-col 콘텐츠 영역. 크기 / 배경은 호출처에서 결정.
//
// 사용 예:
//   // 헤더만
//   <Panel.Header width={2000} height={104}>
//     <h1>재난관리 통합플랫폼</h1>
//   </Panel.Header>
//
//   // 헤더 + 본문 (위성 지도 카드 등)
//   <Panel width={424} height={275}>
//     <Panel.Header width={464} height={56} borderRadius="16px 16px 0 0">
//       <span>위성 지도</span>
//     </Panel.Header>
//     <Panel.Body width={464} height={219}>
//       <RadarLatest />
//     </Panel.Body>
//   </Panel>

import type { CSSProperties, ReactNode } from 'react'
import {
  BORDERS,
  GRADIENTS,
  SHADOWS,
} from '@/styles/designTokens'

// ── 공통 그라데이션 헤더 스타일 (single source of truth) ──
//   디자인 토큰 (GRADIENTS / BORDERS / SHADOWS) 에서 가져옴.
const HEADER_STYLE_BASE: CSSProperties = {
  border: BORDERS.panelHeader,
  background: GRADIENTS.panelHeader,
  boxShadow: SHADOWS.panelHeader,
}

interface PanelRootProps {
  children?: ReactNode
  width?: number | string
  height?: number | string
  /** wrapper className 확장 (예: 'shrink-0', 'self-stretch') */
  className?: string
  /** wrapper style 확장 */
  style?: CSSProperties
}

function PanelRoot({
  children,
  width,
  height,
  className,
  style,
}: PanelRootProps) {
  return (
    <div
      className={['flex flex-col', className].filter(Boolean).join(' ')}
      style={{ width, height, ...style }}
    >
      {children}
    </div>
  )
}

interface PanelHeaderProps {
  children?: ReactNode
  width?: number | string
  height?: number | string
  /** border-radius (예: '16px 16px 0 0' 위 모서리만) */
  borderRadius?: string | number
  /** 추가 padding */
  padding?: string | number
  /** className 확장 */
  className?: string
  /** style 확장 — base 스타일 위에 override 가능 */
  style?: CSSProperties
}

function PanelHeader({
  children,
  width,
  height,
  borderRadius,
  padding,
  className,
  style,
}: PanelHeaderProps) {
  return (
    <div
      className={[
        'relative flex items-center justify-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width,
        height,
        borderRadius,
        padding,
        ...HEADER_STYLE_BASE,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

interface PanelBodyProps {
  children?: ReactNode
  width?: number | string
  height?: number | string
  /** className 확장 (default 'flex flex-col items-start') */
  className?: string
  /** style 확장 */
  style?: CSSProperties
}

function PanelBody({
  children,
  width,
  height,
  className,
  style,
}: PanelBodyProps) {
  return (
    <div
      className={[
        'flex flex-col items-start',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width, height, ...style }}
    >
      {children}
    </div>
  )
}

// Compound — Panel.Header / Panel.Body 로 접근.
export const Panel = Object.assign(PanelRoot, {
  Header: PanelHeader,
  Body: PanelBody,
})
