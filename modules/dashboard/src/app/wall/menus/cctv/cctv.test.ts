import { describe, expect, it } from 'vitest'
import { MENU } from '../../dashboard/state'
import { msToReload, toFacilityItems, type CctvItem } from './api'
import { candidates, cellsOf, ofMenu, rotate } from './logic'

const cam = (n: number, extra: Partial<CctvItem> = {}): CctvItem => ({
  cctvId: `CTV${String(n).padStart(7, '0')}`,
  name: `c${n}`,
  lat: n,
  lng: 0,
  gbnCd: '',
  mgtNo: '',
  ptzYn: 'N',
  regionId: null,
  regionName: null,
  menus: [],
  ...extra,
})
const pump = { menu: 'PUMP_STATION', facId: 3, facName: '가상시설0411' } as const
const raw = [cam(1, { menus: [pump], regionId: 7 }), cam(2), cam(3, { menus: [pump] }), cam(4), cam(5), cam(6), cam(7)]
const all = toFacilityItems(raw)
const names = (l: { name: string }[]) => l.map((c) => c.name)

describe('CCTV 고르기', () => {
  it('메뉴 분류가 있으면 그 분류만, 없으면 전체', () => {
    expect(names(candidates(raw, all, MENU.pump, null, null))).toEqual(['c1', 'c3'])
    expect(candidates(raw, all, MENU.none, null, null)).toHaveLength(7)
    expect(ofMenu(raw, MENU.layer)).toEqual([])
  })

  it('레이어 메뉴는 체크한 행정동만 (행정동 없으면 기타 -1)', () => {
    expect(names(candidates(raw, all, MENU.layer, null, new Set([7])))).toEqual(['c1'])
    expect(candidates(raw, all, MENU.layer, null, new Set([-1]))).toHaveLength(6)
  })

  it('지점이 있으면 가장 가까운 5개 — 메뉴가 켜져 있으면 그 분류 안에서', () => {
    expect(names(candidates(raw, all, MENU.none, { lat: 6.2, lng: 0 }, null))).toEqual(['c6', 'c7', 'c5', 'c4', 'c3'])
    expect(names(candidates(raw, all, MENU.pump, { lat: 6, lng: 0 }, null))).toEqual(['c3', 'c1'])
  })

  it('5개씩 순환, 끝에서 처음으로 이어진다', () => {
    const l = [1, 2, 3, 4, 5, 6, 7]
    expect(rotate(l, 0)).toEqual([1, 2, 3, 4, 5])
    expect(rotate(l, 1)).toEqual([6, 7, 1, 2, 3])
    expect(rotate([1, 2], 3)).toEqual([1, 2])
  })

  it('5칸 — 모자라면 할당된 CCTV 없음', () => {
    const cells = cellsOf(all.slice(0, 2))
    expect(cells.map((c) => [c.number, c.name, c.cctvId])).toEqual([
      [1, 'c1', 'CTV0000001'],
      [2, 'c2', 'CTV0000002'],
      [3, '할당된 CCTV 없음', undefined],
      [4, '할당된 CCTV 없음', undefined],
      [5, '할당된 CCTV 없음', undefined],
    ])
  })

  it('재난 예·경보는 BROADCAST 배정 (전광판 CCTV), 옛 DISASTER_ALERT 아님', () => {
    const board = cam(9, { menus: [{ menu: 'BROADCAST', facId: 2, facName: '가상시설0411' }] })
    expect(names(ofMenu([...raw, board], MENU.disaster))).toEqual(['c9'])
  })

  it('목록 다시 받기 — 다음 00:30 까지 (지났으면 내일)', () => {
    const at = (h: number, m: number) => new Date(2026, 9, 21, h, m)
    expect(msToReload(at(0, 0))).toBe(30 * 60_000)
    expect(msToReload(at(0, 30))).toBe(24 * 3600_000)
    expect(msToReload(at(17, 30))).toBe(7 * 3600_000)
  })
})
