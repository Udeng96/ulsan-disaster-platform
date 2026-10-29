// 고른 CCTV 번호 상자 자리 (수정사항 4, 10-20 사용자 결정).
//   혼자 있으면 둘레 원 오른쪽 위. 둘레 원이 겹친 것끼리는 묶어서,
//   그 가운데를 중심으로 하는 n각형(2개는 좌우, 3개는 삼각형, 4개는 사각형…) 꼭짓점에 하나씩 펼친다.

export interface ScreenPoint {
  x: number
  y: number
}

/** 혼자일 때 번호 상자 자리 — 옛 reticle 배지(56 칸의 44,12)와 같다 */
export const SOLO_OFFSET: ScreenPoint = { x: 16, y: -16 }
/** 둘레 원 지름 — 이보다 가까우면 겹친 것으로 본다 */
export const OVERLAP_PX = 40
/** 번호 상자(18) + 사이 띄움 — n각형 한 변이 이보다 짧지 않게 */
const BADGE_STEP = 26
/** 꼭짓점을 둘레 원 밖에 두는 가장 작은 반지름 */
const MIN_RADIUS = 30

/** 겹친 것끼리 묶음 (가까운 것을 이어 가며) — 점 순서의 번호 목록들 */
export function groupOverlaps(points: readonly ScreenPoint[], gap = OVERLAP_PX): number[][] {
  const parent = points.map((_, i) => i)
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])))
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      if (Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < gap) parent[root(j)] = root(i)
  const groups = new Map<number, number[]>()
  points.forEach((_, i) => {
    const r = root(i)
    groups.set(r, [...(groups.get(r) ?? []), i])
  })
  return [...groups.values()]
}

/** n각형 꼭짓점 — 짝수는 윗변이 평평하게, 2개는 좌우 */
export function polygonVertices(n: number, center: ScreenPoint): ScreenPoint[] {
  const radius = Math.max(MIN_RADIUS, BADGE_STEP / (2 * Math.sin(Math.PI / n)))
  const start = -Math.PI / 2 + (n % 2 === 0 ? Math.PI / n : 0)
  return Array.from({ length: n }, (_, i) => {
    const a = start + (2 * Math.PI * i) / n
    return { x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) }
  })
}

/** 점마다 번호 상자 자리 — 자기 점에서 얼마나 떨어졌는지 */
export function badgeOffsets(points: readonly ScreenPoint[]): ScreenPoint[] {
  const out: ScreenPoint[] = points.map(() => SOLO_OFFSET)
  for (const group of groupOverlaps(points)) {
    if (group.length < 2) continue
    const center = {
      x: group.reduce((s, i) => s + points[i].x, 0) / group.length,
      y: group.reduce((s, i) => s + points[i].y, 0) / group.length,
    }
    const vertices = polygonVertices(group.length, center)
    // 꼭짓점을 돌려 가며 맞춰 보고, 점과 상자 사이가 가장 짧은 짝을 고른다 (줄이 덜 엇갈림)
    const byAngle = [...group].sort(
      (a, b) => Math.atan2(points[a].y - center.y, points[a].x - center.x) - Math.atan2(points[b].y - center.y, points[b].x - center.x),
    )
    let best = 0
    let bestCost = Infinity
    for (let shift = 0; shift < group.length; shift++) {
      const cost = byAngle.reduce((s, idx, k) => {
        const v = vertices[(k + shift) % group.length]
        return s + Math.hypot(v.x - points[idx].x, v.y - points[idx].y)
      }, 0)
      if (cost < bestCost - 1e-6) {
        bestCost = cost
        best = shift
      }
    }
    byAngle.forEach((idx, k) => {
      const v = vertices[(k + best) % group.length]
      out[idx] = { x: v.x - points[idx].x, y: v.y - points[idx].y }
    })
  }
  return out
}
