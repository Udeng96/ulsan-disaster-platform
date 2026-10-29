import type { ReactNode } from 'react'
import { Panel } from '@/components/layout/Panel'

// 메뉴 active 시 우측 사이드 패널 — 4개 메뉴 (배수펌프장 / 급경사지 / 지진가속도 / 레이어) 공통 wrapper.
// wrapper W 480×840, header W 480×56 (Panel.Header), body W 480×784.
interface SidePanelProps {
  title: string
  children?: ReactNode
  /** 패널 폭 (default 480). 급경사지는 568. */
  width?: number
  /** 헤더 높이 (default 56). 급경사지는 54.539. */
  headerHeight?: number
}

export function SidePanel({
  title,
  children,
  width = 480,
  headerHeight = 56,
}: SidePanelProps) {
  return (
    <Panel
      width={`${width}px`}
      // 높이는 레이아웃에 맡긴다 — px 로 잡으면 헤더 자리 애니메이션과 따로 논다.
      height="100%"
      className="items-center justify-center overflow-hidden"
      style={{
        borderRadius: '20px',
        // 폭은 슬롯(자리) 과 같은 곡선·시점으로 — 없으면 뚝 하고 바뀐다.
        transition:
          'width 0.45s cubic-bezier(0.33, 1, 0.68, 1) var(--map-shift-delay, 0s)',
      }}
    >
      <Panel.Header
        width={`${width}px`}
        height={`${headerHeight}px`}
        padding="9px 0 4.5px 0"
        borderRadius="16px 16px 0 0"
        style={{
          flexShrink: 0,
          transition:
            'width 0.45s cubic-bezier(0.33, 1, 0.68, 1) var(--map-shift-delay, 0s)',
        }}
      >
        <h2
          className="font-display"
          style={{
            color: '#F4F8FB',
            WebkitTextStrokeWidth: '1px',
            WebkitTextStrokeColor: '#003060',
            fontSize: '30px',
            fontWeight: 700,
            lineHeight: '32px',
          }}
        >
          {title}
        </h2>
      </Panel.Header>
      <Panel.Body
        width={`${width}px`}
        style={{
          flex: '1 0 0',
          minHeight: 0,
          transition:
            'width 0.45s cubic-bezier(0.33, 1, 0.68, 1) var(--map-shift-delay, 0s)',
        }}
      >
        {children}
      </Panel.Body>
    </Panel>
  )
}
