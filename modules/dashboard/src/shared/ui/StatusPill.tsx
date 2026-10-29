// 상태 pill 50×32 — 우측 패널 육갑문·급경사지 칸의 상태 숫자.
import { memo } from 'react'
import { cn } from './cn'

export type PillStatus = 'normal' | 'warning' | 'caution' | 'critical'

const BG: Record<PillStatus, string> = {
  normal: 'bg-accent-green',
  warning: 'bg-accent-yellow',
  caution: 'bg-accent-orange',
  critical: 'bg-accent-red',
}

export const StatusPill = memo(function StatusPill({ status, children }: { status: PillStatus; children: React.ReactNode }) {
  return (
    <div data-status={status} className={cn('flex h-8 w-[50px] items-center justify-center rounded-[99px] border border-line-pill', BG[status])}>
      <span className="text-center text-b4 leading-4 whitespace-pre-line text-white">{children}</span>
    </div>
  )
})
