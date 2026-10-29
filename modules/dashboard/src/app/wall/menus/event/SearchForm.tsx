// 이벤트 검색 조건 — 발생 지역·이벤트 유형 고르기 칸(토큰 + 드롭다운 트리) + 조회 버튼.
import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn, countChecked, toggleNode, TreeSelect, type TreeNode } from '@/shared/ui'
import { allKeys, regionLeaves, regionTree, tokensOf, typeLeaves, typeTree, type Token } from './logic'
import { events, removeKey, search, setChecked, setOpenRow, type FilterRow } from './state'

const dot = <span className="size-[3px] shrink-0 bg-primary-light" />

function TokenChip({ token, row }: { token: Token; row: FilterRow }) {
  const key = token.key
  return (
    <div className="box-border inline-flex h-8 shrink-0 items-center gap-1 rounded-[6px] bg-token p-2 transition-colors hover:bg-token-hover">
      <span className="text-b5 text-white">{token.label}</span>
      {key && (
        <button
          type="button"
          onClick={() => removeKey(row, key)}
          aria-label={`${token.label} 삭제`}
          className="flex size-4 shrink-0 items-center justify-center rounded-lg border border-token-x bg-white/20"
        >
          <svg width="5" height="5" viewBox="0.6 0.6 5 5" fill="none" aria-hidden>
            <path d="M5.59961 0.599976L0.59961 5.59998M5.59961 5.59998L0.599609 0.599976" className="stroke-white" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}

/** 고른 칸 아래 드롭다운 — 트리 + '전체 해제 N' / '완료' */
function Dropdown({ row, data, checked }: { row: FilterRow; data: TreeNode[]; checked: ReadonlySet<string> }) {
  const count = countChecked(data, checked)
  const btn = 'flex h-10 max-w-[159px] flex-[1_0_0] items-center justify-center gap-2 rounded-lg disabled:opacity-30'
  return (
    <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-[1001]">
      <div className="flex flex-col items-start self-stretch overflow-hidden rounded-[10px] border border-primary-light bg-neutral-700">
        <div role="tree" aria-label={row === 'region' ? '발생 지역' : '이벤트 유형'} className="flex max-h-80 flex-col items-start self-stretch overflow-y-auto rounded-t-[4px] p-2 scroll-slim">
          <div className="flex w-full flex-col gap-1">
            <TreeSelect variant="dropdown" data={data} checked={checked} onToggle={(n) => setChecked(row, toggleNode(n, checked))} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 self-stretch rounded-b-[4px] border-t border-neutral-450 bg-neutral-700 px-4 py-2">
          <div className="flex gap-2 self-stretch">
            <button
              type="button"
              disabled={count === 0}
              onClick={() => setChecked(row, new Set())}
              className={cn(btn, 'border border-white/24 bg-white/8 px-2 enabled:hover:border-primary-dark/40 enabled:hover:bg-white/40')}
            >
              <span className="text-b3 text-neutral-50">전체 해제</span>
              <span className="text-b3 text-primary-light">{count}</span>
            </button>
            <button type="button" onClick={() => setOpenRow(null)} className={cn(btn, 'bg-primary-dark hover:bg-primary-light hover:shadow-button-hover')}>
              <span className="text-b3 text-white">완료</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface RowProps {
  row: FilterRow
  label: string
  placeholder: string
  data: TreeNode[]
  tokens: Token[]
  checked: ReadonlySet<string>
  /** 휴지통 — 이 칸만 '전체'로 */
  all: ReadonlySet<string>
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="stroke-white/70" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 4H13.5" />
      <path d="M6 4V2.75C6 2.34 6.34 2 6.75 2H9.25C9.66 2 10 2.34 10 2.75V4" />
      <path d="M3.75 4L4.5 13.25C4.53 13.67 4.88 14 5.3 14H10.7C11.12 14 11.47 13.67 11.5 13.25L12.25 4" />
      <path d="M6.5 6.75V11.25M9.5 6.75V11.25" />
    </svg>
  )
}

const Row = memo(function Row({ row, label, placeholder, data, tokens, checked, all }: RowProps) {
  // 조건이 걸려 있으면(전체가 아니면) 휴지통 (수정사항 16번, 10-19)
  const filtered = all.size > 0 && !(tokens.length === 1 && !tokens[0].key)
  const open = events.use((s) => s.openRow === row)
  // 칸을 넘친 토큰 수 → '+N'. 실제로 넘칠 때만 센다 (소수점 오차로 +1 이 뜨지 않게)
  const wrap = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState(0)
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el || !tokens.length || el.scrollWidth <= el.clientWidth) return setOverflow(0)
    const max = el.clientWidth
    setOverflow(Array.from(el.children as HTMLCollectionOf<HTMLElement>).filter((c) => c.offsetLeft + c.offsetWidth > max + 1).length)
  }, [tokens])

  return (
    <div className="flex w-[452px] items-center gap-4">
      <div className="flex w-[68px] shrink-0 items-center gap-1 whitespace-nowrap">
        {dot}
        <span className="text-b5 text-neutral-200">{label}</span>
      </div>
      <div
        className={cn(
          'relative box-border flex h-10 w-[358px] shrink-0 items-center justify-between gap-2 rounded-[10px] border py-1 pr-1.5 pl-1 transition-colors',
          open ? 'border-primary bg-neutral-700' : 'border-transparent bg-neutral-600 hover:bg-neutral-500',
        )}
      >
        <div className="flex items-center gap-1">
          <div ref={wrap} className={cn('flex shrink-0', filtered ? 'max-w-[236px]' : 'max-w-[272px]', 'flex-nowrap items-center gap-1 overflow-hidden')}>
            {tokens.length === 0 ? (
              <span className="px-1 text-b5 whitespace-nowrap text-white/40">{placeholder}</span>
            ) : (
              tokens.map((t) => <TokenChip key={t.label} token={t} row={row} />)
            )}
          </div>
          {overflow > 0 && (
            <div className="box-border flex h-8 shrink-0 items-center justify-center rounded-[6px] border border-primary-light p-2 font-['Pretendard',system-ui,sans-serif] text-[14px] leading-4 font-normal text-primary-light">
              +{overflow}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {filtered && (
            <button type="button" onClick={() => setChecked(row, all)} aria-label={`${label} 전체로`} title="전체로" className="flex size-7 items-center justify-center rounded-md hover:bg-white/10">
              <TrashIcon />
            </button>
          )}
          <button type="button" onClick={() => setOpenRow(open ? null : row)} aria-label={`${label} dropdown`} aria-expanded={open} className="flex size-7 shrink-0 items-center justify-center p-[7px]">
            <img src="/ic/ic_arrow_up_line_normal_white_12.svg" alt="" width={12} height={12} className={cn('transition-turn', open && 'rotate-180')} />
          </button>
        </div>
        {open && <Dropdown row={row} data={data} checked={checked} />}
      </div>
    </div>
  )
})

function RegionRow() {
  const regions = events.use((s) => s.regions)
  const checked = events.use((s) => s.regionChecked)
  const data = useMemo(() => regionTree(regions), [regions])
  const all = useMemo(() => allKeys(regionLeaves(regions)), [regions])
  const tokens = useMemo(() => tokensOf(regionLeaves(regions), checked, '#지역 전체'), [regions, checked])
  return <Row row="region" label="발생 지역" placeholder="지역을 선택해주세요" data={data} tokens={tokens} checked={checked} all={all} />
}

function TypeRow() {
  const types = events.use((s) => s.types)
  const checked = events.use((s) => s.typeChecked)
  const data = useMemo(() => typeTree(types), [types])
  const all = useMemo(() => allKeys(typeLeaves(types)), [types])
  const tokens = useMemo(() => tokensOf(typeLeaves(types), checked, '#이벤트 전체'), [types, checked])
  return <Row row="type" label="이벤트 유형" placeholder="이벤트 유형을 선택해주세요" data={data} tokens={tokens} checked={checked} all={all} />
}

export const SearchForm = memo(function SearchForm() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center gap-[5px]">
        <img src="/ic/common/ic_document-search_default_line_normal_color_22.svg" alt="" width={22} height={22} />
        <span className="text-b2 text-neutral-50">이벤트 검색 조건 설정</span>
      </div>
      <div className="flex w-full flex-col gap-2">
        <RegionRow />
        <TypeRow />
      </div>
      <button type="button" onClick={search} className="flex h-12 items-center justify-center gap-2 self-stretch rounded-[99px] bg-primary-dark hover:bg-primary-light">
        <img src="/ic/ic_search_default_line_normal_white_20.svg" alt="" width={20} height={20} />
        <span className="text-b3 text-white">조회</span>
      </button>
    </div>
  )
})
