// 메뉴별 지도 카메라 — 옛 화면(MapSection)과 같은 자리·시간.
//   메뉴를 고르면 지도 오른쪽이 다 움직인 뒤(delayMs) 0.4초 동안 옮긴다 (움직이는 중에 같이 돌리면 버벅이고 중심이 흐른다).
//   지도 칸은 넓게 그려 두고 오른쪽·아래를 가리므로, 가린 만큼의 절반을 당겨 '보이는 곳 가운데'에 맞춘다.
import { useEffect, useRef } from 'react'
import type { EaseToOptions, Map as MlMap } from 'maplibre-gl'
import { dash, MAP_CANVAS_W, mapWidth, MENU } from '../dashboard/state'
import { slopeAreas } from '../menus/slope/data'
import { slope } from '../menus/slope/state'
import { MAP_CANVAS_H, mapState, SLOPE_MAP_H } from './state'

/** 메뉴 기본 카메라 — 배수펌프장·급경사지·지진가속도·재난 예·경보·레이어 공통 */
export const MENU_CENTER: [number, number] = [0.0, 0.0]
export const MENU_ZOOM = 12.74
/** 급경사지 총괄·관제 — 관리지역 89개소가 한눈에 (운영 지정값이라 가린 만큼 당기지 않는다) */
const SLOPE_OVERVIEW_CENTER: [number, number] = [0.0, 0.0]
const SLOPE_OVERVIEW_ZOOM = 12.13
/** 배수펌프장만 기울여 본다 */
const PUMP_PITCH = 60
const MENU_CAMERA_MS = 400
/** 급경사지에서 고른 곳 — 하나의 지점은 17, 상시계측 지역은 그 지구가 한눈에 14.9 */
const SLOPE_FOCUS_ZOOM = 17
const SLOPE_AREA_ZOOM = 14.9
/** 지구별로 따로 맞춘 카메라 (운영 지정값 — 가린 만큼 당기지 않는다) */
const SLOPE_AREA_CAMERA: Record<string, { center: [number, number]; zoom: number }> = {
  가상시설0432: { center: [0.0, 0.0], zoom: 15.99 },
}
/** 관리지역·계측기는 정보 창(340)이 오른쪽에 붙어 점과 창을 함께 가운데로 — 그 반만큼 더 당긴다 */
const POPUP_SHIFT = 170
/** 고른 이벤트로 — 왼쪽 이벤트 창(492 + 닫기 28)이 열려 있으면 그 반만큼 비켜서 */
const EVENT_ZOOM = 16
const EVENT_FLY_MS = 600
const EVENT_PANEL_SHIFT = 520 / 2
/** 검색 결과로 날아가기 */
const SEARCH_ZOOM = 16
const FLY_MS = 1200
/** 고른 곳으로 날아가는 중 (끝나는 때) — 메뉴 카메라가 끊지 않게 */
let flyUntil = 0
function fly(map: MlMap, options: Parameters<MlMap['flyTo']>[0] & { duration: number }) {
  flyUntil = performance.now() + options.duration
  map.flyTo(options)
}
const RESET_CAMERA_MS = 600
const CAMERA_MENUS: ReadonlySet<number> = new Set([MENU.pump, MENU.slope, MENU.earthquake, MENU.disaster, MENU.layer])

/** 아래를 가린 높이 — 급경사지는 머리 줄만큼 낮다 */
export const bottomCropOf = (menu: number) => MAP_CANVAS_H - (menu === MENU.slope ? SLOPE_MAP_H : MAP_CANVAS_H)

interface Options {
  map: MlMap | null
  menu: number
  /** 오른쪽을 가린 폭 */
  inset: number
  /** 지도 오른쪽이 다 움직일 때까지 기다리는 시간 */
  delayMs: number
  /** 지도 초기화 버튼·제목 누름 — 바뀔 때마다 기본 카메라로 */
  resetSeq: number
}

/** 메뉴 카메라 자리 (시간 빼고).
 *  서브탭을 바꿀 때는 다시 돌지 않는다 — 계측 상세에서 센서로 확대한 직후 기본 줌으로 튀지 않게 탭은 이때만 본다 */
function menuCamera(menu: number, inset: number): EaseToOptions {
  if (menu === MENU.slope && slope.get().tab === 'overview') return { center: SLOPE_OVERVIEW_CENTER, zoom: SLOPE_OVERVIEW_ZOOM, pitch: 0 }
  if (CAMERA_MENUS.has(menu)) return { center: MENU_CENTER, zoom: MENU_ZOOM, pitch: menu === MENU.pump ? PUMP_PITCH : 0, offset: [-(inset / 2), -(bottomCropOf(menu) / 2)] }
  // 메인·하천은 보던 자리 그대로, 기울기만 편다
  return { pitch: 0 }
}

