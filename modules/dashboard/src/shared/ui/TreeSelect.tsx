// 트리 선택 (다중 체크) — 옛 재난 예·경보/레이어 트리와 이벤트 검색 드롭다운 트리를 하나로.
//   variant
//     panel    : 재난 예·경보·레이어 (줄 높이 32, 체크박스 18, 체크되면 글자만 파랗게, 마지막 들여쓰기 칸에 ㄴ)
//     dropdown : 이벤트 검색 (체크박스 22, 체크되면 줄 배경 파랗게, leaf 의 화살표 자리에 ㄴ)
//   checked 는 leaf id 집합. 부모 상태는 트리 전체를 한 번만 훑어 계산한다.
//   펼침은 expanded 를 주면 부모가 제어, 안 주면 내부 상태 (기본 펼침 깊이 defaultDepth).
import { useMemo, useState } from 'react'
import { LevelIcon } from '@/icons/indicator/LevelIcon'
import { Checkbox, type CheckboxState } from './Checkbox'
import { cn } from './cn'
import { expandedUpTo, treeStates, type TreeNode } from './tree'

type Variant = 'panel' | 'dropdown'

interface Props {
  data: readonly TreeNode[]
  checked: ReadonlySet<string>
  /** 노드를 눌렀을 때 — 다음 집합은 toggleNode(node, checked) 로 만든다. */
  onToggle: (node: TreeNode) => void
  variant?: Variant
  expanded?: ReadonlySet<string>
  onToggleExpand?: (id: string) => void
  /** 내부 펼침일 때 처음 펼칠 부모 깊이 (panel 1, dropdown 0 이 옛 화면과 같음). */
  defaultDepth?: number
  /** 다른 목록 아래에 붙일 때 시작 들여쓰기 (panel). */
  startLevel?: number
}

interface ItemProps {
  node: TreeNode
  level: number
  states: Map<string, CheckboxState>
  expanded: ReadonlySet<string>
  onToggle: (node: TreeNode) => void
  onToggleExpand: (id: string) => void
  variant: Variant
  arrowColumn: boolean
}

function Arrow({ open, onClick, big }: { open: boolean; onClick: () => void; big: boolean }) {
  return (
    <button
      type="button"
      aria-label={open ? '접기' : '펼치기'}
      aria-expanded={open}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'flex size-6 cursor-pointer items-center justify-center border-none bg-none p-0 text-white/70',
        big ? 'text-[28px] leading-[28px]' : 'text-[26px] leading-[26px]',
      )}
    >
      {open ? '▾' : '▸'}
    </button>
  )
}

function Item({ node, level, states, expanded, onToggle, onToggleExpand, variant, arrowColumn }: ItemProps) {
  const state = states.get(node.id) ?? 'unchecked'
  const full = state === 'checked'
  const parent = (node.children?.length ?? 0) > 0
  const open = parent && expanded.has(node.id)
  const panel = variant === 'panel'

  return (
    <>
      <label
        role="treeitem"
        aria-level={level + 1}
        aria-checked={state === 'indeterminate' ? 'mixed' : full}
        aria-expanded={parent ? open : undefined}
        className={cn(
          'flex cursor-pointer items-center gap-2 self-stretch rounded-[6px] p-[7px]',
          panel ? 'h-8 hover:bg-neutral-500' : full ? 'bg-primary-dark' : 'hover:bg-neutral-500',
        )}
        onClick={(e) => {
          e.preventDefault()
          onToggle(node)
        }}
      >
        {panel ? (
          <div className="flex items-center gap-0.5" style={{ paddingLeft: level * 12 }}>
            {Array.from({ length: level }, (_, i) => (i === level - 1 ? <LevelIcon key={i} /> : <div key={i} className="size-6" />))}
            {parent ? <Arrow open={open} onClick={() => onToggleExpand(node.id)} big={false} /> : arrowColumn ? <span className="size-6" /> : null}
            <Checkbox state={state} size={18} />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {Array.from({ length: level }, (_, i) => (
              <div key={i} className="size-5" />
            ))}
            {parent ? <Arrow open={open} onClick={() => onToggleExpand(node.id)} big /> : <LevelIcon />}
            <Checkbox state={state} />
          </div>
        )}
        {panel ? (
          <span className={cn('font-sans text-[16px] leading-[18px] font-medium', full ? 'text-primary-dark' : 'text-white')}>{node.label}</span>
        ) : (
          <span className="text-b5 text-white">{node.label}</span>
        )}
      </label>
      {open &&
        node.children!.map((c) => (
          <Item key={c.id} node={c} level={level + 1} states={states} expanded={expanded} onToggle={onToggle} onToggleExpand={onToggleExpand} variant={variant} arrowColumn={arrowColumn} />
        ))}
    </>
  )
}

export function TreeSelect({ data, checked, onToggle, variant = 'panel', expanded, onToggleExpand, defaultDepth, startLevel = 0 }: Props) {
  const depth = defaultDepth ?? (variant === 'panel' ? 1 : 0)
  // 내부 펼침 — 데이터가 바뀌면(빈 목록 → 채워짐) 기본 펼침을 다시 적용한다.
  const [own, setOwn] = useState(() => ({ data, set: expandedUpTo(data, depth) }))
  const ownSet = own.data === data ? own.set : expandedUpTo(data, depth)
  if (own.data !== data) setOwn({ data, set: ownSet })

  const states = useMemo(() => treeStates(data, checked), [data, checked])
  const arrowColumn = useMemo(() => data.some((n) => (n.children?.length ?? 0) > 0), [data])

  const toggleOwn = (id: string) =>
    setOwn((p) => {
      const set = new Set(p.set)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { data: p.data, set }
    })

  return (
    <>
      {data.map((n) => (
        <Item
          key={n.id}
          node={n}
          level={startLevel}
          states={states}
          expanded={expanded ?? ownSet}
          onToggle={onToggle}
          onToggleExpand={onToggleExpand ?? toggleOwn}
          variant={variant}
          arrowColumn={arrowColumn}
        />
      ))}
    </>
  )
}
