// 빈 데이터 · 불러오는 중 · 오류 안내 — 가운데 흐린 글씨 한 줄.
//   크기·색이 메뉴마다 조금씩 달라서 기본(Roboto 16/500, 흰 45%)에 className 으로 덮어쓴다.
import { memo, type ReactNode } from 'react'
import { cn } from './cn'

export type StateKind = 'empty' | 'loading' | 'error'

export const StateMessage = memo(function StateMessage({ kind = 'empty', children, className }: { kind?: StateKind; children: ReactNode; className?: string }) {
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      data-kind={kind}
      className={cn('flex min-h-10 flex-[1_0_0] items-center justify-center self-stretch font-sans text-[16px] font-medium text-white/45', className)}
    >
      {children}
    </div>
  )
})