export function useMenuCamera({ map, menu, inset, delayMs, resetSeq }: Options) {

  // 메뉴를 바꾸면 '다 옮겨 감'을 바로 푼다 (폭이 바뀌어 다시 옮길 때는 풀지 않음 — 붙은 마커가 깜빡이지 않게)
  useEffect(() => {
    mapState.set({ settledMenu: null, cameraMenu: null })
  }, [menu])

  // 관리자에 있는 동안 지도는 숨어 있다 — 나갈 때 숨은 채로 갈 메뉴 자리에 바로 둔다 (날아가는 게 보이지 않게, 사용자 10-23)
  const hiddenRef = useRef(false)
  useEffect(() => {
    if (!map) return
    if (menu === MENU.admin) {
      hiddenRef.current = true
      return
    }
    // 숨어 있던 지도 — 나타나기 전에 갈 메뉴 자리로 바로 옮겨 둔다 (가린 폭은 갈 메뉴 기준)
    if (hiddenRef.current) {
      map.stop()
      map.easeTo({ ...menuCamera(menu, MAP_CANVAS_W - mapWidth(menu, dash.get().cctvOpen)), duration: 0 })
      hiddenRef.current = false
    }
    let done = 0
    const timer = window.setTimeout(() => {
      mapState.set({ cameraMenu: menu })
      done = window.setTimeout(() => mapState.set({ settledMenu: menu }), MENU_CAMERA_MS)
      // 메인·하천은 기울기만 편다 — 검색·이벤트로 날아가는 중이면 그 비행이 이미 펴니 끊지 않는다
      //   (옛 화면은 여기서 끊어 검색 자리까지 못 가고 멈췄다 — 메뉴를 켠 채 검색할 때)
      if (!CAMERA_MENUS.has(menu) && performance.now() < flyUntil) return
      map.stop()
      map.easeTo({ ...menuCamera(menu, inset), duration: MENU_CAMERA_MS })
    }, delayMs)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(done)
    }
  }, [map, menu, inset, delayMs])

  useEffect(() => {
    // 0 은 처음 값 — 누른 적 없음
    if (!map || resetSeq === 0) return
    // 누른 순간에만 돈다 — 메뉴·폭은 그때 값을 읽는다 (바뀔 때마다 다시 돌지 않게)
    const { menu: now, layoutMenu, cctvOpen } = dash.get()
    const offset: [number, number] = [-((MAP_CANVAS_W - mapWidth(layoutMenu, cctvOpen)) / 2), 0]
    map.easeTo({ center: MENU_CENTER, zoom: MENU_ZOOM, pitch: now === MENU.pump ? PUMP_PITCH : 0, offset, duration: RESET_CAMERA_MS })
  }, [map, resetSeq])
}

/** 고른 곳으로 날아가기 (애니메이션 9번) — 주소 검색 결과, 급경사지에서 고른 곳, 이벤트 */
export function useFocusCamera(map: MlMap | null) {
  const search = dash.use((s) => s.searchTarget)
  const focus = slope.use((s) => s.focus)
  const event = dash.use((s) => s.activeEvent)
  const eventPanel = dash.use((s) => s.eventPanelOpen)
  const areas = slopeAreas.use()
  const areasRef = useRef(areas)
  useEffect(() => {
    areasRef.current = areas
  })

  // 검색 결과를 고를 때마다 (같은 곳을 다시 골라도 seq 가 바뀐다). 메뉴는 꺼지므로 기울기도 편다
  useEffect(() => {
    if (!map || !search) return
    fly(map, { center: [search.lng, search.lat], zoom: SEARCH_ZOOM, pitch: 0, duration: FLY_MS })
  }, [map, search])

  // 급경사지 목록·지역 탭·지도에서 고를 때마다 (급경사지 메뉴에서만). 다 날아가면 정보 창을 띄우라고 알린다
  //   메뉴·지역 수·폭은 그때 값을 읽는다 (바뀔 때마다 다시 날지 않게)
  useEffect(() => {
    if (!map || !focus || dash.get().menu !== MENU.slope) return
    // 앞 비행을 먼저 멈춘다 — 멈출 때 오는 끝(moveend)을 이번 끝으로 잘못 받지 않게
    map.stop()
    const onEnd = () => mapState.set({ flownSlope: focus })
    map.once('moveend', onEnd)
    const fixed = SLOPE_AREA_CAMERA[focus.name]
    if (fixed) {
      fly(map, { center: fixed.center, zoom: fixed.zoom, pitch: 0, duration: FLY_MS })
    } else {
      const { layoutMenu, cctvOpen } = dash.get()
      const inset = MAP_CANVAS_W - mapWidth(layoutMenu, cctvOpen)
      const withPopup = focus.managedAreaId != null || !!focus.sensor
      const isArea = areasRef.current.some((a) => a.name === focus.name)
      fly(map, {
        center: [focus.lng, focus.lat],
        zoom: isArea ? SLOPE_AREA_ZOOM : SLOPE_FOCUS_ZOOM,
        pitch: 0,
        offset: [-(inset / 2) - (withPopup ? POPUP_SHIFT : 0), -(bottomCropOf(MENU.slope) / 2)],
        duration: FLY_MS,
      })
    }
    return () => {
      map.off('moveend', onEnd)
    }
  }, [map, focus])

  // 이벤트를 고를 때, 그리고 고른 채 왼쪽 창을 열고 닫을 때 (가리지 않게 다시 맞춘다)
  useEffect(() => {
    if (!map || event?.lat == null || event.lng == null) return
    fly(map, { center: [event.lng, event.lat], zoom: EVENT_ZOOM, pitch: 0, offset: [eventPanel ? EVENT_PANEL_SHIFT : 0, 0], duration: EVENT_FLY_MS })
  }, [map, event, eventPanel])
}
