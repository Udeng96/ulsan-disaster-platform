// 센서 고르기 목록 — 계측 차트 제목 아래에 펼친다 (수정 14, 옛 왼쪽 줄 화살표 목록과 같은 모양).
//   6개 넘으면 오른쪽 손잡이로 스크롤
import { useRef } from 'react'
import type { SlopeRiskLevel } from '@/features/menus/steep-slope/data'
import { RISK_TO_VARIANT } from '@/features/menus/steep-slope/variants'
import { cn, ScrollBar } from '@/shared/ui'
import { RISK_FILL } from './colors'

export interface SensorOption {
  name: string
  /** 없으면 점 없이 ('전체') */
  risk?: SlopeRiskLevel
  selected: boolean
}

export function Caret({ open }: { open: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className={cn('shrink-0 transition-turn', open && 'rotate-180')}>
      <path d="M8.5 11.0938L12 14.5938L15.5 11.0938" className="stroke-neutral-100" strokeWidth="1.3125" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SensorDropdown({ options, onPick }: { options: SensorOption[]; onPick: (i: number) => void }) {
  const listRef = useRef<HTMLDivElement>(null)
  return (
    <div role="listbox" className="absolute top-full left-0 z-10 mt-1 inline-flex items-start gap-2 rounded-xl border border-primary bg-neutral-800 p-3">
      <div ref={listRef} className="flex max-h-48 flex-col items-stretch justify-start overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.map((o, i) => (
          <button
            key={o.name}
            type="button"
            role="option"
            aria-selected={o.selected}
            onClick={() => onPick(i)}
            className={cn('flex items-center gap-2.5 rounded px-3 py-2 font-sans text-[15px] leading-4 font-medium whitespace-nowrap text-white hover:bg-neutral-450', o.selected && 'bg-neutral-450')}
          >
            {o.risk ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                <circle cx="5" cy="5" r="5" className={RISK_FILL[RISK_TO_VARIANT[o.risk]]} />
              </svg>
            ) : (
              <span className="size-2.5" aria-hidden />
            )}
            {o.name}
          </button>
        ))}
      </div>
      <ScrollBar target={listRef} axis="y" />
    </div>
  )
}
