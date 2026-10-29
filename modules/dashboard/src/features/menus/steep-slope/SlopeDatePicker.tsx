// 기간설정 datepicker — 시작/끝 달력 2개 (442×276).
//   좌: 시작 월, 우: 끝 월. 날짜를 두 번 눌러 [시작, 끝] 범위를 정한다.

import { useEffect, useRef, useState } from 'react'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}
/** 올해 1월 1일 — 선택 가능 하한. */
function yearStart(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1)
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

/** 달력 격자 (해당 월 주 단위, 앞뒤 달 날짜 포함). */
function monthGrid(base: Date): Date[][] {
  const first = new Date(base.getFullYear(), base.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = new Date(start)
      day.setDate(start.getDate() + w * 7 + d)
      return day
    }),
  )
}

function ArrowIcon({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      style={dir === 'next' ? { transform: 'rotate(180deg)' } : undefined}
    >
      <g opacity="0.9">
        <rect
          x="24"
          width="24"
          height="24"
          rx="12"
          transform="rotate(90 24 0)"
          fill="white"
          fillOpacity="0.08"
        />
        <rect
          x="23.5"
          y="0.5"
          width="23"
          height="23"
          rx="11.5"
          transform="rotate(90 23.5 0.5)"
          stroke="white"
          strokeOpacity="0.16"
        />
      </g>
      <path
        d="M12.9062 8.5L9.40625 12L12.9062 15.5"
        stroke="#DCE6EE"
        strokeWidth="1.3125"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MonthPanel({
  base,
  side,
  start,
  end,
  onPick,
  onPrev,
  onNext,
  nextDisabled,
  prevDisabled,
}: {
  base: Date
  /** 좌(이전 달) / 우(이번 달) — 화살표 위치만 다르다. */
  side: 'start' | 'end'
  start: Date | null
  end: Date | null
  onPick: (d: Date) => void
  onPrev: () => void
  onNext: () => void
  nextDisabled: boolean
  prevDisabled: boolean
}) {
  const today = startOfDay(new Date())
  // 선택 가능 범위 — 미래 불가, 올해 1월 1일 이전 불가 (월별 추이가 올해 기준).
  const disabled = (day: Date) => {
    const d = startOfDay(day)
    return d > today || d < yearStart(today)
  }
  const cellClass = (day: Date) => {
    const classes = ['slope-date-cell']
    if (day.getMonth() !== base.getMonth()) classes.push('is-other')
    if (start && sameDay(day, start)) classes.push('is-start')
    if (end && sameDay(day, end)) classes.push('is-end')
    if (start && end && day > startOfDay(start) && day < startOfDay(end))
      classes.push('is-in-range')
    if (sameDay(day, today)) classes.push('is-today')
    if (disabled(day)) classes.push('is-disabled')
    return classes.join(' ')
  }

  return (
    <div className={`slope-date-month is-${side}`}>
      {/* 헤더 — 바깥쪽에만 화살표 (좌 패널 = 이전, 우 패널 = 다음). */}
      <div className="slope-date-head">
        {side === 'start' ? (
          <button type="button" onClick={onPrev} disabled={prevDisabled}>
            <ArrowIcon dir="prev" />
          </button>
        ) : (
          <span className="slope-date-arrow-space" />
        )}
        <div className="slope-date-ym">
          {base.getFullYear()}년 {base.getMonth() + 1}월
        </div>
        {side === 'end' ? (
          <button type="button" onClick={onNext} disabled={nextDisabled}>
            <ArrowIcon dir="next" />
          </button>
        ) : (
          <span className="slope-date-arrow-space" />
        )}
      </div>
      <div className="slope-date-calendar">
        <div className="slope-date-week">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="slope-date-cell is-weekday">
              {w}
            </span>
          ))}
        </div>
        {monthGrid(base).map((week, i) => (
          <div key={i} className="slope-date-week">
            {week.map((day) =>
              // 지난달 / 다음달 날짜는 빈 칸으로 (자리는 유지).
              day.getMonth() !== base.getMonth() ? (
                <span key={day.toISOString()} className="slope-date-cell" />
              ) : (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={cellClass(day)}
                  disabled={disabled(day)}
                  onClick={() => onPick(day)}
                >
                  {day.getDate()}
                </button>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface Props {
  start: Date | null
  end: Date | null
  onChange: (start: Date | null, end: Date | null) => void
  /** 바깥 클릭 시 닫기. */
  onClose?: () => void
}

export function SlopeDatePicker({ start, end, onChange, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!onClose) return
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current
      // 기간설정 버튼(부모) 클릭은 버튼 쪽 토글이 처리.
      if (el && !el.contains(e.target as Node) && !el.parentElement?.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])
  // 오른쪽이 기준 달, 왼쪽은 그 전달. 화살표를 누르면 둘 다 함께 이동.
  const [rightBase, setRightBase] = useState(
    () => new Date((end ?? new Date()).getFullYear(), (end ?? new Date()).getMonth(), 1),
  )
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  // 왼쪽이 올해 1월보다 앞서지 않게 (오른쪽 기준 2월).
  const minRightBase = new Date(now.getFullYear(), 1, 1)
  const leftBase = addMonths(rightBase, -1)

  // 시작 → 끝 순서로 채우고, 둘 다 있으면 새 선택이 시작이 된다.
  const pick = (d: Date) => {
    const next = startOfDay(d)
    if (!start || (start && end)) return onChange(next, null)
    if (next < start) return onChange(next, start)
    onChange(start, next)
  }

  return (
    <div className="slope-date-picker" ref={rootRef}>
      <MonthPanel
        base={leftBase}
        side="start"
        start={start}
        end={end}
        onPick={pick}
        onPrev={() => setRightBase(addMonths(rightBase, -1))}
        onNext={() => setRightBase(addMonths(rightBase, 1))}
        nextDisabled={rightBase >= thisMonth}
        prevDisabled={rightBase <= minRightBase}
      />
      <MonthPanel
        base={rightBase}
        side="end"
        start={start}
        end={end}
        onPick={pick}
        onPrev={() => setRightBase(addMonths(rightBase, -1))}
        onNext={() => setRightBase(addMonths(rightBase, 1))}
        nextDisabled={rightBase >= thisMonth}
        prevDisabled={rightBase <= minRightBase}
      />
    </div>
  )
}
