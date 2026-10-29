// 새 지도 상태 — 지도 엔진 인스턴스, 지도 종류, 켜 둔 도구.
//   지도 엔진은 React 바깥에서 움직이고, 화면 칸들은 여기서 필요한 값만 골라 구독한다.
import type { Map as MlMap } from 'maplibre-gl'
import type { TileType, ToolId } from '@/features/shared/map/MapControls'
import { createStore } from '@/shared/store'
import type { SlopeFocus } from '../menus/slope/state'

/** 지도 칸 높이 — 폭(MAP_CANVAS_W, dashboard/state)처럼 가장 클 때로 고정해 그리고 아래를 가린다 */
export const MAP_CANVAS_H = 840
/** 급경사지는 머리 줄만큼 낮다 */
export const SLOPE_MAP_H = 672

export interface MapState {
  /** 다 준비된(load) 지도 — 마커 부품은 이게 있을 때만 붙인다 */
  map: MlMap | null
  /** 지도를 못 띄움 (그래픽 가속 꺼짐 등) */
  error: string | null
  /** 지도 버튼으로 고른 종류. 메뉴의 기본 종류(일반·위성)가 바뀌면 버린다 */
  picked: { tile: TileType; forSatellite: boolean } | null
  /** 켜 둔 도구 (거리·면적·투망) */
  tool: ToolId | null
  /** 메뉴 카메라가 다 옮겨 간 메뉴 — 배수펌프장 마커처럼 기울기가 끝난 뒤 붙일 것들이 본다. 메뉴를 바꾸면 바로 null */
  settledMenu: number | null
  /** 메뉴 카메라가 옮기기 시작한 메뉴 (지도 오른쪽이 다 움직인 때) — CCTV 마커처럼 그때 붙일 것들이 본다. 메뉴를 바꾸면 바로 null */
  cameraMenu: number | null
  /** 급경사지에서 고른 곳으로 다 날아갔으면 그 고른 것 — 정보 창이 이때 뜬다 */
  flownSlope: SlopeFocus | null
}

export const mapState = createStore<MapState>({ map: null, error: null, picked: null, tool: null, settledMenu: null, cameraMenu: null, flownSlope: null })

/** 지금 보여 줄 지도 종류 — 고른 게 있으면 그것, 없으면 메뉴 기본(급경사지는 위성) */
export const tileOf = (picked: MapState['picked'], satellite: boolean): TileType =>
  picked && picked.forSatellite === satellite ? picked.tile : satellite ? 'satellite' : 'normal'
