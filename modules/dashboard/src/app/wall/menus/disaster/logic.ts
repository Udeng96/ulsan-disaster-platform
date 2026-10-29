// 재난 예·경보 — 목록을 트리·카드로 바꾸는 계산 (화면과 떨어진 순수 함수, 옛 DisasterPanel 과 같은 규칙).
//   체크 집합에는 leaf id 만 담는다: 방송장비 `fac-{id}`, 전광판 `sign-{id}`.
import type { FacilityListItem } from '@/api/facility'
import type { TreeNode } from '@/shared/ui'

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'ko')

/** 전파 대상 트리 — 행정동별 / 유형별 두 갈래. 같은 장비는 양쪽 모두 `fac-{id}` 라 어느 쪽에서 골라도 같이 체크된다. */
export function voiceTree(list: readonly FacilityListItem[]): TreeNode[] {
  const byType = new Map<string, FacilityListItem[]>()
  const byRegion = new Map<string, FacilityListItem[]>()
  for (const f of list) {
    const t = f.groupType?.trim() || '기타'
    const r = f.region?.trim() || '미지정'
    byType.set(t, [...(byType.get(t) ?? []), f])
    byRegion.set(r, [...(byRegion.get(r) ?? []), f])
  }
  const leaves = (fs: FacilityListItem[]) => [...fs].sort(byName).map((f) => ({ id: `fac-${f.id}`, label: f.name }))
  const group = (m: Map<string, FacilityListItem[]>, prefix: string) =>
    [...m].sort(([a], [b]) => a.localeCompare(b, 'ko')).map(([k, fs]) => ({ id: `${prefix}-${k}`, label: k, children: leaves(fs) }))
  return [
    { id: 'branch-region', label: '행정동별', children: group(byRegion, 'vregion') },
    { id: 'branch-type', label: '유형별', children: group(byType, 'type') },
  ]
}

/** 펼칠 수 있는 노드 id 전부 ("모두 펼치기"용) */
export function expandableIds(nodes: readonly TreeNode[]): string[] {
  return nodes.flatMap((n) => (n.children?.length ? [n.id, ...expandableIds(n.children)] : []))
}

/** 전광판 카드 — 같은 이름이 여러 번 들어온 경우(운영 DB) 가장 작은 id 하나만, 가나다순 */
export function signItems(list: readonly FacilityListItem[]): TreeNode[] {
  const m = new Map<string, FacilityListItem>()
  for (const f of list) {
    const prev = m.get(f.name)
    if (!prev || f.id < prev.id) m.set(f.name, f)
  }
  return [...m.values()].sort(byName).map((f) => ({ id: `sign-${f.id}`, label: f.name }))
}

/** 체크 집합에서 시설 id 만 (순서 유지) */
export function idsOf(checked: ReadonlySet<string>, prefix: 'fac' | 'sign'): number[] {
  const re = new RegExp(`^${prefix}-(\\d+)$`)
  const out: number[] = []
  for (const k of checked) {
    const m = re.exec(k)
    if (m) out.push(Number(m[1]))
  }
  return out
}

/** leaf 하나 넣었다 뺐다 */
export function toggleLeaf(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

export interface PreviewCell {
  label: string
  cctvId?: string
}

/** 전광판 CCTV 칸 6개 — 고른 순서대로 채우고 남는 칸은 null */
export function previewCells(checked: ReadonlySet<string>, list: readonly FacilityListItem[], cctvOf: Readonly<Record<number, string | null>>): (PreviewCell | null)[] {
  const cells = idsOf(checked, 'sign')
    .map((id) => list.find((s) => s.id === id))
    .filter((s): s is FacilityListItem => !!s)
    .map((s) => ({ label: s.name, cctvId: cctvOf[s.id] ?? undefined }))
  return Array.from({ length: 6 }, (_, i) => cells[i] ?? null)
}

/** 표출 중 전광판 이름 — 응답 host 를 이름으로 (모르는 host 는 그대로) */
export function hostNames(hosts: readonly string[], list: readonly FacilityListItem[]): string[] {
  return hosts.map((h) => list.find((s) => s.host === h)?.name ?? h)
}
