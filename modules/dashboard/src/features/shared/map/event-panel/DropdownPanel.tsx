// select box active 시 아래 표출되는 panel.
// 외곽 박스 + body (tree select, 단일 선택) + footer (button 2개)

import { useEffect, useState } from 'react'
import { COLORS } from '@/styles/designTokens'
import { Checkbox, type CheckboxState } from '@/components/inputs/Checkbox'
import { LevelIcon } from '@/icons/indicator/LevelIcon'

// CheckboxIcon 별칭 — 기존 호출처 호환 (단순 wrapper).
function CheckboxIcon({ state = 'unchecked' }: { state?: CheckboxState }) {
  return <Checkbox state={state} />
}

export interface TreeNode {
  id: string
  label: string
  children?: TreeNode[]
}

// 다중 선택 모드 — node + 모든 후손이 checked 면 checked,
// 일부만 checked 면 indeterminate, 전혀 없으면 unchecked. 클릭 시 자기+후손 전체 토글.

// node 의 모든 후손 id (자기 포함)
function getAllIds(node: TreeNode): string[] {
  const ids = [node.id]
  node.children?.forEach((c) => ids.push(...getAllIds(c)))
  return ids
}

// 트리에서 checked 인 leaf (children 없는 노드) 개수 — footer "전체 해제 N" 카운트용
function countCheckedLeaves(nodes: TreeNode[], checked: Set<string>): number {
  let count = 0
  for (const node of nodes) {
    if (!node.children || node.children.length === 0) {
      if (checked.has(node.id)) count++
    } else {
      count += countCheckedLeaves(node.children, checked)
    }
  }
  return count
}

// node 의 모든 leaf 가 checked 인지 (재귀)
function isAllChecked(node: TreeNode, set: Set<string>): boolean {
  if (!node.children || node.children.length === 0) {
    return set.has(node.id)
  }
  return node.children.every((c) => isAllChecked(c, set))
}

// node 의 일부 leaf 가 checked 인지
function isSomeChecked(node: TreeNode, set: Set<string>): boolean {
  if (!node.children || node.children.length === 0) {
    return set.has(node.id)
  }
  return node.children.some((c) => isSomeChecked(c, set))
}

interface TreeItemProps {
  node: TreeNode
  level: number
  checked: Set<string>
  onToggle: (node: TreeNode) => void
  expanded: Set<string>
  onToggleExpand: (id: string) => void
}

function TreeItem({
  node,
  level,
  checked,
  onToggle,
  expanded,
  onToggleExpand,
}: TreeItemProps) {
  const hasChildren = (node.children?.length ?? 0) > 0
  const isExpanded = expanded.has(node.id)
  const fullyChecked = isAllChecked(node, checked)
  const partiallyChecked = !fullyChecked && isSomeChecked(node, checked)
  const state: CheckboxState = fullyChecked
    ? 'checked'
    : partiallyChecked
      ? 'indeterminate'
      : 'unchecked'

  return (
    <>
      <label
        className={`flex cursor-pointer items-center self-stretch rounded-[6px] ${
          fullyChecked ? 'bg-[#0D8AE0]' : 'hover:bg-[#003060]'
        }`}
        style={{
          padding: '7px',
          gap: '8px',
        }}
        onClick={(e) => {
          e.preventDefault()
          onToggle(node)
        }}
      >
        {/* 좌 wrapper: level 만큼 들여쓰기 (마지막만 LevelIcon, 나머지는 같은 너비 invisible spacer)
            + checkbox (gap 4) */}
        <div className="flex items-center" style={{ gap: '4px' }}>
          {/* 들여쓰기 — level 만큼 빈 칸. */}
          {Array.from({ length: level }).map((_, i) => (
            <div key={i} style={{ width: '20px', height: '20px' }} />
          ))}
          {/* 펼침/접힘 — 자식 있는 노드만. 체크 토글과 분리. */}
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
                fontSize: '28px',
                lineHeight: '28px',
              }}
            >
              {isExpanded ? '▾' : '▸'}
            </button>
          ) : (
            /* leaf — 삼각형 자리에 ㄴ 를 둔다 (빈칸 → ㄴ → 체크박스 순). */
            <LevelIcon />
          )}
          <CheckboxIcon state={state} />
        </div>
        <span className="text-b5 text-white">{node.label}</span>
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
          />
        ))}
    </>
  )
}

