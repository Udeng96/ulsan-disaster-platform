// 우측 IP wall 패널 — W 480 × H 1080. 좌측 패널 mirror 구조.
// 상단 헤더 영역 + 배수펌프장 영역 (PumpStationSection 안에 헤더+바디+하단 3 column 묶임).

import { COLORS } from '@/styles/designTokens'
import { Panel } from '@/components/layout/Panel'
import { PumpStationSection } from './PumpStationSection'

export function RightPanel() {
  return (
    <div
      className="relative"
      style={{
        width: '480px',
        height: '1080px',
        // 가운데 대시보드와 같은 단색 배경 (Neutral-900).
        background: COLORS.neutral900,
      }}
    >
      {/* 헤더 영역 — W 480 H 120, padding 8/16/8/0, items-center, relative (안 헤더 absolute) */}
      <div
        className="relative flex items-center"
        style={{
          width: '480px',
          height: '120px',
          padding: '8px 16px 8px 0',
        }}
      >
        {/* 안 헤더 — W 504 H 104, absolute top 8 right 16, radius 0 16 16 0.
            메인 헤더와 동일한 배경/border/shadow — Panel.Header 공통 스타일. */}
        <Panel.Header
          width="504px"
          height="104px"
          borderRadius="0 16px 16px 0"
          style={{
            position: 'absolute',
            top: '8px',
            right: '16px',
            border: 'none',
          }}
        />
      </div>

      <PumpStationSection />
    </div>
  )
}
