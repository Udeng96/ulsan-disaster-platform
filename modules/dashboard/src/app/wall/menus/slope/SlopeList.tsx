// 급경사지 총괄·관제 — 우측 패널 본문 (568×617). 검색 → 결과 개수 → 목록(머리 + 스크롤).
//   검색은 Enter·찾기 때만 걸린다. 등급·관리기관·관리부서는 머리의 화살표로 고른다.
//   줄을 누르면 지도가 그 관리지역으로 간다 (다시 누르면 해제).
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/shared/ui'
import type { ManagedArea } from './api'
import { managedAreas } from './data'
import { focusSlope, slope } from './state'

type FilterKey = 'grade' | 'agency' | 'dept'
const GRADES = ['전체', 'A', 'B', 'C', 'D', 'E'] as const
/** 등급 A~E → 위험도 5단계 색 */
const GRADE_COLOR: Record<string, string> = { A: 'accent-green', B: 'accent-teal', C: 'accent-yellow', D: 'accent-orange', E: 'accent-red' }
/** 등급 배지 바탕 — 단계 색 70% 를 흰 바탕(bg-white)에 얹는다 */
function gradeTint(grade: string | null) {
  const c = `color-mix(in srgb, var(--color-${(grade && GRADE_COLOR[grade]) || 'primary'}) 70.2%, transparent)`
  return { backgroundImage: `linear-gradient(${c}, ${c})` }
}

/** 고를 값 — '전체' + 겹치지 않게 (빈 값 빼고) */
function distinct(values: (string | null)[]): string[] {
  const set = new Set<string>()
  for (const v of values) {
    const t = v?.trim()
    if (t) set.add(t)
  }
  return ['전체', ...[...set].sort()]
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="drop-shadow-[0_0_0.75px_color-mix(in_srgb,black_16%,transparent)]">
      <path
        d="M9.86523 2.75098C13.4444 2.93254 16.291 5.89232 16.291 9.5166L16.2822 9.86523C16.2085 11.3189 15.6759 12.6513 14.8271 13.7217L17.8105 16.7061C18.1155 17.0112 18.1156 17.5055 17.8105 17.8105C17.5055 18.1156 17.0112 18.1155 16.7061 17.8105L13.7217 14.8271C12.5663 15.7433 11.1055 16.291 9.5166 16.291L9.16797 16.2822C5.70414 16.1068 2.92668 13.329 2.75098 9.86523L2.74219 9.5166C2.74219 5.77532 5.77532 2.74219 9.5166 2.74219L9.86523 2.75098ZM9.5166 4.4043C6.69349 4.4043 4.4043 6.69349 4.4043 9.5166C4.40442 12.3396 6.69356 14.6279 9.5166 14.6279C12.3395 14.6278 14.6278 12.3395 14.6279 9.5166C14.6279 6.69356 12.3396 4.40442 9.5166 4.4043Z"
        className="fill-white"
      />
    </svg>
  )
}

function Caret() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8.5 11.0938L12 14.5938L15.5 11.0938" className="stroke-neutral-100" strokeWidth="1.3125" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const text = 'h-8 shrink-0 pr-1 font-sans text-[16px] leading-[18px] font-medium text-white'
const cell = `${text} flex flex-col items-start justify-center gap-2.5 py-[7px]`
const headCell = `${text} relative flex items-center justify-center py-[7px]`
const gradeCell = `${text} flex flex-col items-start justify-center gap-2.5`
const ellipsis = 'block w-full truncate'