interface TreeSelectProps {
  data: TreeNode[]
  checked: Set<string>
  onChange: (next: Set<string>) => void
}

export function TreeSelect({ data, checked, onChange }: TreeSelectProps) {
  // 펼침 — 최상위('전체')만 열고 그 아래 대분류는 닫아 둔다.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(data.map((n) => n.id)),
  )
  useEffect(() => {
    setExpanded(new Set(data.map((n) => n.id)))
  }, [data])
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleToggle = (node: TreeNode) => {
    const next = new Set(checked)
    const all = getAllIds(node)
    const fully = isAllChecked(node, checked)
    if (fully) {
      all.forEach((id) => next.delete(id))
    } else {
      all.forEach((id) => next.add(id))
    }
    onChange(next)
  }

  return (
    <div className="flex w-full flex-col" style={{ gap: '4px' }}>
      {data.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          level={0}
          checked={checked}
          onToggle={handleToggle}
          expanded={expanded}
          onToggleExpand={toggleExpand}
        />
      ))}
    </div>
  )
}

interface DropdownPanelProps {
  data: TreeNode[]
  checked: Set<string>
  onChange: (next: Set<string>) => void
  /** "완료" 클릭 시 dropdown 닫기 */
  onClose: () => void
}

export function DropdownPanel({ data, checked, onChange, onClose }: DropdownPanelProps) {
  const checkedLeafCount = countCheckedLeaves(data, checked)
  return (
    <div
      className="absolute"
      style={{
        top: 'calc(100% + 4px)',
        left: 0,
        right: 0,
        zIndex: 1001,
      }}
    >
      {/* 총 박스 (outer) */}
      <div
        className="flex flex-col items-start self-stretch overflow-hidden"
        style={{
          borderRadius: '10px',
          border: '1px solid #42B8FF',
          background: '#002247',
        }}
      >
        {/* body — tree select items. 항목이 많으면(이벤트 유형 120+) 여기서 스크롤. */}
        <div
          className="scrollbar-custom flex flex-col items-start self-stretch"
          style={{
            padding: '8px',
            borderRadius: '4px 4px 0 0',
            maxHeight: '320px',
            overflowY: 'auto',
          }}
        >
          <TreeSelect data={data} checked={checked} onChange={onChange} />
        </div>

        {/* footer — button 2개 ("전체 해제 N" / "선택") */}
        <div
          className="flex flex-col items-end self-stretch"
          style={{
            padding: '8px 16px',
            gap: '8px',
            borderRadius: '0 0 4px 4px',
            borderTop: `1px solid ${COLORS.neutral450}`,
            background: '#002247',
          }}
        >
          {/* button row (전체 해제 + 선택) — flex row, gap 8, full W */}
          <div className="flex self-stretch" style={{ gap: '8px' }}>
            {/* "전체 해제 N" button — N = 현재 체크된 leaf 개수, 0 일 때 disabled */}
            <button
              type="button"
              className="dropdown-btn-cancel"
              onClick={() => onChange(new Set())}
              disabled={checkedLeafCount === 0}
            >
              <span className="text-b3" style={{ color: '#F4F8FB' }}>
                전체 해제
              </span>
              <span className="text-b3" style={{ color: '#42B8FF' }}>
                {checkedLeafCount}
              </span>
            </button>

            {/* "완료" button — 클릭 시 dropdown 닫기 */}
            <button
              type="button"
              className="dropdown-btn-confirm"
              onClick={onClose}
            >
              <span className="text-b3" style={{ color: '#FFF' }}>
                완료
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
