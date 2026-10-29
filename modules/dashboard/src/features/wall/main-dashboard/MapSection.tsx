// 지도 영역 — MapLibre + V-World 베이스맵 + 시설물 마커/폴리곤.
//
// 메뉴 컨텍스트별 표출:
//   - 배수펌프장 메뉴 (idx 0) :
//       · 펌프 마커 + 배수구역 폴리곤 (interactive — hover 시 솟아오름 + 마커 강조)
//       · 지도 자동 기울기 (pitch 60)
//   - 레이어 메뉴 (idx 5) + 레이어 패널 '배수펌프' 체크 시 :
//       · 펌프 마커 + 배수구역 폴리곤 (flat — hover 없음)
//       · 평면 (pitch 0)
//   - 그 외 메뉴 : 표출 안 함

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Map as MlMap } from 'maplibre-gl'
import { MapBaseML } from '@/features/shared/map/MapBaseML'
import type { TileType } from '@/features/shared/map/MapControls'
import { PumpMarkers } from '@/features/shared/map/PumpMarkers'
import { PumpRegionPolygons } from '@/features/shared/map/PumpRegionPolygons'
import { BroadcastMarkers } from '@/features/shared/map/BroadcastMarkers'
import { SlopeAreaMarkers } from '@/features/shared/map/SlopeAreaMarkers'
import {
  SlopeInstrumentMarkers,
  type InstrumentPoint,
} from '@/features/shared/map/SlopeInstrumentMarkers'
import {
  SlopeAlertBubbles,
  BUBBLE_STEPS,
} from '@/features/shared/map/SlopeAlertBubbles'
import { ShelterMarkers } from '@/features/shared/map/ShelterMarkers'
import { AirStationMarkers } from '@/features/shared/map/AirStationMarkers'
import { SearchPinMarker } from '@/features/shared/map/SearchPinMarker'
import { EventFocusMarkerML } from '@/features/shared/map/EventFocusMarkerML'
import {
  CctvMarkersML,
  type SelectedCctv,
} from '@/features/shared/map/CctvMarkersML'
import { CctvPlayerPopup } from '@/features/shared/map/CctvPlayerPopup'
import { SlopeManagedAreaPopup } from '@/features/shared/map/SlopeManagedAreaPopup'
import { SlopeSensorPopup } from '@/features/shared/map/SlopeSensorPopup'
import type { SelectedSensor } from '@/features/menus/steep-slope/SlopeChartPanel'
import { Toast } from '@/components/notifications/Toast'

import { fetchPumpStations, type PumpStation } from '@/api/pumpStation'
import type { FacilityListItem } from '@/api/facility'
import type { EventListItem } from '@/api/event'
import { GRADE_COLOR } from '@/features/menus/steep-slope/variants'
import { useManagedAreas } from '@/features/menus/steep-slope/useManagedAreas'
import { useSlopeAreas } from '@/features/menus/steep-slope/useSlopeAreas'
import { useAlarmMap } from '@/features/menus/steep-slope/useAlarmMap'
import { RISK_BADGE_COLOR, riskOf } from '@/features/menus/steep-slope/variants'
import { useEarthquakeInstruments } from '@/features/menus/earthquake/useEarthquakeInstruments'
import { instrumentLabel } from '@/api/earthquake'
import { useShelters } from '@/features/menus/layer/useShelters'
import { useAirStations } from '@/features/menus/layer/useAirStations'
import { useLayerColorMap } from '@/features/menus/layer/layerColorStore'
import { MapLegend } from '@/features/menus/layer/MapLegend'
import { CCTV_LAYER_CODE } from '@/features/menus/layer/cctvLayer'
import { edgeAttr, edgeStyle, type MapEdge } from '@/features/shared/map/edge'

// 레이어 code (layerChecked / 마커 표출 게이트 key).
const LAYER_KEY_PUMP = 'PUMP_STATION'
const LAYER_KEY_ROCKFALL = 'SLOPE_ROCKFALL'
const LAYER_KEY_INCLINOMETER = 'SLOPE_INCLINOMETER'
const LAYER_KEY_RAIN_GAUGE = 'SLOPE_RAIN_GAUGE'
const LAYER_KEY_MOISTURE = 'SLOPE_MOISTURE'
const LAYER_KEY_BROADCAST = 'BROADCAST'
const LAYER_KEY_SIGNBOARD = 'SIGNBOARD'
const LAYER_KEY_AIR = 'AIR_QUALITY'
const LAYER_KEY_SHELTER = 'SHELTER'
const LAYER_KEY_MANAGED_AREA = 'SLOPE_MANAGED_AREA'
const LAYER_KEY_SLOPE_AREA = 'SLOPE_AREA'

// 마커 색 fallback — 레이어 메타 로드 전 (백엔드 색과 동일값).
const FALLBACK_COLOR_PUMP = '#2563EB' // PUMP_STATION
const FALLBACK_COLOR_SLOPE = '#F59E0B' // SLOPE_AREA
const FALLBACK_COLOR_MANAGED = '#D97706' // SLOPE_MANAGED_AREA

// 급경사지 목록 항목 선택 시 확대 레벨.
const SLOPE_FOCUS_ZOOM = 17
/** 급경사지 총괄·관제 진입 카메라 — 관리지역 89개소가 한 눈에 들어오는 위치(운영 지정값). */
const SLOPE_OVERVIEW_CENTER: [number, number] = [0.0, 0.0]
const SLOPE_OVERVIEW_ZOOM = 12.13

/** 상시계측 지역 선택 시 줌 — 지구 마커가 한 눈에 들어오는 값 (지구 중심 기준). */
const SLOPE_AREA_ZOOM = 14.9

/** 지구별로 따로 맞춘 카메라(운영 지정값). 여기 있으면 중심까지 이 값을 쓴다. */
const SLOPE_AREA_CAMERA: Record<
  string,
  { center: [number, number]; zoom: number }
> = {
  가상시설0432: { center: [0.0, 0.0], zoom: 15.99 },
}

// 급경사지 조기경보 범례 — 발령 빈도 버블의 건수 구간 색과 동일.
const SLOPE_ALERT_LEGEND = BUBBLE_STEPS.map((s, i) => ({
  key: `BUBBLE_${s.min}`,
  label:
    i === BUBBLE_STEPS.length - 1
      ? `${s.min}건 이상`
      : s.min === 0
        ? '0건'
        : `${s.min}~${BUBBLE_STEPS[i + 1].min - 1}건`,
  color: s.color,
}))

// 급경사지 등급 범례 — 마커 색과 같은 팔레트 (A 정상 → E 심각).
const SLOPE_GRADE_LEGEND = Object.entries(GRADE_COLOR).map(([g, color]) => ({
  key: g,
  label: `${g}등급`,
  color,
}))
const FALLBACK_COLOR_ROCKFALL = '#EA580C' // SLOPE_ROCKFALL
const FALLBACK_COLOR_INCLINOMETER = '#16A34A' // SLOPE_INCLINOMETER
const FALLBACK_COLOR_RAIN_GAUGE = '#84CC16' // SLOPE_RAIN_GAUGE
const FALLBACK_COLOR_MOISTURE = '#059669' // SLOPE_MOISTURE
const FALLBACK_COLOR_SEISMOMETER = '#784D27' // SEISMOMETER
const FALLBACK_COLOR_BROADCAST = '#DB2777' // BROADCAST
const FALLBACK_COLOR_SIGNBOARD = '#10B981' // SIGNBOARD
const FALLBACK_COLOR_AIR = '#0EA5E9' // AIR_QUALITY
const FALLBACK_COLOR_SHELTER = '#06B6D4' // SHELTER