/** 머리 화살표를 누르면 뜨는 값 고르기 (진짜 select 아님). wide: 값이 길어 폭을 내용에 맞춤 */
function FilterLayer({ options, selected, onSelect, wide, right }: { options: readonly string[]; selected: string; onSelect: (v: string) => void; wide?: boolean; right?: boolean }) {
  return (
    <div
      role="listbox"
      className={cn(
        'absolute top-full z-[5] flex items-start gap-2 rounded-xl border border-primary bg-neutral-800 p-3',
        wide ? 'w-max max-w-60 min-w-[100px]' : 'w-[100px]',
        right ? 'right-0' : 'left-0',
      )}
    >
      <div className={cn('flex flex-[1_0_0] flex-col items-center', wide ? 'max-h-72 justify-start overflow-y-auto' : 'h-48 justify-between')}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="option"
            aria-selected={o === selected}
            onClick={() => onSelect(o)}
            className={cn(
              'flex flex-col items-start gap-2.5 self-stretch rounded px-3 py-2 text-left font-sans text-[15px] leading-4 font-medium hover:bg-neutral-450',
              o === selected ? 'text-primary' : 'text-white',
              wide && 'whitespace-nowrap',
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

/** active: 걸러 보기가 걸린 칸 — 제목 글자만 하늘색 (수정사항 27번, 10-21) */
function HeadCell({ label, width, open, active, onToggle, children }: { label: string; width: number; open?: boolean; active?: boolean; onToggle?: () => void; children?: ReactNode }) {
  return (
    <div className={headCell} style={{ width }}>
      {/* 한글이 위로 떠 보여 2px 내림 (화살표는 그대로) */}
      <span className={cn('relative top-0.5', active && 'text-primary')}>{label}</span>
      {onToggle && (
        <button type="button" aria-label={`${label} 고르기`} aria-expanded={open} onClick={onToggle} className={cn('flex size-6 shrink-0 items-center justify-center transition-turn', open && 'rotate-180')}>
          <Caret />
        </button>
      )}
      {open && children}
    </div>
  )
}

const Row = memo(function Row({ r, active }: { r: ManagedArea; active: boolean }) {
  return (
    <div
      role="row"
      aria-selected={active}
      onClick={() =>
        // 같은 줄을 다시 누르면 해제. 좌표 없는 곳은 지도를 움직이지 않는다
        focusSlope(active || r.lat === null || r.lng === null ? null : { name: r.name, lng: r.lng, lat: r.lat, managedAreaId: r.id })
      }
      className={cn(
        'flex w-[526px] cursor-pointer items-center bg-row-dim px-4 py-1',
        active ? 'rounded-lg bg-row-hover shadow-[inset_0_0_0_2px_var(--color-primary-light)]' : 'hover:rounded-lg hover:bg-row-hover hover:shadow-[inset_0_0_0_1px_var(--color-primary)]',
      )}
    >
      <div className={cell} style={{ width: 138 }}>
        <span className={ellipsis} title={r.name}>
          {r.name}
        </span>
      </div>
      {/* 등급 배지는 머리 '등급' 글씨와 같은 선에서 시작 */}
      <div className={gradeCell} style={{ width: 65 }}>
        <span className="flex h-6 w-[34px] items-center justify-center rounded-[100px] border border-black/5 bg-white px-3 py-1 font-sans text-[14px] leading-4 font-medium text-white" style={gradeTint(r.grade)}>
          <span className="relative top-px">{r.grade}</span>
        </span>
      </div>
      <div className={cell} style={{ width: 158 }}>
        <span className={ellipsis} title={r.org ?? ''}>
          {r.org}
        </span>
      </div>
      <div className={cell} style={{ width: 134 }}>
        <span className={ellipsis} title={r.department ?? ''}>
          {r.department}
        </span>
      </div>
    </div>
  )
})

function ResetIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2.2 6a3.8 3.8 0 1 0 1.1-2.7M2 1.8v2.1h2.1" className="stroke-current" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SlopeList() {
  const areas = managedAreas.use()
  const activeId = slope.use((s) => s.focus?.managedAreaId ?? null)
  const [input, setInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [grade, setGrade] = useState('전체')
  const [org, setOrg] = useState('전체')
  const [dept, setDept] = useState('전체')

  const orgOptions = useMemo(() => distinct(areas.map((a) => a.org)), [areas])
  // 관리부서는 고른 관리기관의 부서만
  const deptOptions = useMemo(() => distinct(areas.filter((a) => org === '전체' || a.org === org).map((a) => a.department)), [areas, org])

  const rows = useMemo(() => {
    const kw = keyword.trim()
    return areas.filter(
      (a) =>
        (grade === '전체' || a.grade === grade) &&
        (org === '전체' || a.org === org) &&
        (dept === '전체' || a.department === dept) &&
        (!kw || a.name.includes(kw) || a.mgmtNo.includes(kw)),
    )
  }, [areas, keyword, grade, org, dept])

  // 머리 값 고르기 — 한 번에 하나만, 바깥을 누르면 닫힘
  const [open, setOpen] = useState<FilterKey | null>(null)
  const toggle = (k: FilterKey) => setOpen((p) => (p === k ? null : k))
  const headRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!headRef.current?.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  const filtered = keyword !== '' || input !== '' || grade !== '전체' || org !== '전체' || dept !== '전체'
  const resetFilters = () => {
    setInput('')
    setKeyword('')
    setGrade('전체')
    setOrg('전체')
    setDept('전체')
    setOpen(null)
  }
  const pick = (set: (v: string) => void) => (v: string) => {
    set(v)
    setOpen(null)
  }

  return (
    <div className="flex h-[617.461px] w-[568px] flex-col items-start gap-3 py-5 pr-3 pl-5">
      <div className="flex h-12 shrink-0 items-center justify-between self-stretch rounded-[99px] bg-white/10 pr-5 pl-6">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setKeyword(input)}
          placeholder="급경사지 검색"
          className="w-auto min-w-0 flex-auto border-0 bg-transparent text-left font-sans text-[16px] leading-5 font-medium text-white outline-none placeholder:text-white placeholder:opacity-75 focus:placeholder:opacity-0"
        />
        <button type="button" aria-label="찾기" onClick={() => setKeyword(input)} className="flex size-5 shrink-0 items-center justify-center">
          <SearchIcon />
        </button>
      </div>

      <div className="flex h-[18px] items-center justify-between gap-1.5 self-stretch font-sans text-[12px] leading-[14px] font-medium text-neutral-200">
        <span>
          {grade}등급 {rows.length}개소 표시 중
        </span>
        {/* 검색어·등급·관리기관·관리부서를 한 번에 처음으로 (수정사항 11번, 10-16) — 걸린 조건이 없으면 흐리게 */}
        <button
          type="button"
          onClick={resetFilters}
          disabled={!filtered}
          className="flex items-center gap-1 rounded-[99px] px-1.5 py-0.5 text-neutral-200 hover:bg-white/10 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ResetIcon />
          조건 초기화
        </button>
      </div>

      <div className="flex h-[483.461px] flex-col items-start self-stretch">
        <div ref={headRef} className="flex items-center self-stretch rounded-t-md bg-neutral-800 px-5">
          <HeadCell label="급경사지명" width={128} />
          <HeadCell label="등급" width={65} open={open === 'grade'} active={grade !== '전체'} onToggle={() => toggle('grade')}>
            <FilterLayer options={GRADES} selected={grade} onSelect={pick(setGrade)} />
          </HeadCell>
          <HeadCell label="관리기관" width={158} open={open === 'agency'} active={org !== '전체'} onToggle={() => toggle('agency')}>
            <FilterLayer
              wide
              options={orgOptions}
              selected={org}
              onSelect={pick((v) => {
                setOrg(v)
                // 고른 부서가 그 기관에 없으면 부서도 '전체'로
                if (v !== '전체' && !areas.some((a) => a.org === v && a.department?.trim() === dept)) setDept('전체')
                // 기관을 '전체'로 되돌리면 등급도 처음으로
                if (v === '전체') setGrade('전체')
              })}
            />
          </HeadCell>
          <HeadCell label="관리부서" width={134} open={open === 'dept'} active={dept !== '전체'} onToggle={() => toggle('dept')}>
            <FilterLayer wide right options={deptOptions} selected={dept} onSelect={pick(setDept)} />
          </HeadCell>
        </div>
        <div role="table" aria-label="급경사지 목록" className="flex-[1_0_0] self-stretch overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:h-10 [&::-webkit-scrollbar-thumb]:rounded-lg [&::-webkit-scrollbar-thumb]:bg-white/25 [&::-webkit-scrollbar-track]:bg-transparent">
          {rows.length === 0 && (
            <div className="flex size-full items-center justify-center font-sans text-[16px] font-medium text-white/45">검색 조건에 해당하는 결과가 없습니다</div>
          )}
          {rows.map((r) => (
            <Row key={r.id} r={r} active={r.id === activeId} />
          ))}
        </div>
      </div>
    </div>
  )
}
