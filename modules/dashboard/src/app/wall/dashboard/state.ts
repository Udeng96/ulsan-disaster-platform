// 메인 대시보드 상태 — 메뉴·검색·이벤트·CCTV 등. 각 칸은 자기가 쓰는 값만 골라 구독한다.
import type { OwlEvent } from '../menus/event/api'
import type { FacilityListItem } from '@/api/facility'
import type { AddressSearchItem } from '../menus/search/api'
import { createStore } from '@/shared/store'

/** 메뉴 번호 — 옛 화면과 같은 순서 (-1 = 메뉴 안 누름) */
export const MENUS = ['배수펌프장', '하천시설물', '급경사지', '지진가속도', '재난 예·경보', '레이어', '관리자'] as const
export const MENU = { none: -1, pump: 0, river: 1, slope: 2, earthquake: 3, disaster: 4, layer: 5, admin: 6 } as const

type Point = { lng: number; lat: number }
export interface CctvCell {
  number: number
  name: string
  cctvId?: string
}

export interface DashState {
  menu: number
  /** 바로 앞 메뉴 — 관리자와 급경사지 사이를 오갈 때 머리 줄을 열고 닫지 않고 바꿔 끼운다 */
  fromMenu: number
  /** 지도 오른쪽(CCTV·메뉴 패널) 배치 기준 메뉴 — 급경사지로 들고 날 때는 머리 줄이 열린(닫힌) 뒤 바뀐다 (옛 화면과 같게).
   *  그 밖에는 menu 와 같다 */
  layoutMenu: number
  /** CCTV 목록 기준 메뉴 — 메뉴가 미끄러지며 바뀌면 거의 다 움직인 뒤(CCTV_SWAP_MS) 바뀐다 (옛 화면과 같게) */
  cctvMenu: number
  /** 주소 검색으로 고른 곳 (seq: 같은 곳을 다시 골라도 지도가 다시 날아가게) */
  searchTarget: (Point & { seq: number }) | null
  /** 투망으로 찍은 곳 */
  netTarget: Point | null
  activeEvent: OwlEvent | null
  eventPanelOpen: boolean
  cctvOpen: boolean
  /** 위성 지도 — 급경사지에서만. 움직이는 동안 바꾸면 지도가 비었다 채워지며 번쩍여서 움직임이 끝난 뒤 바꾼다 (수정사항 24) */
  satellite: boolean
  /** 지도 오른쪽(CCTV·메뉴 패널)이 움직이는 중 — CCTV 접기·펼치기, 메뉴 바꾸기. 이때만 이동 전환 */
  sliding: boolean
  /** 지도를 기본 카메라로 */
  resetSeq: number
  /** 주소 검색창 비우기 (값이 바뀌면 검색창을 새로 그림) */
  searchKey: number
  /** 확대해서 보는 CCTV */
  modalCctv: CctvCell | null
  /** 레이어 메뉴 체크 (code → on) */
  layerChecked: Record<string, boolean>
  /** 레이어 라벨보기 (code → on) */
  layerLabelOn: Record<string, boolean>
  /** 레이어 메뉴 CCTV 하위 — 체크한 행정동 id. 목록이 오기 전엔 null(전체) */
  cctvRegions: ReadonlySet<number> | null
}

export const dash = createStore<DashState>({
  menu: MENU.none,
  fromMenu: MENU.none,
  layoutMenu: MENU.none,
  cctvMenu: MENU.none,
  searchTarget: null,
  netTarget: null,
  activeEvent: null,
  eventPanelOpen: false,
  cctvOpen: true,
  satellite: false,
  sliding: false,
  resetSeq: 0,
  searchKey: 0,
  modalCctv: null,
  layerChecked: { CCTV: true },
  layerLabelOn: {},
  cctvRegions: null,
})

/** 지도 오른쪽이 움직이는 시간 — tokens.css 의 transition-slide 와 같은 값 */
export const SLIDE_MS = 450
/** 미끄러지며 바뀌는 메뉴 — 관리자는 본문 전체가 바뀐다 (setSliding 의 관리자 쪽) */
const slides = (menu: number) => menu !== MENU.admin
/** 관리자로 들고 날 때 본문을 바꾸는 시점 — 들어갈 때는 머리 줄 자리가 열린(0.5초) 뒤, 나갈 때는 관리자 본문이 사라진(0.45초) 뒤.
 *  비어 보이는 때가 없게 바로 다음 본문이 나타난다 (사용자 10-23) */
