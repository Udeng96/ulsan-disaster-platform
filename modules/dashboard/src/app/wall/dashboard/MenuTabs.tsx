// 메뉴 버튼 줄 (1920×120) — 7개. 같은 메뉴를 다시 누르면 꺼진다.
import { memo } from 'react'
import { cn } from '@/shared/ui'
import { dash, MENUS, selectMenu } from './state'

const MenuButton = memo(function MenuButton({ idx, label, active }: { idx: number; label: string; active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => selectMenu(idx)}
      className="group relative flex h-[104px] w-[264px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-none bg-transparent p-0 outline-none"
    >
      {active && <span className="absolute top-1/2 left-1/2 z-0 size-[400%] -translate-1/2 animate-menu-spin bg-menu-glow" />}
      <span className={cn('absolute inset-[3px] z-[1] overflow-hidden rounded-[13px]', active ? 'bg-menu-active' : 'bg-menu-idle group-hover:bg-neutral-450 group-hover:bg-none')}>
        {active && <span className="pointer-events-none absolute top-1/2 left-1/2 z-0 size-[400%] -translate-1/2 animate-menu-spin bg-menu-shimmer" />}
      </span>
      <span className="relative z-[2] font-sans text-[42px] leading-[42px] font-semibold text-white">{label}</span>
    </button>
  )
})

export function MenuTabs() {
  const menu = dash.use((s) => s.menu)
  return (
    // gap 6 — 알약이 안쪽 3px 에 그려져 보이는 간격은 12
    <nav className="flex h-[120px] w-[1920px] shrink-0 items-center justify-center gap-1.5 px-[18px] py-2">
      {MENUS.map((label, i) => (
        <MenuButton key={label} idx={i} label={label} active={i === menu} />
      ))}
    </nav>
  )
}
