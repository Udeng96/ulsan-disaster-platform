// 섹션 카드 — 좌측 패널의 "위성 지도", "재난 방송" 카드.
//   바깥 폭 424, 헤더·본문 폭 464 (시안대로 오른쪽으로 40px 넘친다), 헤더 높이 56 + 우상단 확대 버튼.
import type { ReactNode } from 'react'
import { ExpandButton } from './ExpandButton'
import { Panel, PanelBody, PanelHeader } from './Panel'

interface Props {
  title: string
  bodyHeight?: number
  bodyBackground?: string
  onExpand?: () => void
  children?: ReactNode
}

export function SectionCard({ title, bodyHeight = 219, bodyBackground, onExpand, children }: Props) {
  return (
    <Panel className="w-[424px]">
      <div style={{ height: 56 + bodyHeight }} className="flex flex-col">
        <PanelHeader className="h-14 w-[464px] shrink-0 rounded-t-2xl pt-[9px] pb-[4.5px]">
          <span className="text-center font-display text-h3 leading-8 text-neutral-50 [-webkit-text-stroke:1px_var(--color-neutral-500)]">
            {title}
          </span>
          <ExpandButton onClick={onExpand} className="absolute! top-3 right-3" />
        </PanelHeader>
        <PanelBody
          className="w-[464px] bg-cover bg-center"
          style={{ height: bodyHeight, backgroundImage: bodyBackground ? `url('${bodyBackground}')` : undefined }}
        >
          {children}
        </PanelBody>
      </div>
    </Panel>
  )
}
