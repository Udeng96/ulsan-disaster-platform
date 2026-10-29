// CCTV 고르기 계산 — 메뉴 분류·지점·레이어 행정동으로 거르고, 5개씩 순환, 5칸으로 채운다.
import type { FacilityListItem } from '@/api/facility'
import { CCTV_ETC_REGION_ID } from '@/features/menus/layer/cctvLayer'
import { MENU, type CctvCell } from '../../dashboard/state'
import { toFacilityItems, type CctvItem, type CctvMenu } from './api'

export const ROTATION_MS = 30_000
export const CELLS = 5
const EMPTY_NAME = '할당된 CCTV 없음'

/** 화면 메뉴 → CCTV 배정 메뉴 (서버가 CCTV 마다 menus 로 준다). 없는 메뉴(하천·레이어·기본)는 전체 */
const MENU_CLFY: Partial<Record<number, CctvMenu>> = {
  [MENU.pump]: 'PUMP_STATION',
  [MENU.slope]: 'SLOPE',
  [MENU.earthquake]: 'SEISMOMETER',
  [MENU.disaster]: 'BROADCAST',
}

/** 그 메뉴 분류의 CCTV (지도 마커용). 분류 없는 메뉴는 빈 목록 */
export function ofMenu(raw: readonly CctvItem[], menu: number): FacilityListItem[] {
  const clfy = MENU_CLFY[menu]
  return clfy ? toFacilityItems(raw.filter((c) => c.menus.some((m) => m.menu === clfy))) : []
}

type Point = { lat: number; lng: number }

/** 지금 보여 줄 후보 — 지점(이벤트·검색·투망)이 있으면 가장 가까운 5개(메뉴가 켜져 있으면 그 분류 안에서),
 *  아니면 메뉴 분류. 레이어 메뉴는 체크한 행정동만 (지도 마커와 같은 기준) */
export function candidates(raw: readonly CctvItem[], all: readonly FacilityListItem[], menu: number, target: Point | null, layerRegions: ReadonlySet<number> | null): FacilityListItem[] {
  const clfy = MENU_CLFY[menu]
  if (target) {
    const base = clfy ? ofMenu(raw, menu) : all
    const d = (c: FacilityListItem) => (c.lat - target.lat) ** 2 + (c.lng - target.lng) ** 2
    return [...base].sort((a, b) => d(a) - d(b)).slice(0, CELLS)
  }
  if (clfy) return ofMenu(raw, menu)
  if (menu === MENU.layer && layerRegions) return all.filter((c) => layerRegions.has(c.regionId ?? CCTV_ETC_REGION_ID))
  return [...all]
}

/** 5개 넘으면 block 번째 5개 (끝에서 처음으로 이어짐), 아니면 그대로 */
export function rotate<T>(list: readonly T[], block: number): T[] {
  if (list.length <= CELLS) return [...list]
  const start = (block * CELLS) % list.length
  return Array.from({ length: CELLS }, (_, i) => list[(start + i) % list.length])
}

/** 5칸 — 모자라면 '할당된 CCTV 없음' */
export function cellsOf(shown: readonly FacilityListItem[]): CctvCell[] {
  return Array.from({ length: CELLS }, (_, i) => (shown[i] ? { number: i + 1, name: shown[i].name, cctvId: shown[i].cctvId } : { number: i + 1, name: EMPTY_NAME }))
}
