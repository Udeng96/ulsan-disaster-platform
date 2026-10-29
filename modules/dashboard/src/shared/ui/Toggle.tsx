// 켜고 끄는 스위치 40×24 — 레이어 '라벨보기' 등. 꺼짐 회색 바탕·흐린 원, 켜짐 파란 바탕·흰 원.
import { memo } from 'react'
import { cn } from './cn'

export const Toggle = memo(function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn('relative h-6 w-10 shrink-0 rounded-[99px] p-0.5 transition-ui-slow', on ? 'bg-primary' : 'bg-neutral-450')}
    >
      {/* 동그라미는 자리(left)를 바꾸지 않고 옮긴다(translate) — 화면 배치를 다시 계산하지 않게 */}
      <span className={cn('absolute top-0.5 left-0.5 block size-[22px] transition-turn', on && 'translate-x-4')}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <circle cx="10" cy="10" r="10" className={on ? 'fill-white' : 'fill-neutral-200'} opacity={on ? 1 : 0.75} style={{ filter: 'drop-shadow(1px 1px 0.5px color-mix(in srgb, var(--color-black) 4%, transparent))' }} />
        </svg>
      </span>
    </button>
  )
})
