// 재난 예·경보 트리 선택 — controlled (checked / onToggle 부모 주입).
//   유형별 / 행정동별 두 tree 가 같은 facility leaf id 를 공유해 자동 동기.
//   부모 노드는 ▸/▾ 로 펼침/접힘 — 기본은 depth 1 까지 펼침 (시설 leaf 는 접힌 상태).

import { useEffect, useMemo, useState } from 'react'
import { COLORS } from '@/styles/designTokens'
import { Checkbox, type CheckboxState } from '@/components/inputs/Checkbox'
import { LevelIcon } from '@/icons/indicator/LevelIcon'
import {
  isAllChecked,
  isSomeChecked,
  type TreeNode,
} from './tree'

interface TreeItemProps {
  node: TreeNode
  level: number
  checked: Set<string>
  onToggle: (node: TreeNode) => void
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  /** 화살표 열 유지 — 트리에 부모 노드가 하나라도 있을 때만. */
  showArrowColumn: boolean
}

function TreeItem({
  node,
  level,
  checked,
  onToggle,
  expanded,
  onToggleExpand,
  showArrowColumn,
}: TreeItemProps) {
  const fullyChecked = isAllChecked(node, checked)
  const partiallyChecked = !fullyChecked && isSomeChecked(node, checked)
  const state: CheckboxState = fullyChecked
    ? 'checked'
    : partiallyChecked
      ? 'indeterminate'
      : 'unchecked'
  const hasChildren = (node.children?.length ?? 0) > 0
  const isExpanded = expanded.has(node.id)

  return (
    <>
      <label
        className="flex cursor-pointer items-center self-stretch rounded-[6px] hover:bg-[#003060]"
        // gap — 아이콘 묶음과 라벨 사이 간격.
        style={{ height: '32px', padding: '7px', gap: '8px' }}
        onClick={(e) => {
          e.preventDefault()
          onToggle(node)
        }}
      >
        {/* level 만큼 들여쓰기 — 마지막 한 칸만 LevelIcon (ㄴ), 나머지는 invisible spacer.
            한 단계당 24(spacer) + 12(들여쓰기) 로 하위가 더 안쪽에 보이게 한다. */}
        <div
          className="flex items-center"
          style={{ gap: '2px', paddingLeft: `${level * 12}px` }}
        >
          {Array.from({ length: level }).map((_, i) =>
            i === level - 1 ? (
              <LevelIcon key={i} />
            ) : (
              <div key={i} style={{ width: '24px', height: '24px' }} />
            ),
          )}
          {/* 펼침/접힘 화살표 — 부모 노드만. 체크 토글과 분리 (stopPropagation).
              모든 노드가 leaf 인 트리(CCTV 행정동 등)는 이 열 자체를 두지 않는다 —
              맞출 화살표가 없어 빈 여백만 남는다. */}
          {hasChildren ? (
            <button
              type="button"
              aria-label={isExpanded ? '접기' : '펼치기'}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleExpand(node.id)
              }}
              style={{
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '26px',
                lineHeight: '26px',
              }}
            >
              {isExpanded ? '▾' : '▸'}
            </button>
          ) : showArrowColumn ? (
            <span style={{ width: '24px', height: '24px' }} />
          ) : null}
          <Checkbox state={state} size={18} />
        </div>
        {/* fully checked 시 텍스트만 강조 (체크박스 stroke 와 동일한 #0D8AE0). */}
        <span
          style={{
            color: fullyChecked ? COLORS.primaryDark : COLORS.white,
            fontFamily: 'Roboto, sans-serif',
            fontSize: '16px',
            fontWeight: 500,
            lineHeight: '18px',
          }}
        >
          {node.label}
        </span>
      </label>
      {isExpanded &&
        node.children?.map((child) => (
          <TreeItem
            key={child.id}
            node={child}
            level={level + 1}
            checked={checked}
            onToggle={onToggle}
            expanded={expanded}
            onToggleExpand={onToggleExpand}
            showArrowColumn={showArrowColumn}
          />
        ))}
    </>
  )
}

export function TreeSelect({
  data,
  checked,
  onToggle,
  expanded: expandedProp,
  onToggleExpand: onToggleExpandProp,
  startLevel = 0,
}: {
  data: TreeNode[]
  checked: Set<string>
  onToggle: (node: TreeNode) => void
  /** 펼침 상태 — 주면 controlled(부모 제어), 없으면 내부 기본(depth 0/1 펼침). */
  expanded?: Set<string>
  onToggleExpand?: (id: string) => void
  /** 시작 들여쓰기 단계 — 다른 목록의 하위로 붙일 때 1 이상을 준다 (ㄴ 아이콘 표시). */
  startLevel?: number
}) {
  // 기본 펼침 — depth 0/1 의 부모 노드 (uncontrolled 일 때만 사용).
  const initialExpanded = useMemo(() => {
    const s = new Set<string>()
    const walk = (nodes: TreeNode[], depth: number) => {
      for (const n of nodes) {
        if (n.children?.length) {
          if (depth <= 1) s.add(n.id)
          walk(n.children, depth + 1)
        }
      }
    }
    walk(data, 0)
    return s
  }, [data])
  const [internalExpanded, setInternalExpanded] =
    useState<Set<string>>(initialExpanded)
  // 데이터 로드 (빈 목록 → 채워짐) 시 기본 펼침 재적용 (uncontrolled).
  useEffect(() => {
    setInternalExpanded(initialExpanded)
  }, [initialExpanded])

  // 부모 노드가 하나도 없으면 화살표 열을 두지 않는다 (빈 여백만 남는다).
  const hasAnyParent = useMemo(
    () => data.some((n) => (n.children?.length ?? 0) > 0),
    [data],
  )

  const internalToggle = (id: string) => {
    setInternalExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // controlled(prop) 우선, 없으면 내부 상태.
  const expanded = expandedProp ?? internalExpanded
  const toggleExpand = onToggleExpandProp ?? internalToggle

  return (
    <>
      {data.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          level={startLevel}
          checked={checked}
          onToggle={onToggle}
          expanded={expanded}
          onToggleExpand={toggleExpand}
          showArrowColumn={hasAnyParent}
        />
      ))}
    </>
  )
}
