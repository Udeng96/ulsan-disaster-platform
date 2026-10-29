// 패널 — 헤더 띠(그라데이션) + 본문. 크기·모서리는 쓰는 곳에서 className 으로 정한다.
//   <Panel className="w-[424px]">
//     <PanelHeader className="h-14 w-[464px] rounded-t-2xl">제목</PanelHeader>
//     <PanelBody className="h-[219px] w-[464px]">...</PanelBody>
//   </Panel>
import type { ReactNode } from 'react'
import { cn } from './cn'

interface Props {
  children?: ReactNode
  className?: string
}

export function Panel({ children, className }: Props) {
  return <div className={cn('flex flex-col', className)}>{children}</div>
}

export function PanelHeader({ children, className }: Props) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center border-2 border-line-highlight bg-panel-header shadow-panel-header',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PanelBody({ children, className, style }: Props & { style?: React.CSSProperties }) {
  return (
    <div className={cn('flex flex-col items-start', className)} style={style}>
      {children}
    </div>
  )
}