// 메뉴 진입 시 자동 적용 카메라.
//   center/zoom 은 4 메뉴 (배수펌프장/급경사지/지진가속도/재난예경보/레이어) 공유 default.
//   pitch 는 배수펌프장만 60°, 그 외 평면(0°).
const MENU_DEFAULT_CENTER: [number, number] = [0.0, 0.0]
const MENU_DEFAULT_ZOOM = 12.74
// 지도 canvas 고정 크기 — 부모가 줄어도 리사이즈하지 않고 잘라서 보여준다.
// CCTV 를 접으면 지도가 1888 까지 넓어지므로 canvas 는 그 최대 폭으로 고정한다.
//   (부모 크기를 따라 resize 하면 매 프레임 리페인트가 겹쳐 지도가 떨린다.)
const MAP_CANVAS_WIDTH = 1888
const MAP_CANVAS_HEIGHT = 840

// 메뉴 전환 카메라 이동 시간.
const MENU_CAMERA_MS = 400
// 레이아웃(폭/높이) 애니메이션이 끝나는 시점 — 이후에 카메라를 움직이고 마커를 붙인다.
const LAYOUT_SETTLE_MS = 420

/** 켜질 때만 늦추고(레이아웃 애니메이션 뒤), 꺼질 때는 즉시 반영.
 *  지연은 'anchor 시각(메뉴 전환 시점)' 기준 — 이미 지난 만큼은 기다리지 않는다.
 *  (서브탭 전환처럼 레이아웃이 그대로인 경우 즉시 표출) */
function useDeferredOn(
  value: boolean,
  delayMs: number,
  anchorRef?: React.RefObject<number>,
): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!value) {
      setOn(false)
      return
    }
    const since = anchorRef ? performance.now() - anchorRef.current : 0
    const wait = Math.max(0, delayMs - since)
    const t = window.setTimeout(() => setOn(true), wait)
    return () => window.clearTimeout(t)
  }, [value, delayMs, anchorRef])
  return on
}
const PUMP_MENU_PITCH = 60
const FLAT_PITCH = 0

// 이벤트 flyTo — 좌측 EventPanel(492 + close 28 = 520) 가리는 만큼 center 를 우측으로 보정.
const EVENT_PANEL_OFFSET_X = 520 / 2
const EVENT_FOCUS_ZOOM = 16

// 자동 카메라 적용 메뉴 — 배수펌프장(0)/급경사지(2)/지진가속도(3)/재난예경보(4)/레이어(5).
//   하천(1) 은 RiverFacilityOverlay 라 지도 안 보임 → 제외. -1(미선택) 도 제외.
const CAMERA_MENU_INDICES: ReadonlySet<number> = new Set([0, 2, 3, 4, 5])

// 지도 위에 동시에 띄울 수 있는 CCTV 플레이어 수.
const MAX_MAP_PLAYERS = 3
const PLAYER_LIMIT_MESSAGE = `최대 ${MAX_MAP_PLAYERS}개까지 재생됩니다.
재생중인 플레이어를 종료해주세요.
초기화 버튼을 누르면 플레이어가 전부 종료됩니다.`

// 폴리곤 fill opacity — 위성/지형도(어두운 배경) 에서는 더 진하게.
const POLYGON_OPACITY_NORMAL = 0.28
const POLYGON_OPACITY_DARK = 0.5

interface Props {
  /** 현재 활성 메뉴 (idx 0 = 배수펌프장, idx 5 = 레이어 메뉴 등). */
  activeTabIdx: number
  /** 기본 타일 (없으면 일반) — 새 화면은 급경사지에서 위성 */
  defaultTileType?: TileType
  /** 급경사지 총괄·관제 — 위험지역(3) 대신 관리지역(89) 마커 표출. */
  slopeManagedMarkers?: boolean
  /** CCTV 마커 표출 판정용 메뉴 — 전환이 끝난 뒤 값(settled). 미지정 시 activeTabIdx. */
  cctvMarkersTabIdx?: number
  /** 카메라 이동을 시작할 시점 (ms) — 지도 폭 변화가 끝난 뒤여야 화면이 안 떨린다. */
  cameraDelayMs?: number
  /** 타일이 안 깔린 곳의 지도 바탕색 (기본 밝은 회색) */
  mapBackground?: string
  /** 지도 종류를 바꿀 때 이전 지도를 새 조각이 다 깔릴 때까지 남김 */
  keepOldTiles?: boolean
  onMenuCameraSettled?: (menu: number) => void
  /** 급경사지 계측 상세 — 지역 3곳 + 계측기 마커 (/slope/api/areas nested). */
  slopeMeasureMarkers?: boolean
  /** 급경사지 조기경보·통계 — 지역별 발령 빈도 버블. */
  slopeAlertBubbles?: boolean
  /** 발령 버블 조회 기간 — 통계 패널의 선택 기간과 맞춘다. */
  alarmRange?: { from: string; to: string } | null
  /** 목록에서 고른 급경사지 — 해당 위치로 flyTo + 마커를 물방울/라벨로 강조. */
  slopeFocus?: { name: string; lng: number; lat: number; seq: number; managedAreaId?: number; sensor?: SelectedSensor } | null
  onCloseSlopeInfo?: () => void
  /** 레이어 패널 체크 상태 — 레이어 메뉴 시 마커/폴리곤 표출 결정. */
  layerChecked: Record<string, boolean>
  /** 레이어 패널 라벨보기 상태 — 마커 하단 라벨 노출 여부 (쉼터 등). */
  layerLabelOn?: Record<string, boolean>
  /** 방송장비 목록 — 재난 예·경보 메뉴 (idx 4) 시 마커 표출. */
  broadcastList?: readonly FacilityListItem[]
  /** DisasterPanel 에서 체크된 방송장비 id — 마커 강조. */
  broadcastEmphasizedIds?: ReadonlySet<number>
  /** 재해문자전광판 목록 — 재난 예·경보 메뉴 (idx 4) 시 마커 표출. */
  signboardList?: readonly FacilityListItem[]
  /** DisasterPanel 에서 체크된 전광판 id — 마커 강조. */
  signboardEmphasizedIds?: ReadonlySet<number>
  /** 재난 예·경보 활성 모드 — voice(자동음성통보) 시 방송장비만, sign(재해문자전광판) 시 전광판만 표출. */
  disasterMode?: 'voice' | 'sign'
  /** 재난 예·경보 마커 클릭 — 패널에서 그 시설물을 선택/해제한다. */
  onSelectDisasterFacility?: (kind: 'voice' | 'sign', id: number) => void
  /** 주소 검색 결과 클릭 → flyTo 타깃 (seq 변경 시마다 재트리거). */
  searchTarget?: { lng: number; lat: number; seq: number } | null
  /** 타이틀 리셋 신호 — 변경 시 기본 카메라 (default center/zoom, pitch 0) 로 ease. */
  resetSeq?: number
  /** 활성 이벤트 — 변경 시 flyTo + 마커 표출. */
  activeEvent?: EventListItem | null
  /** 이벤트 마커 "투망종료" 클릭 → 활성 해제. */
  onDeactivateEvent?: () => void
  /** EventPanel 열림 — flyTo 시 좌측 패널 offset 적용 여부. */
  isEventPanelOpen?: boolean
  /** CCTV 목록 — 메인 지도에 항상 표출 (DashboardPage 의 useCctvSelection 공유, 중복 fetch 방지). */
  cctvList?: readonly FacilityListItem[]
  /** 레이어 메뉴에서 표시할 CCTV id — 목록을 갈아끼우지 않고 filter 로만 걸러낸다. */
  cctvVisibleIds?: ReadonlySet<number>
  /** 현재 메뉴 분류에 속한 CCTV — 메뉴 진입 시 클러스터 없이 이 목록만 마커로 그린다. */
  menuCctvList?: readonly FacilityListItem[]
  /** 우 패널에 표출 중인 5개 — 지도에서 reticle + 순위 배지로 강조. */
  selectedCctvList?: readonly FacilityListItem[]
  /** 지도 영역이 좁아진(우측 crop) 폭 — 컨트롤을 visible 우측에 고정. */
  overlayRightInset?: number
  /** 새 화면 전용 — 오른쪽 끝 요소 자리 고정 + translate 이동 (CCTV 접기 움직임, shared/map/edge.ts) */
  overlayEdge?: MapEdge
  /** 새 화면 — false 면 메인에서도 CCTV 마커를 묶지 않는다 (메뉴 화면과 같게, 10-19 사용자 결정). 기본 true */
  cctvCluster?: boolean
  /** 카메라 보정용 crop 폭 — 메뉴 클릭 즉시 확정되는 값 (overlay 는 한 프레임 늦다). */
  cameraRightInset?: number
  /** 지도가 다른 화면(상세/오버레이)으로 가려짐 — 컨트롤/측정 숨김 + 툴 초기화. */
  hideControls?: boolean
  /** 초기화 버튼 — 지도 카메라 기본값 복귀 요청 (부모가 resetSeq bump). */
  onResetView?: () => void
  /** 투망 지점 — 지도 클릭으로 찍힌 좌표. 검색 핀과 동일한 마커로 표출. */
  netTarget?: { lng: number; lat: number } | null
  /** 투망 지점 선택/해제 통보. */
  onNetPick?: (target: { lng: number; lat: number } | null) => void
  /** 투망 툴 활성화 통보 — 부모가 주소 검색 상태 초기화. */
  onNetActivate?: () => void
  /** 지도 CCTV 팝업의 확대 버튼 — 부모가 기존 CCTV 모달을 연다. */
  onExpandCctv?: (cctv: { number: number; name: string; cctvId?: string }) => void
}

