// 기간설정 달력 (442×276) — 왼쪽 전달·오른쪽 기준 달. 날짜를 두 번 눌러 기간을 정한다.
//   미래와 올해 1월 1일 이전은 못 고른다 (월별 추이가 올해 기준). 바깥을 누르면 닫힌다.
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/ui'
import { addMonths, monthGrid, pickRange, sameDay, startOfDay } from './dates'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

function Arrow({ next }: { next?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className={next ? 'rotate-180' : undefined}>
      <g opacity="0.9">
        <rect x="24" width="24" height="24" rx="12" transform="rotate(90 24 0)" className="fill-white" fillOpacity="0.08" />
        <rect x="23.5" y="0.5" width="23" height="23" rx="11.5" transform="rotate(90 23.5 0.5)" className="stroke-white" strokeOpacity="0.16" />
      </g>
      <path d="M12.9062 8.5L9.40625 12L12.9062 15.5" className="stroke-neutral-100" strokeWidth="1.3125" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const cellBase = 'flex w-7 flex-col items-center justify-center gap-2 p-1.5 font-sans text-[12px] leading-[14px] font-medium'

function Month({ base, side, start, end, onPick, onMove, prevOff, nextOff }: { base: Date; side: 'start' | 'end'; start: Date | null; end: Date | null; onPick: (d: Date) => void; onMove: (n: number) => void; prevOff: boolean; nextOff: boolean }) {
  const today = startOfDay(new Date())
  const minDay = new Date(today.getFullYear(), 0, 1)
  const off = (d: Date) => startOfDay(d) > today || startOfDay(d) < minDay
  const arrowBtn = 'shrink-0 leading-none disabled:cursor-default disabled:opacity-30'
  return (
    <div className={cn('flex h-full w-[220px] shrink-0 flex-col items-center justify-center gap-2 bg-neutral-800 p-3 shadow-date-picker', side === 'start' ? 'rounded-l-xl' : 'rounded-r-xl border-l border-primary')}>
      {/* 바깥쪽에만 화살표 (왼쪽 = 이전, 오른쪽 = 다음) */}
      <div className="flex items-center justify-between self-stretch">
        {side === 'start' ? (
          <button type="button" aria-label="이전 달" className={arrowBtn} onClick={() => onMove(-1)} disabled={prevOff}>
            <Arrow />
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}
        <div className="flex-[1_0_0] text-center font-sans text-[16px] leading-5 font-medium text-white">
          {base.getFullYear()}년 {base.getMonth() + 1}월
        </div>
        {side === 'end' ? (
          <button type="button" aria-label="다음 달" className={arrowBtn} onClick={() => onMove(1)} disabled={nextOff}>
            <Arrow next />
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}
      </div>
      <div className="flex w-[196px] flex-col items-start gap-1">
        <div className="flex items-center">
          {WEEKDAYS.map((w) => (
            <span key={w} className={cn(cellBase, 'text-white')}>
              {w}
            </span>
          ))}
        </div>
        {monthGrid(base).map((week, i) => (
          <div key={i} className="flex items-center">
            {week.map((day) => {
              // 앞뒤 달 날짜는 빈칸 (자리는 둔다)
              if (day.getMonth() !== base.getMonth()) return <span key={day.toISOString()} className={cellBase} />
              const isStart = !!start && sameDay(day, start)
              const isEnd = !!end && sameDay(day, end)
              const inRange = !!start && !!end && day > startOfDay(start) && day < startOfDay(end)
              const disabled = off(day)
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isStart || isEnd}
                  onClick={() => onPick(day)}
                  className={cn(
                    cellBase,
                    'enabled:hover:rounded enabled:hover:shadow-[inset_0_0_0_1px_var(--color-primary)]',
                    isStart || isEnd ? 'bg-primary text-white' : sameDay(day, today) ? 'text-primary-dark' : 'text-white',
                    isStart && 'rounded-l',
                    isEnd && 'rounded-r',
                    inRange && 'bg-neutral-450',
                    disabled && 'cursor-default opacity-40',
                  )}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export function DateRangePicker({ start, end, onChange, onClose }: { start: Date | null; end: Date | null; onChange: (start: Date, end: Date | null) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = ref.current
      // 기간설정 버튼(부모 줄) 누름은 버튼 쪽에서 여닫는다
      if (el && !el.contains(e.target as Node) && !el.parentElement?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  // 오른쪽이 기준 달, 왼쪽은 그 전달 — 화살표로 둘이 같이 움직인다
  const [right, setRight] = useState(() => {
    const d = end ?? new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  // 왼쪽이 올해 1월보다 앞서지 않게 (오른쪽 2월까지)
  const minRight = new Date(now.getFullYear(), 1, 1)
  const common = {
    start,
    end,
    onPick: (d: Date) => onChange(...pickRange(start, end, d)),
    onMove: (n: number) => setRight((r) => addMonths(r, n)),
    prevOff: right <= minRight,
    nextOff: right >= thisMonth,
  }
  return (
    <div ref={ref} role="dialog" aria-label="기간 고르기" className="absolute top-[calc(100%+8px)] left-0 z-20 flex h-[276px] w-[442px] items-center">
      <Month base={addMonths(right, -1)} side="start" {...common} />
      <Month base={right} side="end" {...common} />
    </div>
  )
}
