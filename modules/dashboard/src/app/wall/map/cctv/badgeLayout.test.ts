import { describe, expect, it } from 'vitest'
import { badgeOffsets, groupOverlaps, polygonVertices, SOLO_OFFSET } from './badgeLayout'

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

describe('고른 CCTV 번호 자리 (수정사항 4)', () => {
  it('떨어져 있으면 각자 오른쪽 위', () => {
    const offs = badgeOffsets([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ])
    expect(offs).toEqual([SOLO_OFFSET, SOLO_OFFSET])
  })

  it('둘레 원이 겹친 것끼리만 묶는다 (이어진 것도 같이)', () => {
    const groups = groupOverlaps([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 60, y: 0 },
      { x: 300, y: 0 },
    ])
    expect(groups.map((g) => g.length).sort()).toEqual([1, 3])
  })

  it('n각형 꼭짓점은 서로 번호 상자(18)보다 멀다', () => {
    for (let n = 2; n <= 5; n++) {
      const v = polygonVertices(n, { x: 0, y: 0 })
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) expect(dist(v[i], v[j])).toBeGreaterThan(18)
    }
  })

  it('같은 자리에 겹친 5개 — 번호가 다 따로 보인다', () => {
    const pts = Array.from({ length: 5 }, () => ({ x: 100, y: 100 }))
    const at = badgeOffsets(pts).map((o, i) => ({ x: pts[i].x + o.x, y: pts[i].y + o.y }))
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) expect(dist(at[i], at[j])).toBeGreaterThan(18)
  })

  it('2개는 좌우에, 왼쪽 점은 왼쪽 상자', () => {
    const offs = badgeOffsets([
      { x: 90, y: 100 },
      { x: 110, y: 100 },
    ])
    expect(90 + offs[0].x).toBeLessThan(110 + offs[1].x)
    expect(Math.abs(offs[0].y)).toBeLessThan(1e-6)
  })
})