// 범례 자리 전환 (옛 화면) — 지도 폭과 함께 오른쪽·아래가 움직인다
const LEGEND_TRANSITION =
  'right 0.4s cubic-bezier(0.33, 1, 0.68, 1) var(--map-shift-delay, 0s), bottom 0.4s cubic-bezier(0.33, 1, 0.68, 1) var(--map-shift-delay, 0s)'

export function MapSection({
  activeTabIdx,
  defaultTileType,
  cctvMarkersTabIdx,
  cameraDelayMs = LAYOUT_SETTLE_MS,
  mapBackground,
  keepOldTiles,
  onMenuCameraSettled,
  slopeManagedMarkers,
  slopeMeasureMarkers,
  slopeAlertBubbles,
  alarmRange = null,
  slopeFocus,
  onCloseSlopeInfo,
  layerChecked,
  layerLabelOn = {},
  broadcastList = [],
  broadcastEmphasizedIds,
  signboardList = [],
  signboardEmphasizedIds,
  disasterMode = 'voice',
  onSelectDisasterFacility,
  searchTarget,
  resetSeq = 0,
  activeEvent = null,
  onDeactivateEvent,
  isEventPanelOpen = false,
  cctvList = [],
  cctvVisibleIds,
  menuCctvList = [],
  selectedCctvList = [],
  overlayRightInset = 0,
  overlayEdge,
  cctvCluster = true,
  cameraRightInset,
  hideControls = false,
  onResetView,
  netTarget = null,
  onNetPick,
  onNetActivate,
  onExpandCctv,
}: Props) {
  // 펌프장 데이터 — 마커/폴리곤 hover 연동에 필요.
  const [pumpStations, setPumpStations] = useState<PumpStation[]>([])
  useEffect(() => {
    fetchPumpStations()
      .then(setPumpStations)
      .catch((err) => console.warn('[pump-stations] fetch 실패', err))
  }, [])

  // 마커는 레이아웃 전환이 끝난 뒤 붙인다 — 수십~수백 개를 전환 프레임에 만들면 버벅인다.
  // 메뉴가 바뀐 시각 — 마커 지연의 기준점. 서브탭 전환은 이 값이 갱신되지 않아 즉시 표출된다.
  const menuChangedAtRef = useRef(performance.now())
  useEffect(() => {
    menuChangedAtRef.current = performance.now()
  }, [activeTabIdx])

  // 급경사지 관리지역 (89개소) — 총괄·관제 + 레이어 메뉴. 모듈 캐시 (목록 패널과 공유).
  const managedAreas = useManagedAreas()
  // 좌표 없는 건은 마커에서 뺀다 (lat/lng nullable).
  const managedMarkers = useMemo(
    () =>
      managedAreas.flatMap((a) =>
        a.lat === null || a.lng === null
          ? []
          : [{ name: a.name, lat: a.lat, lng: a.lng, grade: a.grade ?? undefined }],
      ),
    [managedAreas],
  )
  const showManagedMarkers = useDeferredOn(
    !!slopeManagedMarkers,
    cameraDelayMs,
    menuChangedAtRef,
  )

  // 급경사지 위험지역 3곳 + 계측기 — 계측 상세(idx 2)에서 1분 폴링.
  //   계측 상세를 벗어나면 hook 이 폴링을 멈추므로 그때만 구독한다.
  const slopeAreas = useSlopeAreas()
  const showMeasureMarkers = useDeferredOn(
    !!slopeMeasureMarkers,
    cameraDelayMs,
    menuChangedAtRef,
  )
  const showAlertBubbles = useDeferredOn(
    !!slopeAlertBubbles,
    cameraDelayMs,
    menuChangedAtRef,
  )
  // 발령 빈도 버블 — 통계 패널과 같은 기간을 본다.
  const alarmPoints = useAlarmMap(
    alarmRange?.from ?? null,
    alarmRange?.to ?? '',
    !!slopeAlertBubbles,
  )
  const bubbles = useMemo(
    () =>
      alarmPoints.flatMap((p) =>
        p.lat === null || p.lng === null
          ? []
          : [{ name: p.name, lat: p.lat, lng: p.lng, count: p.count }],
      ),
    [alarmPoints],
  )
  // 지역에 딸린 계측기 — 계측 상세 / 레이어 메뉴의 종류별 마커.
  const instrumentPoints = useMemo<InstrumentPoint[]>(
    () =>
      slopeAreas.flatMap((a) =>
        a.instruments
          .filter((i) => i.lat !== null && i.lng !== null)
          .map((i) => ({ ...i, area: a.name })),
      ),
    [slopeAreas],
  )
  // 카메라 effect 는 목록이 바뀔 때마다 다시 돌면 안 된다 — 최신 값만 ref 로 본다.
  const managedMarkersRef = useRef(managedMarkers)
  managedMarkersRef.current = managedMarkers
  // 서브탭(총괄·관제 ↔ 계측 상세) 전환으로 메뉴 카메라가 다시 돌면 안 된다 —
  //   계측 상세에서 센서로 확대한 직후 기본 줌으로 튄다. 값은 ref 로만 본다.
  const slopeManagedRef = useRef(slopeManagedMarkers)
  slopeManagedRef.current = slopeManagedMarkers
  const slopeAreasRef = useRef(slopeAreas)
  slopeAreasRef.current = slopeAreas

  const areaMarkers = useMemo(
    () =>
      slopeAreas.flatMap((a) =>
        a.lat === null || a.lng === null
          ? []
          : [
              {
                name: a.name,
                lat: a.lat,
                lng: a.lng,
                grade: riskOf(a.level),
              },
            ],
      ),
    [slopeAreas],
  )

  // 무더위쉼터 — 레이어 메뉴 (idx 5) + SHELTER 체크 시 마커 표출. 모듈 캐시.
  const shelters = useShelters()

  // 대기질 측정소 — 레이어 메뉴 (idx 5) + AIR_QUALITY 체크 시 마커 표출. 모듈 캐시.
  const airStations = useAirStations()

  // 레이어별 유효 색 (code → override ?? 백엔드색) — 마커 색을 레이어 색으로 통일. 로드 전엔 fallback.
  const layerColors = useLayerColorMap()

  // map instance — MapBaseML onReady 콜백으로 받음.
  const [map, setMap] = useState<MlMap | null>(null)

  // 현재 타일 — 위성/지형도에서 폴리곤 진하게 (어두운 배경 대비).
  const [tileType, setTileType] = useState<TileType>('normal')
  const polygonOpacity =
    tileType === 'normal' ? POLYGON_OPACITY_NORMAL : POLYGON_OPACITY_DARK

  // 지도에서 고른 CCTV — 영상 팝업. 최대 MAX_MAP_PLAYERS 개까지 동시에 띄운다.
  //   닫으면 deactivateSeq 를 올려 마커 active 도 해제.
  const [popupCctvs, setPopupCctvs] = useState<SelectedCctv[]>([])
  const [deactivateSeq, setDeactivateSeq] = useState(0)
  const [playerToast, setPlayerToast] = useState<string | null>(null)

  // 메뉴를 켜거나 끄면 지도 위 플레이어는 모두 닫는다 (마커 세트가 바뀌므로).
  useEffect(() => {
    setPopupCctvs([])
    setDeactivateSeq((n) => n + 1)
  }, [activeTabIdx])

  // 재생 중인 CCTV id — 마커 active(물방울) 유지 + 클러스터 목록 비활성 판정에 쓴다.
  const activeCctvIds = useMemo(
    () => new Set(popupCctvs.map((c) => c.id)),
    [popupCctvs],
  )

  // 마커/클러스터에서 CCTV 를 고른 순간 — 이미 열려 있으면 그대로, 3개를 넘으면 안내.
  const openCctvPopup = useCallback((cctv: SelectedCctv) => {
    setPopupCctvs((prev) => {
      if (prev.some((c) => c.id === cctv.id)) return prev
      if (prev.length >= MAX_MAP_PLAYERS) {
        setPlayerToast(PLAYER_LIMIT_MESSAGE)
        // 열리지 않았으니 방금 누른 마커의 active(물방울)도 되돌린다.
        setDeactivateSeq((n) => n + 1)
        return prev
      }
      return [...prev, cctv]
    })
  }, [])

  // hover 된 배수구역 — interactive 모드일 때만 set 됨. 펌프 마커 강조 연동.
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)

  // 표출 컨텍스트 결정:
  //   pump 메뉴(0)  → 마커 + 폴리곤(interactive)
  //   레이어(5)+체크 → 마커 + 폴리곤(flat)
  //   그 외        → 둘 다 안 함
  const isPumpMenu = activeTabIdx === 0
  const isLayerMenuChecked =
    activeTabIdx === 5 && layerChecked[LAYER_KEY_PUMP] === true
  //   배수펌프장 메뉴는 3D(pitch 60°) 전환이 끝난 뒤 표출 — 기울어지는 도중에 그려지면 어수선하다.
  const pumpReady = useDeferredOn(
    isPumpMenu,
    cameraDelayMs + MENU_CAMERA_MS,
    menuChangedAtRef,
  )
  const showPumpFeatures = (isPumpMenu && pumpReady) || isLayerMenuChecked
  // CCTV 마커 — 레이어 패널의 CCTV 체크가 메인(메뉴 미선택) 포함 모든 화면에 적용
  //   (다른 레이어와 달리 레이어 메뉴 안에서만 유효한 설정이 아님).
  //   단 전용 메뉴(배수펌프장/급경사지/지진/재난) 는 그 메뉴의 마커 화면이라 숨긴다.
  //   레이어 메뉴(5) 는 예외 — 거기서는 체크 자체가 표출 요청이다.
  //   나타날 때는 CCTV 목록이 정해지는 시점(settled)에 맞추고,
  //   사라질 때는 메뉴를 누른 즉시(active) 숨긴다.
  const cctvMenuIdx = cctvMarkersTabIdx ?? activeTabIdx
  const cctvMarkerMenu = (idx: number) => idx === -1 || idx === 5
  // 분류가 있는 메뉴 — 그 메뉴 CCTV 만 낱개 마커로 (클러스터 없음).
  //   재난 예·경보(4)는 방송단말·전광판 마커가 주라 CCTV 는 표출하지 않는다.
  const menuCctvMarkerMenu = (idx: number) =>
    idx === 0 || idx === 2 || idx === 3
  //   빠르게 토글하면 settled 가 아직 이전 값이라 지연 없이 떠버리므로,
  //   표출 자체에도 '켤 때만' 지연을 건다 (끌 때는 즉시).
  //   CCTV 레이어 체크는 레이어 메뉴 안에서만 적용한다 (레이어 독립 운영) —
  //   레이어에서 끄고 나오면 기본 화면 마커까지 사라지던 문제.
  const cctvMarkersOn =
    cctvMarkerMenu(cctvMenuIdx) &&
    cctvMarkerMenu(activeTabIdx) &&
    (activeTabIdx !== 5 || layerChecked[CCTV_LAYER_CODE] === true)
  const showCctvMarkers = useDeferredOn(
    cctvMarkersOn,
    cameraDelayMs,
    menuChangedAtRef,
  )
  // 메뉴 CCTV 마커 — 그 메뉴 분류의 CCTV 만 (레이어 체크와 무관하게 메뉴에 들어가면 표출).
  //   전환이 끝난 뒤(settled) 나타나고, 메뉴를 뜨는 즉시 사라진다.
  const showMenuCctvMarkers = useDeferredOn(
    menuCctvMarkerMenu(cctvMenuIdx) && menuCctvMarkerMenu(activeTabIdx),
    cameraDelayMs,
    menuChangedAtRef,
  )
  // 지진가속도 계측기 — 같은 건물의 여러 센서가 같은 좌표로 오므로 좌표 단위로 묶는다.
  const seismoInstruments = useEarthquakeInstruments()
  const seismoMarkers = useMemo(() => {
    const byPos = new Map<string, { name: string; lat: number; lng: number }>()
    for (const i of seismoInstruments) {
      if (!Number.isFinite(i.lat) || !Number.isFinite(i.lng)) continue
      const key = `${i.lat},${i.lng}`
      const prev = byPos.get(key)
      if (prev) prev.name = `${prev.name}, ${instrumentLabel(i)}`
      else byPos.set(key, { name: instrumentLabel(i), lat: i.lat, lng: i.lng })
    }
    return [...byPos.values()]
  }, [seismoInstruments])
  const seismoColor = layerColors.SEISMOMETER ?? FALLBACK_COLOR_SEISMOMETER

  // 메뉴별 범례 항목 — 급경사지(2)는 서브탭마다 달라 아래에서 따로 그린다.
  const menuLegendItems = useMemo(() => {
    if (activeTabIdx === 0) {
      return [
        {
          key: 'PUMP_STATION',
          label: '배수펌프장',
          color: layerColors.PUMP_STATION ?? FALLBACK_COLOR_PUMP,
        },
      ]
    }
    if (activeTabIdx === 3) {
      return [
        { key: 'SEISMOMETER', label: '지진가속도계', color: seismoColor },
      ]
    }
    if (activeTabIdx === 4) {
      return [
        {
          key: 'BROADCAST',
          label: '자동 음성 통보',
          color: layerColors.BROADCAST ?? FALLBACK_COLOR_BROADCAST,
        },
        {
          key: 'SIGNBOARD',
          label: '재해 문자 전광판',
          color: layerColors.SIGNBOARD ?? FALLBACK_COLOR_SIGNBOARD,
        },
      ]
    }
    return []
  }, [activeTabIdx, layerColors, seismoColor])

  // 지도 canvas 는 840 고정이고 부모가 아래를 잘라낸다 (급경사지 672).
  //   범례처럼 하단 기준으로 붙는 요소는 잘린 만큼 올려야 화면에 남는다.
  const mapBottomCrop = MAP_CANVAS_HEIGHT - (activeTabIdx === 2 ? 672 : 840)
  // 마커를 활성화할 때 쓰는 카메라 보정 — 잘린 폭/높이의 절반만큼 당겨야
  //   'canvas 중앙' 이 아니라 '보이는 영역 중앙' 에 마커가 온다.
  const markerCameraOffset: [number, number] = [
    -(overlayRightInset / 2),
    -(mapBottomCrop / 2),
  ]

  const polygonMode: 'interactive' | 'flat' = isPumpMenu
    ? 'interactive'
    : 'flat'

  // 레이어 메뉴(idx 5) — 체크된 시설물 마커를 표출 (진짜 레이어 토글).
  //   전용 메뉴(펌프 0 / 급경사지 2 / 재난 4)와 별개로, 레이어 메뉴에선 체크만으로 표출.
  //   라벨은 각 레이어 라벨보기 토글(layerLabelOn) 연동.
  const inLayerMenu = activeTabIdx === 5
  const layerOn = (code: string) =>
    inLayerMenu && layerChecked[code] === true
  const labelOn = (code: string) => layerLabelOn[code] === true
  const showShelters = layerOn(LAYER_KEY_SHELTER)
  const showLayerManagedArea = layerOn(LAYER_KEY_MANAGED_AREA)
  const showLayerSlopeArea = layerOn(LAYER_KEY_SLOPE_AREA)
  const showLayerBroadcast = layerOn(LAYER_KEY_BROADCAST)
  const showLayerSignboard = layerOn(LAYER_KEY_SIGNBOARD)
  const showLayerAir = layerOn(LAYER_KEY_AIR)

  const cameraSettledRef = useRef(onMenuCameraSettled)
  cameraSettledRef.current = onMenuCameraSettled
  // 메뉴별 자동 카메라:
  //   배수펌프장(0)/급경사지(2)/지진(3)/재난예경보(4)/레이어(5) 진입 시 default center/zoom 으로 ease.
  //   배수펌프장만 pitch 60°, 나머지는 pitch 0°.
  //   하천(1)/미선택(-1) 은 center/zoom 사용자 위치 유지, pitch 만 0° 으로 복귀 (배수펌프장 해제 시 2D 로 자동).
  //   레이아웃(지도 폭/높이) 애니메이션이 끝난 뒤에 카메라를 한 번만 움직인다.
  //   동시에 돌리면 매 프레임 지도 리페인트가 겹쳐 버벅이고, 크롭 폭이 계속 변해
  //   중심이 흐르는 것처럼 보인다.
  useEffect(() => {
    if (!map) return
    const inset = cameraRightInset ?? overlayRightInset
    // 아래쪽이 잘리는 화면(급경사지 672)은 보이는 영역 중앙이 canvas 중앙보다 위에 있다.
    const bottomCrop = MAP_CANVAS_HEIGHT - (activeTabIdx === 2 ? 672 : 840)
    const onMoveEnd = () => cameraSettledRef.current?.(activeTabIdx)
    const timer = window.setTimeout(() => {
      map.stop()
      map.once('moveend', onMoveEnd)
      // 급경사지 총괄·관제 — 관리지역 89개소가 한 눈에 들어오는 고정 카메라.
      //   운영에서 직접 맞춘 값이라 crop 보정 없이 그대로 쓴다 (그 화면이 곧 기준).
      if (activeTabIdx === 2 && slopeManagedRef.current) {
        map.easeTo({
          center: SLOPE_OVERVIEW_CENTER,
          zoom: SLOPE_OVERVIEW_ZOOM,
          pitch: FLAT_PITCH,
          duration: MENU_CAMERA_MS,
        })
      } else if (CAMERA_MENU_INDICES.has(activeTabIdx)) {
        map.easeTo({
          center: MENU_DEFAULT_CENTER,
          zoom: MENU_DEFAULT_ZOOM,
          pitch: isPumpMenu ? PUMP_MENU_PITCH : FLAT_PITCH,
          // canvas 는 1236 고정이고 우측이 잘리므로, 잘린 폭의 절반만큼 왼쪽으로 보정.
          offset: [-(inset / 2), -(bottomCrop / 2)],
          duration: MENU_CAMERA_MS,
        })
      } else {
        map.easeTo({ pitch: FLAT_PITCH, duration: MENU_CAMERA_MS })
      }
    }, cameraDelayMs)
    return () => {
      window.clearTimeout(timer)
      map.off('moveend', onMoveEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, activeTabIdx, isPumpMenu, cameraRightInset, cameraDelayMs])

  // 주소 검색 결과 → flyTo. seq 변경마다 발동 (같은 좌표 재클릭 포함).
  //   메뉴 해제와 동시에 발동되므로 pitch 0 포함 — 메뉴 카메라 easeTo 를 대체 (마지막 호출 우선).
  useEffect(() => {
    if (!map || !searchTarget) return
    map.flyTo({
      center: [searchTarget.lng, searchTarget.lat],
      zoom: 16,
      pitch: FLAT_PITCH,
      duration: 1200,
    })
  }, [map, searchTarget])

  // 급경사지 목록 항목 선택 → 그 위치로 확대 이동.
  //   canvas 는 항상 1236 인데 급경사지 화면은 784 만 보인다 (우측 crop).
  //   canvas 중심으로 이동하면 마커가 보이는 영역의 오른쪽에 치우치므로 crop 절반만큼 왼쪽으로 보정.
  //   급경사지 메뉴에서 선택했을 때만, 그리고 선택(seq) 이 바뀔 때만 이동한다.
  //   crop 보정값을 deps 에 넣으면 다른 메뉴로 갈 때도 재실행돼 엉뚱한 곳으로 날아간다.
  const insetRef = useRef(overlayRightInset)
  insetRef.current = overlayRightInset
  const [settledSlopeFocus, setSettledSlopeFocus] = useState<typeof slopeFocus>(null)
  // 계측기 팝업 닫기 — 선택·차트는 유지하고 팝업만 숨긴다 (닫은 선택의 seq).
  const [closedSensorSeq, setClosedSensorSeq] = useState<number | null>(null)
  useEffect(() => {
    if (!map || !slopeFocus || activeTabIdx !== 2) return
    // 이전 이동의 moveend가 새 선택의 완료로 처리되지 않도록 먼저 정지한다.
    map.stop()
    const onMoveEnd = () => setSettledSlopeFocus(slopeFocus)
    map.once('moveend', onMoveEnd)
    const cleanup = () => { map.off('moveend', onMoveEnd) }
    const offset: [number, number] = [
      // 관리지역·계측기는 마커(좌측 여유 24px) + 간격 24px + 팝업 340px를 함께 중앙 정렬.
      -(insetRef.current / 2) - (slopeFocus.managedAreaId != null || slopeFocus.sensor ? 170 : 0),
      -((MAP_CANVAS_HEIGHT - 672) / 2),
    ]
    // 지역 탭 선택 — 그 지구가 한 눈에 들어오는 줌.
    //   (목록/센서에서 고른 개별 지점은 기존처럼 더 확대.)
    const fixed = SLOPE_AREA_CAMERA[slopeFocus.name]
    if (fixed) {
      // 직접 맞춘 화면이라 crop 보정 없이 그대로 쓴다.
      map.flyTo({
        center: fixed.center,
        zoom: fixed.zoom,
        pitch: FLAT_PITCH,
        duration: 1200,
      })
      return cleanup
    }
    const isArea = slopeAreasRef.current.some((a) => a.name === slopeFocus.name)
    map.flyTo({
      center: [slopeFocus.lng, slopeFocus.lat],
      zoom: isArea ? SLOPE_AREA_ZOOM : SLOPE_FOCUS_ZOOM,
      pitch: FLAT_PITCH,
      offset,
      duration: 1200,
    })
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, slopeFocus])

  // 이벤트 선택 → flyTo (패널 열림 시 좌측 offset 보정).
  //   마커는 activeEvent 기준 즉시 표출 — MapLibre 마커는 좌표 geo-anchor 라 flyTo 중에도 안 튐.
  useEffect(() => {
    if (!map || !activeEvent) return
    map.flyTo({
      center: [activeEvent.lng, activeEvent.lat],
      zoom: EVENT_FOCUS_ZOOM,
      pitch: FLAT_PITCH,
      offset: [isEventPanelOpen ? EVENT_PANEL_OFFSET_X : 0, 0],
      duration: 600,
    })
  }, [map, activeEvent, isEventPanelOpen])

  // 타이틀 리셋 / 지도 초기화 버튼 — 메뉴 진입과 동일한 기본 카메라로 복귀.
  //   배수펌프장 메뉴가 켜져 있으면 그 메뉴의 기본값인 기울기(60°) 유지.
  //   mount 시 (초기값) 는 skip. 메뉴 해제 easeTo 와 같은 commit 이어도 나중 호출이라 우선.
  const prevResetSeqRef = useRef(resetSeq)
  useEffect(() => {
    if (!map) return
    if (prevResetSeqRef.current === resetSeq) return
    prevResetSeqRef.current = resetSeq
    // 초기화 — 지도 위 플레이어도 전부 닫는다 (안내 문구와 동일 동작).
    setPopupCctvs([])
    setDeactivateSeq((n) => n + 1)
    map.easeTo({
      center: MENU_DEFAULT_CENTER,
      zoom: MENU_DEFAULT_ZOOM,
      pitch: isPumpMenu ? PUMP_MENU_PITCH : FLAT_PITCH,
      offset: [-((cameraRightInset ?? overlayRightInset) / 2), 0],
      duration: 600,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, resetSeq])

  return (
    // 1236×840 고정 — 부모 section 이 transition 으로 좁아지거나 낮아져도 canvas 는 변동 X.
    //   maplibre resize 가 매 프레임 돌면 지도가 덜덜 떨린다 (급경사지 840↔672 구간).
    //   부모 section 의 overflow hidden 으로 우/하단이 자연스럽게 cropping.
    <div
      className="relative"
      style={{
        width: `${MAP_CANVAS_WIDTH}px`,
        height: `${MAP_CANVAS_HEIGHT}px`,
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <MapBaseML
        onReady={setMap}
        onTileTypeChange={setTileType}
        defaultTileType={defaultTileType}
        background={mapBackground}
        keepOldTiles={keepOldTiles}
        controlsRightInset={overlayRightInset}
        controlsEdge={overlayEdge}
        hideControls={hideControls}
        onResetView={onResetView}
        // 이벤트 투망 중 / 레이어 메뉴에선 지도 투망 툴 사용 불가 (컨텍스트 충돌 방지).
        netDisabled={!!activeEvent || inLayerMenu}
        onNetPick={onNetPick}
        onNetActivate={onNetActivate}
      />
      {/* CCTV — 기본은 항상 표출. 레이어 메뉴에서만 체크박스로 on/off (마커 + 선택 reticle 동시).
          영상 재생과는 무관 — 마커만 숨김. */}
      {map && showMenuCctvMarkers && menuCctvList.length > 0 && (
        <CctvMarkersML
          map={map}
          items={menuCctvList}
          cluster={false}
          cameraOffset={markerCameraOffset}
          activeIds={activeCctvIds}
          selected={selectedCctvList}
          onSelectCctv={openCctvPopup}
          deactivateSeq={deactivateSeq}
          onCloseCctv={(id) =>
            setPopupCctvs((prev) => prev.filter((p) => p.id !== id))
          }
        />
      )}
      {map && showCctvMarkers && cctvList.length > 0 && (
        <CctvMarkersML
          map={map}
          items={cctvList}
          // 레이어 메뉴는 행정동 체크가 자주 바뀐다 — 목록을 갈아끼우면 소스가 다시
          //   타일링되며 마커가 통째로 깜빡인다. 클러스터를 끄고 filter 로만 걸러낸다.
          cluster={cctvCluster && !inLayerMenu}
          visibleIds={inLayerMenu ? cctvVisibleIds : undefined}
          cameraOffset={markerCameraOffset}
          activeIds={activeCctvIds}
          selected={selectedCctvList}
          onSelectCctv={openCctvPopup}
          deactivateSeq={deactivateSeq}
          onCloseCctv={(id) =>
            setPopupCctvs((prev) => prev.filter((p) => p.id !== id))
          }
        />
      )}
      {map &&
        popupCctvs.map((c) => (
          <CctvPlayerPopup
            key={c.id}
            map={map}
            cctv={c}
            onClose={() => {
              setPopupCctvs((prev) => prev.filter((p) => p.id !== c.id))
              setDeactivateSeq((n) => n + 1)
            }}
            onExpand={() =>
              onExpandCctv?.({
                number: 0,
                name: c.name,
                cctvId: c.cctvId,
              })
            }
          />
        ))}
      <Toast
        message={playerToast}
        duration={3500}
        onDismiss={() => setPlayerToast(null)}
      />
      {map && showPumpFeatures && (
        <>
          {/* 폴리곤 먼저 mount — 마커가 폴리곤 위에 그려지도록 */}
          <PumpRegionPolygons
            map={map}
            mode={polygonMode}
            fillOpacity={polygonOpacity}
            onHoverRegionChange={
              polygonMode === 'interactive' ? setHoveredRegion : undefined
            }
          />
          <PumpMarkers
            map={map}
            stations={pumpStations}
            color={layerColors.PUMP_STATION ?? FALLBACK_COLOR_PUMP}
            emphasizedRegion={
              polygonMode === 'interactive' ? hoveredRegion : null
            }
            // 전용 펌프 메뉴(idx 0)는 라벨 off (현행), 레이어 메뉴에선 라벨보기 토글 연동.
            showLabels={isPumpMenu ? false : labelOn(LAYER_KEY_PUMP)}
          />
        </>
      )}
      {/* 무더위쉼터 (레이어 메뉴 idx 5 + SHELTER 체크) — 71곳, 라벨보기 토글 연동 */}
      {map && showShelters && shelters.length > 0 && (
        <ShelterMarkers
          map={map}
          shelters={shelters}
          color={layerColors.SHELTER ?? FALLBACK_COLOR_SHELTER}
          showLabels={labelOn(LAYER_KEY_SHELTER)}
        />
      )}
      {/* 재난 예·경보 (idx 4) — 활성 모드에 맞는 마커만 (DisasterPanel 체크 강조).
          voice → 방송장비(핑크), sign → 재해문자전광판(초록 #60C747). */}
      {map &&
        activeTabIdx === 4 &&
        disasterMode === 'voice' &&
        broadcastList.length > 0 && (
          <BroadcastMarkers
            map={map}
            items={broadcastList}
            color={layerColors.BROADCAST ?? FALLBACK_COLOR_BROADCAST}
            emphasizedIds={broadcastEmphasizedIds}
            onSelect={(id) => onSelectDisasterFacility?.('voice', id)}
          />
        )}
      {map &&
        activeTabIdx === 4 &&
        disasterMode === 'sign' &&
        signboardList.length > 0 && (
          <BroadcastMarkers
            map={map}
            items={signboardList}
            color={layerColors.SIGNBOARD ?? FALLBACK_COLOR_SIGNBOARD}
            emphasizedIds={signboardEmphasizedIds}
            showLabels
            onSelect={(id) => onSelectDisasterFacility?.('sign', id)}
          />
        )}
      {/* 급경사지 조기경보·통계 — 지역별 발령 빈도 버블 (건수에 따라 크기·색). */}
      {map && showAlertBubbles && bubbles.length > 0 && (
        <SlopeAlertBubbles map={map} bubbles={bubbles} />
      )}
      {/* 계측 상세 / 레이어 메뉴 — 계측기 종류별 마커 (레이어 색). */}
      {map && instrumentPoints.length > 0 && (
        <>
          {(
            [
              ['INCLINOMETER', LAYER_KEY_INCLINOMETER, FALLBACK_COLOR_INCLINOMETER],
              ['ROCKFALL_DETECTOR', LAYER_KEY_ROCKFALL, FALLBACK_COLOR_ROCKFALL],
              ['RAIN_GAUGE', LAYER_KEY_RAIN_GAUGE, FALLBACK_COLOR_RAIN_GAUGE],
            ] as const
          ).map(([category, layerKey, fallback]) =>
            showMeasureMarkers || layerOn(layerKey) ? (
              <SlopeInstrumentMarkers
                key={category}
                map={map}
                instruments={instrumentPoints}
                category={category}
                color={layerColors[layerKey] ?? fallback}
                showLabels={showMeasureMarkers ? false : labelOn(layerKey)}
              />
            ) : null,
          )}
        </>
      )}
      {/* 급경사지 위험지역 3곳 — 지역명 내장 큰 원, 상태별 색 */}
      {map &&
        (showMeasureMarkers || activeTabIdx === 2 || showLayerSlopeArea) &&
        areaMarkers.length > 0 && (
          <SlopeAreaMarkers
            map={map}
            areas={areaMarkers}
            variant={slopeMeasureMarkers ? 'area' : 'dot'}
            areaZIndex={slopeMeasureMarkers ? 5 : 1}
            color={layerColors.SLOPE_AREA ?? FALLBACK_COLOR_SLOPE}
            gradeColors={slopeMeasureMarkers ? RISK_BADGE_COLOR : undefined}
            showLabels={activeTabIdx === 2 ? true : labelOn(LAYER_KEY_SLOPE_AREA)}
            labelStyle={activeTabIdx === 2 ? 'plain' : 'boxed'}
          />
        )}
      {/* 계측 상세 — 선택한 센서 강조 (물방울 + 이름 라벨). */}
      {map && showMeasureMarkers && slopeFocus && (
        <SlopeAreaMarkers
          map={map}
          areas={[
            { name: slopeFocus.name, lat: slopeFocus.lat, lng: slopeFocus.lng },
          ]}
          color={layerColors.SLOPE_AREA ?? FALLBACK_COLOR_SLOPE}
          selectedName={slopeFocus.name}
        />
      )}
      {/* 계측 상세 — 선택한 계측기 정보 팝업 (지도 이동이 끝난 뒤). */}
      {map && showMeasureMarkers && slopeFocus?.sensor && slopeFocus === settledSlopeFocus && closedSensorSeq !== slopeFocus.seq && (
        <SlopeSensorPopup
          key={slopeFocus.seq}
          map={map}
          sensor={slopeFocus.sensor}
          rightInset={overlayRightInset}
          onClose={() => setClosedSensorSeq(slopeFocus.seq)}
        />
      )}
      {/* 급경사지 총괄·관제 — 관리지역 마커 (89개소, 라벨 없음: 겹침이 심함) */}
      {map && activeTabIdx === 2 && slopeManagedMarkers && slopeFocus === settledSlopeFocus && slopeFocus?.managedAreaId != null && (() => {
        const area = managedAreas.find((a) => a.id === slopeFocus.managedAreaId)
        return area ? <SlopeManagedAreaPopup key={area.id} map={map} area={area} rightInset={overlayRightInset} onClose={() => onCloseSlopeInfo?.()} /> : null
      })()}
      {map && showManagedMarkers && managedMarkers.length > 0 && (
        <SlopeAreaMarkers
          map={map}
          areas={managedMarkers}
          color={layerColors.SLOPE_MANAGED_AREA ?? FALLBACK_COLOR_MANAGED}
          showLabels={false}
          selectedName={slopeFocus?.name}
          gradeColors={GRADE_COLOR}
        />
      )}
      {/* 레이어 메뉴 — 급경사지 관리지역 (89개소, 라벨보기 토글) */}
      {map &&
        !slopeManagedMarkers &&
        showLayerManagedArea &&
        managedMarkers.length > 0 && (
          <SlopeAreaMarkers
            map={map}
            areas={managedMarkers}
            color={layerColors.SLOPE_MANAGED_AREA ?? FALLBACK_COLOR_MANAGED}
            showLabels={labelOn(LAYER_KEY_MANAGED_AREA)}
            labelStyle="boxed"
          />
        )}
      {/* 레이어 메뉴 — 재난예경보(방송장비) / 재해전광판, 체크 시 표출 (강조 없음, 라벨 토글) */}
      {map && showLayerBroadcast && broadcastList.length > 0 && (
        <BroadcastMarkers
          map={map}
          items={broadcastList}
          color={layerColors.BROADCAST ?? FALLBACK_COLOR_BROADCAST}
          showLabels={labelOn(LAYER_KEY_BROADCAST)}
          labelStyle="boxed"
        />
      )}
      {map && showLayerSignboard && signboardList.length > 0 && (
        <BroadcastMarkers
          map={map}
          items={signboardList}
          color={layerColors.SIGNBOARD ?? FALLBACK_COLOR_SIGNBOARD}
          showLabels={labelOn(LAYER_KEY_SIGNBOARD)}
          labelStyle="boxed"
        />
      )}
      {/* 레이어 메뉴 — 대기질 측정소 7곳, 체크 시 표출 (라벨 토글) */}
      {map && showLayerAir && airStations.length > 0 && (
        <AirStationMarkers
          map={map}
          stations={airStations}
          color={layerColors.AIR_QUALITY ?? FALLBACK_COLOR_AIR}
          showLabels={labelOn(LAYER_KEY_AIR)}
        />
      )}
      {/* 주소 검색 위치 핀 — searchTarget 있는 동안 표출 (메뉴 활성화/리셋 시 부모가 해제) */}
      {map && searchTarget && (
        <SearchPinMarker map={map} target={searchTarget} />
      )}
      {/* 투망 지점 핀 — 검색 핀과 동일 마커. 툴 해제/초기화 시 부모가 netTarget 해제. */}
      {map && netTarget && <SearchPinMarker map={map} target={netTarget} />}
      {/* 이벤트 활성화 마커 — activeEvent 기준 즉시 표출. */}
      {map && activeEvent && (
        <EventFocusMarkerML
          map={map}
          event={activeEvent}
          onDeactivate={() => onDeactivateEvent?.()}
        />
      )}
      {/* 지진가속도 메뉴 — 계측기 마커 (설치 위치 라벨). */}
      {map && activeTabIdx === 3 && seismoMarkers.length > 0 && (
        <SlopeAreaMarkers
          map={map}
          areas={seismoMarkers}
          color={seismoColor}
          showLabels
          labelStyle="plain"
        />
      )}
      {/* 메뉴별 지도 범례 — 그 메뉴에서 실제로 그리는 마커와 같은 색. */}
      {menuLegendItems.length > 0 && (
        <div
          className="absolute"
          {...edgeAttr(overlayEdge)}
          style={{
            bottom: 20 + mapBottomCrop,
            zIndex: 1000,
            ...edgeStyle(overlayRightInset, overlayEdge, LEGEND_TRANSITION),
          }}
        >
          <MapLegend layerChecked={layerChecked} items={menuLegendItems} />
        </div>
      )}
      {/* 급경사지 계측 상세 — 계측기 종류 범례 (마커 색과 동일). */}
      {slopeMeasureMarkers && (
        <div
          className="absolute"
          {...edgeAttr(overlayEdge)}
          style={{
            bottom: 20 + mapBottomCrop,
            zIndex: 1000,
            ...edgeStyle(overlayRightInset, overlayEdge, LEGEND_TRANSITION),
          }}
        >
          <MapLegend
            layerChecked={layerChecked}
            items={[
              {
                key: 'AREA',
                label: '급경사지',
                color: layerColors.SLOPE_AREA ?? FALLBACK_COLOR_SLOPE,
              },
              {
                key: LAYER_KEY_INCLINOMETER,
                label: '계측기',
                color:
                  layerColors.SLOPE_INCLINOMETER ?? FALLBACK_COLOR_INCLINOMETER,
              },
              {
                key: LAYER_KEY_MOISTURE,
                label: '토양함수계',
                color: layerColors.SLOPE_MOISTURE ?? FALLBACK_COLOR_MOISTURE,
              },
              {
                key: LAYER_KEY_ROCKFALL,
                label: '낙석감지기',
                color: layerColors.SLOPE_ROCKFALL ?? FALLBACK_COLOR_ROCKFALL,
              },
              {
                key: LAYER_KEY_RAIN_GAUGE,
                label: '강우량계',
                color: layerColors.SLOPE_RAIN_GAUGE ?? FALLBACK_COLOR_RAIN_GAUGE,
              },
            ]}
          />
        </div>
      )}
      {/* 급경사지 총괄·관제 — 등급 범례 (마커 색과 동일). */}
      {slopeManagedMarkers && (
        <div
          className="absolute"
          {...edgeAttr(overlayEdge)}
          style={{
            bottom: 20 + mapBottomCrop,
            zIndex: 1000,
            ...edgeStyle(overlayRightInset, overlayEdge, LEGEND_TRANSITION),
          }}
        >
          <MapLegend layerChecked={layerChecked} items={SLOPE_GRADE_LEGEND} />
        </div>
      )}
      {/* 급경사지 조기경보·통계 — 발령 빈도 버블 범례. */}
      {slopeAlertBubbles && (
        <div
          className="absolute"
          {...edgeAttr(overlayEdge)}
          style={{
            bottom: 20 + mapBottomCrop,
            zIndex: 1000,
            ...edgeStyle(overlayRightInset, overlayEdge, LEGEND_TRANSITION),
          }}
        >
          <MapLegend layerChecked={layerChecked} items={SLOPE_ALERT_LEGEND} />
        </div>
      )}
      {/* 지도 범례 (레이어 메뉴) — 우하단. 컨트롤과 동일 inset 으로 좁아진 맵에서도 visible. */}
      {activeTabIdx === 5 && (
        <div
          className="absolute"
          {...edgeAttr(overlayEdge)}
          style={{
            bottom: 20 + mapBottomCrop,
            zIndex: 1000,
            ...edgeStyle(overlayRightInset, overlayEdge, LEGEND_TRANSITION),
          }}
        >
          <MapLegend layerChecked={layerChecked} />
        </div>
      )}
    </div>
  )
}