export const ADMIN_IN_MS = 500
/** 메뉴가 미끄러지며 바뀔 때 CCTV 목록을 바꾸는 시점 (옛 화면 CCTV_SWAP_DELAY_MS) */
const CCTV_SWAP_MS = 420
/** 급경사지로 들어갈 때 — 머리 줄 자리가 열린(0.5초) 뒤 지도 오른쪽이 움직인다 (옛 화면 0.7초) */
export const SLOPE_IN_MS = 700
/** 급경사지에서 나갈 때 — 머리 줄 내용이 사라지고(0.45초) 자리가 닫힌(0.5초) 뒤 지도 오른쪽이 움직인다 */
export const SLOPE_OUT_MS = 1000
/** 급경사지로 들고 날 때 CCTV 목록을 바꾸는 시점 — 단계가 더 있어 더 늦다 (옛 SLOPE_CONTENT_SWAP_MS) */
const SLOPE_SWAP_MS = 1600
/** 급경사지로 들어가 움직임이 다 끝난 뒤 위성 지도로 바꾸기까지 더 기다리는 시간 (10-19 사용자 "끝난 뒤 1~2초 뒤에" → "1초로", 10-21 "0.5초로") */
export const SATELLITE_WAIT_MS = 500
/** 재난 예·경보 패널이 들어오고 나가는 시간 — tokens.css transition-overlay 와 같게 (10-19 사용자 '0.6초 부드럽게') */
export const DISASTER_MS = 600
let slideTimer = 0
let satelliteTimer = 0
let swapTimer = 0
let layoutTimer = 0
/** 지도 오른쪽을 움직이기 시작한다 — sliding 은 바뀐 값과 같은 번에 켜야 전환이 붙는다 (따로 켜면 한 번은 바로 뛴다) */
function slide(patch: Partial<DashState>) {
  dash.set({ ...patch, sliding: true })
  window.clearTimeout(slideTimer)
  slideTimer = window.setTimeout(() => dash.set({ sliding: false }), SLIDE_MS)
}
/** 상태를 바꾸고, 메뉴가 바뀌면 지도 오른쪽을 움직인다 (force 면 메뉴가 그대로여도).
 *  급경사지로 들고 날 때는 배치(layoutMenu)를 머리 줄 움직임 뒤로 미룬다. */
function setSliding(patch: (s: DashState) => Partial<DashState>, force = false) {
  const before = dash.get()
  const p0 = patch(before)
  const menu = p0.menu ?? before.menu
  const p = menu === before.menu ? p0 : { ...p0, fromMenu: before.menu }
  if (menu === before.menu) {
    if (force) slide(p)
    else dash.set(p)
    return
  }
  window.clearTimeout(swapTimer)
  window.clearTimeout(layoutTimer)
  const instant = !slides(menu) || !slides(before.menu)
  // 위성 지도 — 들어갈 때는 움직임이 끝나고 SATELLITE_WAIT_MS 뒤, 나갈 때는 움직임이 끝나면 (카메라 옮길 때) 일반으로
  window.clearTimeout(satelliteTimer)
  // 관리자에서 오면 숨어 있는 동안 바로 위성으로 — 나타날 때는 이미 위성 (사용자 10-23 — 일반 지도로 떴다 바뀌는 번쩍임)
  if (menu === MENU.slope && before.menu === MENU.admin) {
    p.satellite = true
  } else if (menu === MENU.slope) {
    satelliteTimer = window.setTimeout(() => dash.set({ satellite: true }), (instant ? 0 : SLOPE_IN_MS + SLIDE_MS) + SATELLITE_WAIT_MS)
  } else if (before.satellite) {
    // 관리자로 갈 때는 지도가 다 흐려져 숨은 뒤 일반으로 (흐려지는 동안 밝은 일반 지도로 바뀌면 고장 난 것처럼 보임, 사용자 10-23)
    const wait = menu === MENU.admin ? ADMIN_IN_MS : instant ? 0 : SLOPE_OUT_MS + SLIDE_MS
    satelliteTimer = window.setTimeout(() => dash.set({ satellite: false }), wait)
  }
  // 관리자 — 머리 줄이 열리는 동안(관리자 본문이 사라지는 동안) 본문은 그대로 두고, 그 뒤 본문(layoutMenu)을 바꾼다.
  //   나갈 때는 그동안 숨은 지도가 위성·자리를 미리 맞춘다 (보이면서 바뀌면 번쩍임, 사용자 10-23)
  if (menu === MENU.admin || before.menu === MENU.admin) {
    dash.set({ ...p, sliding: false })
    layoutTimer = window.setTimeout(() => {
      const now = dash.get().menu
      dash.set({ layoutMenu: now, cctvMenu: now, sliding: false })
    }, ADMIN_IN_MS)
    return
  }
  if (instant) {
    dash.set({ ...p, layoutMenu: menu, cctvMenu: menu, sliding: false })
    return
  }
  // 재난 예·경보 — 패널이 덮었다 비키는 동안 뒤(CCTV·메뉴 패널)는 움직이지 않는다 (뒤가 바뀌어 깜빡이지 않게, 10-19).
  //   들어갈 때: 뒤는 그대로 두고 패널이 다 덮은 뒤 배치를 바꾼다 (급경사지에서 오면 머리 줄이 다 닫힌 뒤). CCTV 목록은 그대로.
  //   나갈 때: 갈 화면을 바로 제자리에 그려 두고 패널만 빠진다 (급경사지로 가면 머리 줄 자리가 열린 뒤).
  if (menu === MENU.disaster || before.menu === MENU.disaster) {
    dash.set({ ...p, sliding: false })
    const wait = menu === MENU.disaster ? Math.max(DISASTER_MS, before.menu === MENU.slope ? SLOPE_OUT_MS : 0) : menu === MENU.slope ? SLOPE_IN_MS : 0
    const settle = () => {
      const now = dash.get().menu
      dash.set(now === MENU.disaster ? { layoutMenu: now, sliding: false } : { layoutMenu: now, cctvMenu: now, sliding: false })
    }
    if (wait) layoutTimer = window.setTimeout(settle, wait)
    else settle()
    return
  }
  const slope = menu === MENU.slope || before.menu === MENU.slope
  if (slope) {
    dash.set(p)
    layoutTimer = window.setTimeout(() => {
      const { menu: now, layoutMenu } = dash.get()
      if (now !== layoutMenu) slide({ layoutMenu: now })
    }, menu === MENU.slope ? SLOPE_IN_MS : SLOPE_OUT_MS)
  } else slide({ ...p, layoutMenu: menu })
  swapTimer = window.setTimeout(() => dash.set({ cctvMenu: dash.get().menu }), slope ? SLOPE_SWAP_MS : CCTV_SWAP_MS)
}

