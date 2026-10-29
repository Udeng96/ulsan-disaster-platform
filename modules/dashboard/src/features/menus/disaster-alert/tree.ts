// 재난 예·경보 패널 트리 (유형별 / 행정동별) 공통 타입 + 헬퍼.
//   유형별 / 행정동별 두 tree 가 같은 facility id 를 leaf 로 공유해 자동 동기.

export interface TreeNode {
  id: string
  label: string
  children?: TreeNode[]
}

// leaf (자식 없음) id 만 모아 반환. 부모 노드 id 는 state set 에 저장 안 함 —
// 부모 체크 상태 (checked / indeterminate) 는 자손 leaf 들의 상태에서 derive.
export function getAllLeafIds(node: TreeNode): string[] {
  if (!node.children || node.children.length === 0) return [node.id]
  return node.children.flatMap((c) => getAllLeafIds(c))
}

export function isAllChecked(node: TreeNode, set: Set<string>): boolean {
  if (!node.children || node.children.length === 0) {
    return set.has(node.id)
  }
  return node.children.every((c) => isAllChecked(c, set))
}

export function isSomeChecked(node: TreeNode, set: Set<string>): boolean {
  if (!node.children || node.children.length === 0) {
    return set.has(node.id)
  }
  return node.children.some((c) => isSomeChecked(c, set))
}
