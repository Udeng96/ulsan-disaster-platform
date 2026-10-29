// 지도 오른쪽 CCTV 5칸 — 큰 칸 1 + 작은 칸 4 (2×2). 세로는 400 : 440 비율.
//   급경사지는 줄인 규격(512 폭, 헤더 32)이고 순번 배지가 없다 (순환이 없어서). 바뀔 때 폭은 지도 오른쪽과 같이 움직인다.
//   칸은 자기 CCTV 가 바뀔 때만 다시 그린다 — 30초 순환에도 그대로인 칸은 영상이 끊기지 않는다.
import { memo } from 'react'
import { cn, ExpandButton, NumberBadge } from '@/shared/ui'
import { cctv, dash, MENU, type CctvCell } from '../../dashboard/state'
import { Player } from './Player'

interface CellProps {
  cell: CctvCell
  main?: boolean
  compact: boolean
  badge: boolean
  /** 폭을 움직이는 중 (급경사지 들고 날 때) */
  resize: boolean
  /** 아래 줄 바깥 모서리 */
  corner?: 'left' | 'right'
}

const Cell = memo(
  function Cell({ cell, main, compact, badge, resize, corner }: CellProps) {
    const width = main ? (compact ? 'w-[512px]' : 'w-[640px]') : compact ? 'w-[256px]' : 'w-[320px]'
    const head = compact ? 'h-8' : 'h-10'
    return (
      <div
        className={cn(
          'relative flex h-full shrink-0 flex-col items-start overflow-hidden bg-neutral-700',
          width,
          resize && 'transition-resize',
          main && 'rounded-t-2xl shadow-cctv-main',
          corner === 'left' && 'rounded-bl-2xl',
          corner === 'right' && 'rounded-br-2xl',
        )}
      >
        <div className={cn(width, resize && 'transition-resize', compact ? 'mt-8 h-[calc(100%-32px)]' : 'mt-10 h-[calc(100%-40px)]')}>
          <Player cctvId={cell.cctvId} className={cn(width, resize && 'transition-resize', 'h-full')} />
        </div>
        <div className={cn('absolute top-0 left-0 flex items-center gap-1.5 border-b border-white/20 bg-neutral-800/80 px-3.5', width, resize && 'transition-resize', head)}>
          {badge && <NumberBadge number={cell.number} />}
          {/* 한 줄 — 넘치면 … . 한글이 위로 떠 보여 1px(배지 없으면 2px) 내린다 */}
          <span title={cell.name} className={cn('relative min-w-0 flex-[1_1_0] truncate font-sans text-[17px] leading-none font-medium text-white', compact ? 'top-0.5' : 'top-px')}>
            {cell.name}
          </span>
        </div>
        <div className="absolute right-3 bottom-3 flex">
          <ExpandButton variant="square" label="확장" onClick={() => dash.set({ modalCctv: cell })} />
        </div>
      </div>
    )
  },
  (a, b) => a.cell.number === b.cell.number && a.cell.name === b.cell.name && a.cell.cctvId === b.cell.cctvId && a.main === b.main && a.compact === b.compact && a.badge === b.badge && a.resize === b.resize && a.corner === b.corner,
)

export const CctvGrid = memo(function CctvGrid() {
  const compact = dash.use((s) => s.layoutMenu === MENU.slope)
  const resize = dash.use((s) => s.sliding)
  const cells = cctv.use((s) => s.cells)
  const hasCctv = cctv.use((s) => s.hasCctv)
  const badge = hasCctv && !compact
  const width = compact ? 'w-[512px]' : 'w-[640px]'
  return (
    <aside className={cn('flex h-full shrink-0 flex-col items-start [contain:layout_paint]', width, resize && 'transition-resize')}>
      <div className={cn('min-h-0 flex-[400_0_0]', width, resize && 'transition-resize')}>
        <Cell cell={cells[0]} main compact={compact} badge={badge} resize={resize} />
      </div>
      <div className={cn('grid min-h-0 flex-[440_0_0] grid-rows-2', compact ? 'grid-cols-[repeat(2,256px)]' : 'grid-cols-[repeat(2,320px)]', width, resize && 'transition-resize')}>
        {cells.slice(1).map((c, i) => (
          <Cell key={c.number} cell={c} compact={compact} badge={badge} resize={resize} corner={i === 2 ? 'left' : i === 3 ? 'right' : undefined} />
        ))}
      </div>
    </aside>
  )
})