/** 지도 오른쪽 끝 손잡이 — CCTV 칸을 접거나 편다 */
export function toggleCctv() {
  setSliding((s) => ({ cctvOpen: !s.cctvOpen }), true)
}

/** 메뉴 누름 — 같은 메뉴면 끔. 검색 핀·이벤트 해제, CCTV 펼침. */
export function selectMenu(idx: number) {
  setSliding((s) => ({ menu: s.menu === idx ? MENU.none : idx, searchTarget: null, activeEvent: null, cctvOpen: true }))
}

/** 제목 누름 — 전부 처음으로 */
export function resetAll() {
  setSliding((s) => ({ menu: MENU.none, searchTarget: null, netTarget: null, activeEvent: null, searchKey: s.searchKey + 1, resetSeq: s.resetSeq + 1, cctvOpen: true }))
}

/** 주소 검색 결과 고름 — 메뉴·이벤트 해제 후 그곳으로 */
export function selectAddress(r: AddressSearchItem) {
  setSliding((s) => ({ menu: MENU.none, eventPanelOpen: false, activeEvent: null, searchTarget: { lng: r.lng, lat: r.lat, seq: (s.searchTarget?.seq ?? 0) + 1 } }))
}

/** 이벤트 고름 — 다른 위치(검색·투망)와 메뉴는 해제 */
export function activateEvent(e: OwlEvent | null) {
  setSliding(() => (e ? { activeEvent: e, searchTarget: null, netTarget: null, menu: MENU.none } : { activeEvent: null }))
}

// ── CCTV 선택 결과 (옛 useCctvSelection 을 한 곳에서 돌리고 결과만 나눠 줌) ──
export interface CctvState {
  list: FacilityListItem[]
  cells: CctvCell[]
  hasCctv: boolean
  shown: FacilityListItem[]
  /** 지금 메뉴 분류의 CCTV (지도 마커용) */
  ofMenu: FacilityListItem[]
  /** 행정동별 CCTV 수 (레이어 메뉴 트리) */
  regions: CctvRegion[]
}
export interface CctvRegion {
  id: number
  name: string
  count: number
}
export const cctv = createStore<CctvState>({ list: [], cells: [], hasCctv: false, shown: [], ofMenu: [], regions: [] })

// ── 레이아웃 (옛 DashboardPage 값 그대로) ──
export const MAP_CANVAS_W = 1888
export const CCTV_SLOT_W = 640 + 12
const COMMON = [MENU.pump, MENU.slope, MENU.earthquake, MENU.layer] as number[]

/** 우측 메뉴 패널 폭 (없으면 0) */
export function sidePanelWidth(menu: number): number {
  if (menu === MENU.slope) return 568
  return COMMON.includes(menu) ? 480 : 0
}
/** 보이는 지도 폭 — CCTV 를 접으면 그 자리만큼 넓어진다 (재난·급경사지는 접기 없음).
 *  지도 칸은 늘 MAP_CANVAS_W 로 그려 두고, CCTV·메뉴 패널이 그 위를 덮었다 비켰다 한다 */
export function mapWidth(menu: number, cctvOpen: boolean): number {
  const base = menu === MENU.slope ? 784 : menu === MENU.disaster || COMMON.includes(menu) ? 744 : 1236
  return cctvOpen || menu === MENU.disaster || menu === MENU.slope ? base : base + CCTV_SLOT_W
}
export const canCollapseCctv = (menu: number) => menu !== MENU.disaster && menu !== MENU.slope
