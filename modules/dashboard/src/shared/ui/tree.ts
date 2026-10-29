// 트리 선택 헬퍼 — 체크 집합에는 leaf id 만 담고, 부모 상태(전체·일부·없음)는 leaf 에서 계산한다.
import type { CheckboxState } from './Checkbox'

export interface TreeNode {
  id: string
  label: string
  children?: TreeNode[]
}

const isLeaf = (n: TreeNode) => !n.children?.length

/** 노드 아래 leaf id 전부 (leaf 면 자기 자신). */
export function leafIds(node: TreeNode): string[] {
  return isLeaf(node) ? [node.id] : node.children!.flatMap(leafIds)
}

/** 트리 전체의 체크 상태를 한 번에 계산 (노드마다 다시 훑지 않도록). */
export function treeStates(nodes: readonly TreeNode[], checked: ReadonlySet<string>): Map<string, CheckboxState> {
  const out = new Map<string, CheckboxState>()
  const walk = (n: TreeNode): CheckboxState => {
    let s: CheckboxState
    if (isLeaf(n)) s = checked.has(n.id) ? 'checked' : 'unchecked'
    else {
      const kids = n.children!.map(walk)
      s = kids.every((k) => k === 'checked') ? 'checked' : kids.some((k) => k !== 'unchecked') ? 'indeterminate' : 'unchecked'
    }
    out.set(n.id, s)
    return s
  }
  nodes.forEach(walk)
  return out
}

/** 노드를 눌렀을 때의 다음 체크 집합 — 전부 체크돼 있으면 모두 해제, 아니면 모두 체크. */
export function toggleNode(node: TreeNode, checked: ReadonlySet<string>): Set<string> {
  const ids = leafIds(node)
  const next = new Set(checked)
  const all = ids.every((id) => next.has(id))
  for (const id of ids) {
    if (all) next.delete(id)
    else next.add(id)
  }
  return next
}

/** 체크된 leaf 수. */
export function countChecked(nodes: readonly TreeNode[], checked: ReadonlySet<string>): number {
  return nodes.reduce((sum, n) => sum + leafIds(n).filter((id) => checked.has(id)).length, 0)
}

/** 기본 펼침 — 부모 노드 중 depth ≤ maxDepth 인 것. */
export function expandedUpTo(nodes: readonly TreeNode[], maxDepth: number): Set<string> {
  const s = new Set<string>()
  const walk = (ns: readonly TreeNode[], d: number) => {
    for (const n of ns) {
      if (isLeaf(n)) continue
      if (d <= maxDepth) s.add(n.id)
      walk(n.children!, d + 1)
    }
  }
  walk(nodes, 0)
  return s
}
