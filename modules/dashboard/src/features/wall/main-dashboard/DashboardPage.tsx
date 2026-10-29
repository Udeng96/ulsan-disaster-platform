import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchBroadcastTerminals,
  fetchDisasterBoards,
  type FacilityListItem,
} from '@/api/facility'
import { fetchSignboardCctv } from '@/api/cctvSync'
import type { AddressSearchItem } from '@/api/vworld'
import type { EventListItem } from '@/api/event'
import { CCTVModal } from '@/features/shared/cctv-stream/CCTVModal'
import { SidePanel } from './SidePanel'
import { PumpStationPanel } from '@/features/menus/pump-station/PumpStationPanel'
import { PumpDetailMap } from '@/features/menus/pump-station/PumpDetailMap'
import { PumpDetailPanel } from '@/features/menus/pump-station/PumpDetailPanel'
import {
  SlopeSubTabs,
  type SlopeTabId,
} from '@/features/menus/steep-slope/SlopeSubTabs'
import { connectEarthquakeStream } from '@/features/menus/earthquake/earthquakeStream'
import { SlopeSummaryBar } from '@/features/menus/steep-slope/SlopeSummaryBar'
import {
  AdminSubTabs,
  type AdminTabId,
} from '@/features/menus/admin/AdminSubTabs'
import { AdminNoticeBar } from '@/features/menus/admin/AdminNoticeBar'
import { AdminRack } from '@/features/menus/admin/AdminRack'
import { AdminDeviceList } from '@/features/menus/admin/AdminDeviceList'
import { AdminFirewallPanel } from '@/features/menus/admin/AdminFirewallPanel'
import { AdminFrontPorts } from '@/features/menus/admin/AdminFrontPorts'
import { AdminRearPower } from '@/features/menus/admin/AdminRearPower'
import { useSlopeAreas } from '@/features/menus/steep-slope/useSlopeAreas'
import { SlopeListPanel } from '@/features/menus/steep-slope/SlopeListPanel'
import { SlopeSensorPanel } from '@/features/menus/steep-slope/SlopeSensorPanel'
import { SlopeAlertPanel } from '@/features/menus/steep-slope/SlopeAlertPanel'
import { SlopeStatsPanel } from '@/features/menus/steep-slope/SlopeStatsPanel'
import {
  SlopeChartPanel,
  type ChartPeriod,
  type SelectedSensor,
} from '@/features/menus/steep-slope/SlopeChartPanel'
import { EarthquakePanel } from '@/features/menus/earthquake/EarthquakePanel'
import { LayerPanel } from '@/features/menus/layer/LayerPanel'
import {
  CCTV_ETC_REGION_ID,
  CCTV_ETC_REGION_NAME,
} from '@/features/menus/layer/cctvLayer'
import { fetchRegions, type RegionItem } from '@/api/event'
import { useLayerColorSync } from '@/features/menus/layer/layerColorStore'
import { CCTV_LAYER_CODE } from '@/features/menus/layer/cctvLayer'
import { DisasterPanel } from '@/features/menus/disaster-alert/DisasterPanel'
import { RiverFacilityOverlay } from '@/features/shared/river/RiverFacilityOverlay'
import { MapSection } from './MapSection'
import { EventButton } from '@/features/shared/map/EventButton'
import {
  COMMON_MENU_INDICES,
  TABS,
  type CCTVMeta,
} from './data'
import { Header } from './Header'
import { MenuTabs } from './MenuTabs'
import { COLORS } from '@/styles/designTokens'
import type { Area } from '@/features/menus/steep-slope/data'
import { CctvGrid } from './CctvGrid'
import { useCctvSelection } from './useCctvSelection'

// 급경사지 이탈 1단계 — 서브탭·요약 바가 사라지는 시간. 그 뒤 본문이 위로 늘어난다.
const SLOPE_HEADER_CLOSE_MS = 450
// 헤더 내용(0.45s) + 자리 닫힘(0.55s) 전체.
const SLOPE_HEADER_TOTAL_MS = 1050

// 전환 애니메이션이 끝난 뒤 CCTV 목록을 교체하기까지의 지연.
const CCTV_SWAP_DELAY_MS = 420
// 급경사지 전환은 단계가 더 있어 내용 교체를 더 늦춘다 (폭 변화가 끝난 뒤).
const SLOPE_CONTENT_SWAP_MS = 1600

// 메뉴별 사이드 패널 폭 (없으면 0).
function sidePanelWidthOf(idx: number): number {
  if (idx === 2) return 568
  // 재난 예·경보(4) 는 우측 전체를 덮는 오버레이라 슬롯을 쓰지 않는다.
  return COMMON_MENU_INDICES.includes(idx) ? 480 : 0
}

// 우측 사이드 패널이 있는 메뉴인지 (없으면 패널이 화면 밖으로 밀려난다).
function hasSidePanel(idx: number): boolean {
  return COMMON_MENU_INDICES.includes(idx) || idx === 4
}

// 지도 canvas 폭 — MapSection 과 같은 값 (crop 계산 기준).
const MAP_CANVAS_W = 1888
// CCTV 그리드 폭 + 자리 사이 gap — 접으면 지도가 이만큼 넓어지고 같은 값만큼 자리를 회수한다.
//   (지도 확장량과 marginRight 회수량이 같아야 우측 패널이 안 움직인다.
//    gap 까지 회수해야 접힌 뒤 지도-우측 패널 여백이 12px 로 남는다.)
const CCTV_SLOT_W = 640 + 12

/** 메뉴별로 보이는 지도 폭. cctvOpen=false 면 CCTV 자리까지 지도가 차지한다. */
function mapWidthOf(idx: number, cctvOpen: boolean): number {
  const base =
    idx === 2 ? 784 : idx === 4 || COMMON_MENU_INDICES.includes(idx) ? 744 : 1236
  // 재난 예·경보(4) / 급경사지(2) 는 접기 대상이 아니다.
  if (cctvOpen || idx === 4 || idx === 2) return base
  return base + CCTV_SLOT_W
}

// 메뉴별로 잘려 나가는 canvas 우측 폭 (canvas − 보이는 지도 폭).
function mapRightInset(idx: number, cctvOpen = true): number {
  return MAP_CANVAS_W - mapWidthOf(idx, cctvOpen)
}

export function DashboardPage() {
  const [activeTabIdx, commitActiveTabIdx] = useState(-1) // 첫 진입 — 메뉴 안 눌린 상태 (기본 layout)
  const [selectedTabIdx, setSelectedTabIdx] = useState(-1)
  const [pendingMapMenu, setPendingMapMenu] = useState<number | null>(null)
  const [adminSlideEntry, setAdminSlideEntry] = useState(false)
  const [cctvEntryDone, setCctvEntryDone] = useState(false)
  const [adminSlopePair, setAdminSlopePair] = useState(false)
  const [adminTransition, setAdminTransition] = useState<'idle' | 'leaving' | 'slope-leaving' | 'waiting-map' | 'entering' | 'pair-leaving' | 'pair-entering'>('idle')
  const selectedTabRef = useRef(-1)
  const activeTabRef = useRef(activeTabIdx)
  activeTabRef.current = activeTabIdx
  const menuTransitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finishAdminExit = useCallback(() => {
    // 퇴장 완료 상태(opacity 0)를 0.4초 유지한 뒤 다음 화면을 시작한다.
    menuTransitionTimer.current = setTimeout(() => {
      const target = selectedTabRef.current
      setAdminSlideEntry(activeTabRef.current === 6 && ![2, 4, 6].includes(target))
      setCctvEntryDone(false)
      commitActiveTabIdx(target)
      // 급경사지는 기존 순서를 유지하고, 나머지는 본문을 먼저 보여준 뒤 지도만 공개한다.
      setPendingMapMenu(target !== 6 && target !== 2 ? target : null)
      setAdminTransition(target === 2 ? 'waiting-map' : 'entering')
      menuTransitionTimer.current = null
    }, 400)
  }, [])
  const setActiveTabIdx = useCallback((next: number | ((prev: number) => number)) => {
    const current = activeTabRef.current
    const target = typeof next === 'function' ? next(selectedTabRef.current) : next
    if (target === 6) {
      setAdminTab('server')
      setAdminDeviceIndex(0)
    }
    // 다시 진입하는 첫 렌더부터 총괄·관제로 시작한다. 전환 중 되돌아오는 경우도 포함한다.
    if (target === 2) {
      setSlopeTab('overview')
      setSlopeFocus(null)
      setSlopeArea(null)
      setSlopeSensor(null)
      setSlopePeriod('실시간')
    }
    selectedTabRef.current = target
    setSelectedTabIdx(target)
    setAdminSlideEntry(false)
    setAdminSlopePair(false)
    setPendingMapMenu(null)
    if (menuTransitionTimer.current) clearTimeout(menuTransitionTimer.current)
    if (target === current) {
      setAdminTransition('idle')
      return
    }
    if ((current === 6 && target === 2) || (current === 2 && target === 6)) {
      setAdminSlopePair(true)
      setAdminTransition('pair-leaving')
      return
    }
    if (target !== 6 && current !== 6) {
      setAdminTransition('idle')
      commitActiveTabIdx(target)
      return
    }
    // 관리자 전환은 퇴장이 끝난 뒤 내용을 교체한다. 급경사지는 기존 헤더 닫힘 순서를 유지한다.
    setAdminTransition(current === 2 ? 'slope-leaving' : 'leaving')
    if (current === 2) {
      menuTransitionTimer.current = setTimeout(finishAdminExit, SLOPE_HEADER_TOTAL_MS)
    }
    // 일반 화면은 CSS animationend에서 교체해 페이드아웃 완료를 보장한다.
  }, [finishAdminExit])
  useEffect(() => {
    if (adminTransition !== 'entering' && adminTransition !== 'pair-entering') return
    const timer = setTimeout(() => setAdminTransition('idle'), adminTransition === 'pair-entering' ? 1700 : 1500)
    return () => clearTimeout(timer)
  }, [adminTransition])
  const handleMenuCameraSettled = useCallback((menu: number) => {
    if (menu !== selectedTabRef.current) return
    setPendingMapMenu((pending) => pending === menu ? null : pending)
    setAdminTransition((phase) => phase === 'waiting-map' ? 'entering' : phase)
  }, [])
  useEffect(() => () => {
    if (menuTransitionTimer.current) clearTimeout(menuTransitionTimer.current)
  }, [])
  // 헤더 검색바 외부 reset 신호 — handleReset 시 +1 → AddressSearch 가 key 로 강제 remount.
  const [searchKey, setSearchKey] = useState(0)
  // 이벤트 패널 열림 상태 — 지도 영역 좌상단 "이벤트" 버튼 토글.
  //   (지도 미연동: 이벤트 선택 시 flyTo/마커 없음. 목록 표출 + 데이터 없으면 placeholder.)
  const [isEventPanelOpen, setIsEventPanelOpen] = useState(false)
  // CCTV 그리드 접기 — 접으면 그 자리를 지도가 차지한다 (재난 예·경보는 대상 아님).
  const [cctvOpen, setCctvOpen] = useState(true)
  // 접기 토글로 인한 폭 변화는 지연 없이 바로 시작한다
  //   (--map-shift-delay 는 급경사지 메뉴 전환을 단계적으로 보이게 하려는 지연이라 여기선 방해).
  const [instantShift, setInstantShift] = useState(false)
  const shiftDelay = instantShift ? '0s' : 'var(--map-shift-delay, 0s)'
  const toggleCctv = () => {
    setInstantShift(true)
    setCctvOpen((v) => !v)
  }
  // 이벤트 선택 — 활성 이벤트. row 클릭 시 flyTo + 마커 + is-active CSS 트리거.
  const [activeEvent, setActiveEvent] = useState<EventListItem | null>(null)
  const handleActivateEvent = useCallback((e: EventListItem | null) => {
    setActiveEvent(e)
    // 이벤트를 고르면 다른 컨텍스트는 해제 — 주소 검색은 이미 같은 방식으로 동작한다.
    //   메뉴까지 해제해 지도/CCTV 가 이벤트 지점만 보여주게 한다.
    if (e) {
      setSearchTarget(null)
      setNetTarget(null)
      setActiveTabIdx(-1)
    }
  }, [])
  // 이벤트 위치 — 선택 중이면 그 지점 최근접 5개를 CCTV 로 띄운다 (최우선).
  const eventTarget = useMemo(
    () =>
      activeEvent &&
      Number.isFinite(activeEvent.lat) &&
      Number.isFinite(activeEvent.lng)
        ? { lat: activeEvent.lat, lng: activeEvent.lng }
        : null,
    [activeEvent],
  )
  // 우측 콘텐츠 cross-fade — 전환 동안 prev/displayed 두 panel 을 동시에 DOM 에 두고 겹친 채 fade.
  // active 변경: prev=현재 displayed → displayed=active 즉시 swap → 300ms 후 prev 제거.
  // 전환 동안 displayed (in flow) 가 fade-in, prev (absolute over) 가 fade-out → 항상 무언가 보임.
  //
  // 타이머는 useRef 로 관리 — useEffect 의 cleanup 으로 clearTimeout 하면
  // setDisplayedTabIdx 가 dep 를 바꿔서 re-render → cleanup → 타이머 취소 → prev 영원히 unmount 안 됨.
  const [displayedTabIdx, setDisplayedTabIdx] = useState(-1)
  const [prevTabIdx, setPrevTabIdx] = useState<number | null>(null)
  const prevClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (activeTabIdx === displayedTabIdx) return
    // 급경사지 이탈 — 1) 헤더 내용이 사라지고 2) 자리가 닫히며 본문이 위로 늘어난다.
    if (displayedTabIdx === 2) {
      const t = setTimeout(() => {
        setPrevTabIdx(2)
        setDisplayedTabIdx(activeTabIdx)
      }, SLOPE_HEADER_CLOSE_MS)
      return () => clearTimeout(t)
    }
    setPrevTabIdx(displayedTabIdx)
    setDisplayedTabIdx(activeTabIdx)
    // 재난에서 벗어나는 전환 — 오버레이를 같은 커밋에서 '이탈 중' 으로 넘긴다.
    if (displayedTabIdx === 4 && activeTabIdx !== 4) setDisasterLeaving(true)
    if (activeTabIdx === 4) setDisasterLeaving(false)
    if (prevClearTimerRef.current) {
      clearTimeout(prevClearTimerRef.current)
    }
    const holdMs = 350
    prevClearTimerRef.current = setTimeout(() => {
      setPrevTabIdx(null)
      prevClearTimerRef.current = null
    }, holdMs)
  }, [activeTabIdx, displayedTabIdx])
  // 헤더(서브탭+요약 바) 마운트 유지 — 닫힘 애니메이션이 끝날 때까지 남긴다.
  //   요소가 먼저 사라지면 자리가 즉시 0 이 되어 본문이 위로 점프한다.
  const [slopeHeaderMounted, setSlopeHeaderMounted] = useState(false)
  useEffect(() => {
    if (activeTabIdx === 2) {
      setSlopeHeaderMounted(true)
      return
    }
    if (!slopeHeaderMounted) return
    const t = setTimeout(() => setSlopeHeaderMounted(false), SLOPE_HEADER_TOTAL_MS)
    return () => clearTimeout(t)
  }, [activeTabIdx, slopeHeaderMounted])

  // 메뉴가 바뀌면 CCTV 를 먼저 펼친다 — 접힌 채로 전환하면 폭 변화가 두 번 겹쳐 어색하다.
  useEffect(() => {
    setCctvOpen(true)
    setInstantShift(false) // 메뉴 전환은 기존 단계 지연을 그대로 쓴다.
  }, [activeTabIdx])

  // 전환이 끝난 뒤 반영되는 메뉴 — CCTV 목록 교체 타이밍용.
  const [settledTabIdx, setSettledTabIdx] = useState(activeTabIdx)
  // CCTV 목록 기준 메뉴 — 재난(4) 은 오버레이에 가려 CCTV 가 안 보이므로 직전 메뉴를 유지한다.
  const lastCctvMenuRef = useRef(activeTabIdx)
  if (settledTabIdx !== 4) lastCctvMenuRef.current = settledTabIdx
  const cctvMenuIdx =
    settledTabIdx === 4 ? lastCctvMenuRef.current : settledTabIdx
  useEffect(() => {
    if (activeTabIdx === settledTabIdx) return
    const swapMs =
      activeTabIdx === 2 || displayedTabIdx === 2
        ? SLOPE_CONTENT_SWAP_MS
        : CCTV_SWAP_DELAY_MS
    const t = setTimeout(() => setSettledTabIdx(activeTabIdx), swapMs)
    return () => clearTimeout(t)
  }, [activeTabIdx, settledTabIdx])

  // 현재 메뉴의 사이드 패널 폭 (없으면 0 — 자리 자체가 닫힌다).
  const sidePanelWidth = sidePanelWidthOf(displayedTabIdx)
  // 패널이 닫히는 동안 보여줄 마지막 패널 메뉴.
  const lastPanelIdxRef = useRef(settledTabIdx)
  if (hasSidePanel(settledTabIdx)) lastPanelIdxRef.current = settledTabIdx
  const lastPanelIdx = lastPanelIdxRef.current

  // 폭(지도·CCTV 규격·패널 자리) 변화 시점:
  //   진입 — 높이 축소 + 헤더 열림 뒤 (0.7s)
  //   이탈 — 헤더가 닫히고 본문이 위로 커진 뒤 (0.35s, 레이아웃 반영이 이미 0.15s 늦다)
  const slopeShiftDelay =
    adminSlopePair ? '0s' : displayedTabIdx === 2 && prevTabIdx !== 2
      ? '0.55s'
      : prevTabIdx === 2 && displayedTabIdx !== 2
        ? '0.55s'
        : '0s'
  // 재난 예·경보 이탈 — 슬라이드 아웃이 '끝나면' 오버레이를 걷는다 (onAnimationEnd).
  //   ⚠️ displayedTabIdx 갱신과 '같은 커밋' 에서 켜야 한다. 별도 effect 로 미루면
  //      한 프레임 동안 오버레이가 사라져 뒤 화면이 번쩍 보였다가 다시 덮인다.
  const [disasterLeaving, setDisasterLeaving] = useState(false)

  // 급경사지 '진입' 직후에만 3·4단계 애니메이션 — 서브탭 전환은 그냥 바뀐다.
  const [slopeEntering, setSlopeEntering] = useState(false)
  useEffect(() => {
    if (activeTabIdx !== 2) {
      // 급경사지를 벗어나면 선택 상태를 비운다 — 남아 있으면 다른 메뉴에서 그 위치로 날아간다.
      setSlopeFocus(null)
      setSlopeArea(null)
      setSlopeSensor(null)
      setSlopePeriod('실시간')
      // 서브탭도 총괄·관제로 초기화 (다시 들어올 때 기본 화면).
      setSlopeTab('overview')
      return setSlopeEntering(false)
    }
    setSlopeEntering(true)
    const t = setTimeout(() => setSlopeEntering(false), 1500)
    return () => clearTimeout(t)
  }, [activeTabIdx])

  // 배수펌프장 구역 선택 — null 이면 전체 지도, name 있으면 detail view
  // 상세에서 목록으로 돌아가는 동안(슬라이드 아웃) 마지막 지역을 유지한다.
  const [pumpDetailLeaving, setPumpDetailLeaving] = useState(false)
  const lastPumpRegionRef = useRef<string | null>(null)
  const [selectedPumpRegion, setSelectedPumpRegion] = useState<string | null>(
    null,
  )
  // 지진가속도 실시간 SSE — 메뉴와 무관하게 대시보드가 뜨면 바로 연결 (수신 상태를 계속 파악).
  useEffect(() => {
    connectEarthquakeStream()
  }, [])

  // 상세 슬라이드 아웃 동안 보여줄 마지막 지역.
  if (selectedPumpRegion) lastPumpRegionRef.current = selectedPumpRegion

  // 메뉴 변경 시 펌프장 detail 해제
  useEffect(() => {
    if (activeTabIdx !== 0) setSelectedPumpRegion(null)
  }, [activeTabIdx])

  // 타이틀 클릭 → 모든 state 초기화 (페이지 리로드 대신 React state 리셋 → transition 부드러움).
  // 타이틀 리셋 신호 — MapSection 이 기본 카메라 (default center/zoom, pitch 0) 로 ease.
  const [resetSeq, setResetSeq] = useState(0)
  const handleReset = () => {
    setActiveTabIdx(-1)
    setSelectedPumpRegion(null)
    setSearchKey((k) => k + 1) // 검색바 강제 remount → state 초기화
    setSearchTarget(null) // 검색 핀 제거
    setNetTarget(null) // 투망 핀 제거
    setActiveEvent(null) // 이벤트 활성 해제
    setResetSeq((s) => s + 1) // 지도 기본 카메라 복귀
  }
  // 주소 검색 결과 클릭 → 활성 메뉴/이벤트 패널/펌프 detail 해제 후 지도 flyTo.
  //   seq 증가 — 같은 좌표를 다시 클릭해도 flyTo 재트리거.
  //   검색이 활성인 동안 우측 CCTV 는 그 지점 최근접 5개로 고정 (useCctvSelection).
  const [searchTarget, setSearchTarget] = useState<{
    lng: number
    lat: number
    seq: number
  } | null>(null)

  // 투망 지점 — 지도 투망 툴로 찍은 좌표. 있는 동안 CCTV 는 그 지점 최근접 5개로 고정.
  //   해제 조건: 투망 버튼 off / 지도 초기화 / 이벤트 선택 (handleActivateEvent).
  const [netTarget, setNetTarget] = useState<{
    lng: number
    lat: number
  } | null>(null)
  const handleNetPick = useCallback(
    (target: { lng: number; lat: number } | null) => setNetTarget(target),
    [],
  )
  // 투망 툴을 켜면 주소 검색 상태(핀·검색어·최근접 5) 를 먼저 초기화.
  const handleNetActivate = useCallback(() => {
    setSearchTarget(null)
    setSearchKey((k) => k + 1)
  }, [])

  // 레이어 메뉴에서 체크한 행정동 id — 지도 마커와 순환 목록이 함께 쓴다.
  //   초기값은 전부 체크. 목록이 로드되기 전(null)에는 전체로 취급한다.
  const [cctvRegionChecked, setCctvRegionChecked] = useState<
    ReadonlySet<number> | null
  >(null)

  // 급경사지 상시계측 지역 선택 — 지도 이동 + 그 지구 CCTV 로 좁히는 데 함께 쓴다.
  const [slopeArea, setSlopeArea] = useState<Area | null>(null)
  // 관리자 서브탭 (서버 운영 / 네트워크 / 기타). 본문은 아직 비어 있다.
  const [adminTab, setAdminTab] = useState<AdminTabId>('server')
  const [adminDeviceIndex, setAdminDeviceIndex] = useState(0)

  // CCTV 선택 + rotation — 메뉴/지역/검색·투망 컨텍스트에 맞는 5 cell 계산 (useCctvSelection 훅).
  const { cctvList, activeCctvList, hasCctv, displayedCctvList, cctvOfMenu } =
    useCctvSelection(
      // 전환 애니메이션이 끝난 뒤에 CCTV 목록을 바꾼다 —
      // 전환 프레임에 플레이어 6개가 새 스트림으로 재접속하면 슬라이드가 끊긴다.
      //   재난 예·경보(4) 는 오버레이에 가려 CCTV 가 보이지 않으므로 목록을 유지한다.
      //   (바꾸면 나올 때 재접속하며 검은 화면이 한 번 스친다)
      cctvMenuIdx,
      selectedPumpRegion,
      // CCTV 5칸 우선순위 — 좁은 컨텍스트가 이긴다.
      //   1) 이벤트 선택   2) 주소 검색   3) 투망   4) 메뉴 분류   5) 전체
      eventTarget ?? searchTarget ?? netTarget,
      cctvRegionChecked,
      slopeArea,
    )
  // 방송장비 (BROADCAST) — /api/broadcast/terminals 1회 fetch.
  //   DisasterPanel 의 자동음성통보 체크박스 트리 (유형별/행정동별) 공유.
  //   실패/응답 전엔 빈 배열 → DisasterPanel 이 빈 트리 placeholder 표출.
  const [broadcastList, setBroadcastList] = useState<FacilityListItem[]>([])
  useEffect(() => {
    let cancelled = false
    fetchBroadcastTerminals()
      .then((items) => {
        if (!cancelled) setBroadcastList(items)
      })
      .catch((err) => console.warn('[broadcast] fetch 실패', err))
    return () => {
      cancelled = true
    }
  }, [])
  // 재해문자전광판 (DISASTER_SIGNBOARD) — /api/signboard/boards 1회 fetch.
  //   DisasterPanel 의 재해 문자 전광판 좌측 트리 공유.
  const [signboardList, setSignboardList] = useState<FacilityListItem[]>([])
  // 전광판 id → 연결된 CCTV (CCTV 관리 화면에서 1:1 로 지정, cctv-sync).
  const [signboardCctv, setSignboardCctv] = useState<Record<number, string | null>>({})
  useEffect(() => {
    let cancelled = false
    fetchDisasterBoards()
      .then((items) => {
        if (!cancelled) setSignboardList(items)
      })
      .catch((err) => console.warn('[signboard] fetch 실패', err))
    fetchSignboardCctv()
      .then((rows) => {
        if (!cancelled)
          setSignboardCctv(Object.fromEntries(rows.map((r) => [r.signboardId, r.cctvId])))
      })
      .catch((err) => console.warn('[signboard-cctv] fetch 실패', err))
    return () => {
      cancelled = true
    }
  }, [])

  // DisasterPanel 체크된 방송장비 / 재해전광판 id — 지도 마커 강조.
  // useCallback 필수 — DisasterPanel 의 통보 effect 가 이 핸들러를 deps 로 가져서,
  // 매 렌더 새 함수면 setState → 재렌더 → effect 재실행 무한루프.
  const [broadcastSelectedIds, setBroadcastSelectedIds] = useState<
    ReadonlySet<number>
  >(new Set())
  const [signboardSelectedIds, setSignboardSelectedIds] = useState<
    ReadonlySet<number>
  >(new Set())
  // 지도 마커 클릭 → DisasterPanel 체크 토글 (seq 로 1회성 신호 전달).
  const [disasterToggle, setDisasterToggle] = useState<{
    kind: 'voice' | 'sign'
    id: number
    seq: number
  } | null>(null)
  const handleSelectDisasterFacility = useCallback(
    (kind: 'voice' | 'sign', id: number) => {
      setDisasterToggle((prev) => ({ kind, id, seq: (prev?.seq ?? 0) + 1 }))
    },
    [],
  )

  const handleDisasterSelectionChange = useCallback(
    (broadcastIds: readonly number[], signboardIds: readonly number[]) => {
      setBroadcastSelectedIds(new Set(broadcastIds))
      setSignboardSelectedIds(new Set(signboardIds))
    },
    [],
  )
  // DisasterPanel 활성 모드 (voice=자동음성통보 / sign=재해문자전광판) — 지도 마커 표출 분기.
  //   voice → 방송장비 마커만, sign → 전광판 마커만.
  const [disasterMode, setDisasterMode] = useState<'voice' | 'sign'>('voice')
  // 재난예경보 (idx 4) 진입 시 'voice' 리셋 — DisasterPanel 이 재mount 시 내부적으로 'voice' 로
  // 초기화되지만 mount 때 onMenuChange 를 안 쏴서, 리셋이 없으면 직전 'sign' 이 stale 하게 남아
  // voice 탭인데 sign 마커가 뜨는 버그. (idx 4 안에서 voice↔sign 토글은 activeTabIdx 불변이라 영향 X.)
  useEffect(() => {
    if (activeTabIdx === 4) setDisasterMode('voice')
  }, [activeTabIdx])

  // CCTV 확장 modal — open 여부와 마지막으로 띄운 CCTV 데이터를 분리해서
  // 닫힘 transition 동안에도 마지막 데이터가 그대로 표시되도록 함
  const [expandedCCTV, setExpandedCCTV] = useState<CCTVMeta | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const openModal = (c: CCTVMeta) => {
    setExpandedCCTV(c)
    setModalOpen(true)
  }
  const closeModal = () => setModalOpen(false)
  // 레이어 색 편집 store — 60초 polling + 페이지 이탈 시 DB flush (컬러 피커 변경분).
  //   색 자체는 store(useLayerColorMap)가 소유 — LayerPanel/MapSection 이 직접 구독.
  useLayerColorSync()
  // 급경사지 서브탭 — 총괄·관제 / 계측 상세 / 조기경보·통계.
  const [slopeTab, setSlopeTab] = useState<SlopeTabId>('overview')
  // 상시계측관리체계 지역 탭 선택 (가상시설0680/가상시설0432/가상시설0553).
  // 계측 상세 — 좌측 센서 패널에서 고른 센서 + 차트 기간.
  const [slopeSensor, setSlopeSensor] = useState<SelectedSensor | null>(null)
  const [slopePeriod, setSlopePeriod] = useState<ChartPeriod>('실시간')
  // 최근 관측시간 — 백엔드 제공 전엔 화면 진입 시각 고정.
  // 상시계측 위험지역 3곳 — 지역 탭 클릭 시 좌표 조회용 (마커는 MapSection 이 따로 그림).
  // 급경사지 목록에서 고른 관리지역 — 지도 flyTo + 마커 강조 (seq 로 같은 항목 재선택도 반영).
  // 지역 탭 → 지도 이동용 좌표. 폴링 없이 캐시된 기준 데이터만 읽는다.
  const areaLocations = useSlopeAreas()
  // 조기경보 통계의 선택 기간 — 지도 발령 버블과 공유.
  const [alarmRange, setAlarmRange] = useState<{
    from: string
    to: string
  } | null>(null)
  const [slopeFocus, setSlopeFocus] = useState<{
    managedAreaId?: number
    /** 계측 상세에서 고른 계측기 — 지도 옆 정보 팝업용. */
    sensor?: SelectedSensor
    name: string
    lng: number
    lat: number
    seq: number
  } | null>(null)
  // 레이어 항목별 체크 상태 (code → checked) — LayerPanel 체크박스 + 지도 마커 표시 여부.
  //   기본 전부 off (미존재 key 는 ?? false 로 처리). CCTV 만 on — 다른 메뉴에서 항상 보이던
  //   마커라 레이어 메뉴 진입 시에도 유지하고, 체크 해제 시에만 숨김.
  const [layerChecked, setLayerChecked] = useState<Record<string, boolean>>({
    [CCTV_LAYER_CODE]: true,
  })
  // CCTV 하위 트리 — 행정동별 목록. CCTV 의 regionId 를 /api/regions 이름에 맞춘다.
  const [regions, setRegions] = useState<RegionItem[]>([])
  useEffect(() => {
    fetchRegions()
      .then(setRegions)
      .catch((err) => console.warn('[regions] fetch 실패', err))
  }, [])
  const cctvRegions = useMemo(() => {
    const nameById = new Map(regions.map((r) => [r.id, r.name]))
    const by = new Map<number, number>()
    for (const c of cctvList) {
      // 행정동 id 가 없거나 목록에 없는 id 면 '기타'.
      const id =
        c.regionId != null && nameById.has(c.regionId)
          ? c.regionId
          : CCTV_ETC_REGION_ID
      by.set(id, (by.get(id) ?? 0) + 1)
    }
    return [...by.entries()]
      .map(([id, count]) => ({
        id,
        name: nameById.get(id) ?? CCTV_ETC_REGION_NAME,
        count,
      }))
      // 행정동 가나다순, '기타' 는 맨 뒤.
      .sort((a, b) =>
        a.id === CCTV_ETC_REGION_ID
          ? 1
          : b.id === CCTV_ETC_REGION_ID
            ? -1
            : a.name.localeCompare(b.name, 'ko'),
      )
  }, [cctvList, regions])
  // 목록이 처음 채워지면 전부 체크된 상태로 시작한다.
  useEffect(() => {
    if (cctvRegions.length === 0) return
    setCctvRegionChecked((prev) =>
      prev ?? new Set(cctvRegions.map((r) => r.id)),
    )
  }, [cctvRegions])

  // 레이어 메뉴에서 지도에 표시할 CCTV id — 체크한 행정동만. 로드 전(null)엔 전체.
  //   목록을 갈아끼우지 않고 id 집합만 넘긴다 (지도가 filter 로 거른다 — 마커 깜빡임 방지).
  const cctvVisibleIds = useMemo(() => {
    if (cctvRegionChecked === null) return undefined
    const ids = new Set<number>()
    for (const c of cctvList) {
      if (cctvRegionChecked.has(c.regionId ?? CCTV_ETC_REGION_ID)) ids.add(c.id)
    }
    return ids
  }, [cctvList, cctvRegionChecked])

  // 레이어 항목별 라벨보기 상태 (code → on) — LayerPanel 토글 + 지도 마커 하단 라벨 노출 여부.
  const [layerLabelOn, setLayerLabelOn] = useState<Record<string, boolean>>({})
  const handleSelectAddressResult = useCallback((result: AddressSearchItem) => {
    setActiveTabIdx(-1) // 메뉴 해제 (detail 은 activeTabIdx effect 가 함께 해제)
    setIsEventPanelOpen(false) // 이벤트 패널 닫기
    setActiveEvent(null) // 이벤트 활성 해제
    setSearchTarget((prev) => ({
      lng: result.lng,
      lat: result.lat,
      seq: (prev?.seq ?? 0) + 1,
    }))
  }, [])

  // 우측 영역 전체 렌더 (CCTV + DisasterPanel/SidePanel/없음).
  // cross-fade prev/current 각각 이 함수로 렌더돼서 idx 별 layout 차이를 정확히 보여줌.
  // 공통 메뉴끼리 (예: 0→2) 전환 시 CCTV 는 양쪽에서 동일 → visual 차이 없음.
  // idx 4 전환 시 CCTV 가 한쪽에만 있음 → CCTV 부분이 fade in/out 으로 부드럽게 처리됨.
  // CCTV(또는 그 자리를 대신하는 패널) — 메뉴가 바뀌어도 내용이 같으면 그대로 둔다.
  //   cross-fade 대상에서 빼야 CCTV 가 사라졌다 나타나지 않는다.
  const renderCctvSlot = (idx: number) => (
    <>
      {/* 급경사지 계측 상세 — CCTV 자리에 지역별 센서값 패널. */}
      {idx === 2 && slopeTab === 'measure' && (
        <SlopeSensorPanel
          onSelectSensor={(sensor) => {
            setSlopeSensor(sensor)
            // 계측기를 바꾸면 차트 기간은 기본값(실시간)으로 돌아간다.
            setSlopePeriod('실시간')
            // 선택 센서 위치로 지도 이동 + 물방울/라벨 강조 (좌표 없는 센서는 이동 안 함).
            if (sensor.lat !== null && sensor.lng !== null) {
              const { lat, lng, label } = sensor
              setSlopeFocus((prev) => ({
                name: label,
                lng,
                lat,
                sensor,
                seq: (prev?.seq ?? 0) + 1,
              }))
            }
          }}
        />
      )}
      {idx === 2 && slopeTab === 'alert' && <SlopeAlertPanel range={alarmRange} />}
      {/* 재난 예·경보(4) 에서도 언마운트하지 않는다 — 오버레이가 가리고 있는 동안
          플레이어가 사라졌다 새로 붙으면 나올 때 검은 화면이 한 번 번쩍인다. */}
      {!(idx === 2 && (slopeTab === 'measure' || slopeTab === 'alert')) && (
          <CctvGrid
            items={activeCctvList}
            hasCctv={hasCctv}
            onExpand={openModal}
            // 급경사지 — 512 축소 규격 (본문 672 에 메인 320 + 작은 2×176 = 672 로 딱 맞음).
            //   폭은 지도 폭과 같은 기준·지연(3단계), 높이는 2단계(본문 세로 확대) 에 맞춘다.
            //   idx(settled) 를 쓰면 목록 교체 시점까지 밀려 지도보다 늦게 움직인다.
            compact={displayedTabIdx === 2}
            compactHeight={displayedTabIdx === 2}
          />
        )}
    </>
  )

  // 재난 예·경보 — 우측 전체(1132)를 덮는 오버레이. 지도 폭이 그대로라
  //   CCTV/패널을 밀어내는 대신 오른쪽에서 슬라이드해 들어와 가린다.
  const renderDisasterPanel = () => (
          <DisasterPanel
            broadcastList={broadcastList}
            signboardList={signboardList}
            onSelectionChange={handleDisasterSelectionChange}
            externalToggle={disasterToggle}
            onMenuChange={setDisasterMode}
            // CCTV 셀 expand → 기존 CCTVModal 전체화면 (shape 이 CCTVMeta 와 동일).
            onExpandCctv={openModal}
            // 재해 문자 전광판 미리보기 CCTV — 체크된 전광판 전부를 선택 순서대로 셀에 표출.
            //   전광판 id → 연결된 CCTV (cctv-sync signboard-cctv).
            //   연결 없으면 cctvId 없이 셀만 (헤더 = 전광판 이름, player 는 "영상 없음").
            signboardPreviewItems={[...signboardSelectedIds]
              .map((id) => signboardList.find((s) => s.id === id))
              .filter((sb): sb is FacilityListItem => !!sb)
              .map((sb) => ({
                label: sb.name,
                cctvId: signboardCctv[sb.id] ?? undefined,
              }))}
          />
  )

  // 메뉴별 사이드 패널 — 이쪽만 전환 애니메이션 대상.
  const renderSidePanel = (idx: number) => (
    <>
      {idx === 2 && slopeTab === 'alert' && (
        <div className={slopeEntering ? 'slope-panel-in' : undefined}>
          <SlopeStatsPanel onRangeChange={setAlarmRange} />
        </div>
      )}
      {idx === 2 && slopeTab === 'measure' && (
        <div className={slopeEntering ? 'slope-panel-in' : undefined}>
          <SlopeChartPanel
            sensor={slopeSensor}
            period={slopePeriod}
            onPeriodChange={setSlopePeriod}
          />
        </div>
      )}
      {COMMON_MENU_INDICES.includes(idx) &&
        !(idx === 2 && (slopeTab === 'measure' || slopeTab === 'alert')) && (
          <div
            className={
              idx === 2 && slopeEntering ? 'slope-panel-in' : undefined
            }
          >
            <SidePanel
              title={
                idx === 0 && selectedPumpRegion
                  ? `${selectedPumpRegion} 배수펌프장`
                  : TABS[idx]
              }
              // 크기는 슬롯(자리) 과 같은 시점에 바뀐다 — 내용(settled) 과 같이 두면
              // 폭이 줄어든 뒤 크기가 한 번 더 튄다.
              width={sidePanelWidthOf(displayedTabIdx) || 480}
              headerHeight={displayedTabIdx === 2 ? 54.539 : 56}
            >
              {idx === 0 && (
                <div className="relative flex h-full w-full flex-col">
                  <PumpStationPanel onSelectStation={setSelectedPumpRegion} />
                  {/* 상세 — 목록 위를 덮는 오버레이. 오른쪽에서 들어오고 오른쪽으로 나간다. */}
                  {(selectedPumpRegion || pumpDetailLeaving) && (
                    <div
                      className={`pump-detail-panel ${
                        selectedPumpRegion ? 'is-in' : 'is-out'
                      }`}
                    >
                      <PumpDetailPanel
                        name={
                          selectedPumpRegion ?? lastPumpRegionRef.current ?? ''
                        }
                      />
                    </div>
                  )}
                </div>
              )}
              {idx === 2 && (
                <SlopeListPanel
                  onSelectRow={(a) =>
                    setSlopeFocus((prev) =>
                      a ? { ...a, seq: (prev?.seq ?? 0) + 1 } : null,
                    )
                  }
                  selectedAreaId={slopeFocus?.managedAreaId ?? null}
                />
              )}
              {idx === 3 && <EarthquakePanel />}
              {idx === 5 && (
                <LayerPanel
                  cctvRegions={cctvRegions}
                  cctvRegionChecked={cctvRegionChecked}
                  onCctvRegionChange={(id, next) => {
                    setCctvRegionChecked((prev) => {
                      const s2 = new Set(prev ?? [])
                      if (next) s2.add(id)
                      else s2.delete(id)
                      // 하위가 하나도 없으면 CCTV 레이어도 꺼진 것으로 본다.
                      setLayerChecked((c) => ({
                        ...c,
                        [CCTV_LAYER_CODE]: s2.size > 0,
                      }))
                      return s2
                    })
                  }}
                  checked={layerChecked}
                  onCheckedChange={(code, next) => {
                    setLayerChecked((prev) => ({ ...prev, [code]: next }))
                    // CCTV 는 하위 행정동 트리와 함께 켜고 끈다.
                    if (code === CCTV_LAYER_CODE) {
                      setCctvRegionChecked(
                        next ? new Set(cctvRegions.map((r) => r.id)) : new Set(),
                      )
                    }
                  }}
                  labelOn={layerLabelOn}
                  onLabelOnChange={(code, next) =>
                    setLayerLabelOn((prev) => ({ ...prev, [code]: next }))
                  }
                />
              )}
            </SidePanel>
          </div>
        )}
    </>
  )

  return (
    <div
      className="relative flex h-full w-full flex-col text-white"
      // 메인 배경 — Neutral-900 단색. (기존 bg-center 이미지에서 교체)
      //   --map-shift-delay: 급경사지 전환에서만 폭 변화를 3단계(0.7s 뒤)로 미룬다.
      //   다른 메뉴는 0s — CCTV 와 패널이 같은 타이밍에 함께 움직인다.
      style={
        {
          background: COLORS.neutral900,
          '--map-shift-delay': slopeShiftDelay,
        } as React.CSSProperties
      }
    >
      {/* 헤더 — 2000×104. 배경은 비활성 메뉴 버튼 (.menu-inactive-btn) normal 상태와 동일:
          - linear-gradient(180deg, #0E3E6E 0%, #002245 100%)
          - border 2px rgba(175, 205, 238, 0.15)
          - shadow 0 3px 5px rgba(0,0,0,0.15)
          좌우 40px 씩 메인 패널 (1920) 밖으로 빠져나감 (effect 용). */}
      <Header
        onTitleClick={handleReset}
        onSelectAddress={handleSelectAddressResult}
        searchKey={searchKey}
      />

      <MenuTabs
        activeTabIdx={selectedTabIdx}
        onSelectTab={(idx) => {
          setActiveTabIdx((prev) => (prev === idx ? -1 : idx))
          setSearchTarget(null) // 메뉴 조작 시 검색 핀 제거
          setActiveEvent(null) // 메뉴 조작 시 이벤트 활성 해제
        }}
      />

      <div
        className={`dashboard-content-transition is-${adminTransition}${activeTabIdx === 6 ? ' is-admin' : ''}${adminSlideEntry ? ' is-admin-slide-entry' : ''}${adminSlopePair ? ' is-admin-slope-pair' : ''}`}
        onAnimationEnd={(event) => {
          if (event.animationName === 'admin-slope-header-leave' && adminTransition === 'pair-leaving') {
            const target = selectedTabRef.current
            commitActiveTabIdx(target)
            setPendingMapMenu(target === 2 ? target : null)
            setAdminTransition('pair-entering')
          }
          if (event.target === event.currentTarget && event.animationName === 'dashboard-content-leave' && adminTransition === 'leaving') {
            finishAdminExit()
          }
        }}
      >
      {/* 급경사지 서브탭 + 요약 바 — 3탭 공통 영역. */}
      {slopeHeaderMounted && activeTabIdx !== 6 && (
        <div
          className={`slope-header-slot shrink-0 ${
            activeTabIdx === 2 && adminTransition !== 'slope-leaving' ? '' : 'is-closing'
          }`}
        >
          <div
            className={`slope-header-enter flex flex-col items-center ${
              activeTabIdx === 2 && adminTransition !== 'slope-leaving' ? '' : 'is-closing'
            }`}
            style={{ gap: '12px', paddingBottom: '12px' }}
          >
            <SlopeSubTabs active={slopeTab} onChange={setSlopeTab} />
            <SlopeSummaryBar
              measureMode={slopeTab === 'measure'}
              selectedArea={slopeArea}
              onSelectArea={(area) => {
                // 같은 지역을 다시 누르면 선택 해제 (지도 이동 없음).
                if (slopeArea === area) {
                  setSlopeArea(null)
                  setSlopeFocus(null)
                  return
                }
                setSlopeArea(area)
                // 상시계측 지역 탭 → 그 지역 위치로 지도 이동.
                const target = areaLocations.find((a) => a.name === area)
                if (target && target.lat !== null && target.lng !== null) {
                  const { name, lat, lng } = target
                  setSlopeFocus((prev) => ({
                    name,
                    lng,
                    lat,
                    seq: (prev?.seq ?? 0) + 1,
                  }))
                }
              }}
            />
          </div>
        </div>
      )}

      {/* 관리자 서브탭 + 공지 바 — 급경사지와 같은 구조 (본문은 아직 비어 있다). */}
      {activeTabIdx === 6 && (
        <div className="slope-header-slot shrink-0">
          <div
            className="slope-header-enter flex flex-col items-center"
            style={{ gap: '12px', paddingBottom: '12px' }}
          >
            <AdminSubTabs active={adminTab} onChange={(next) => {
              if (next !== adminTab) setAdminDeviceIndex(0)
              setAdminTab(next)
            }} />
            <AdminNoticeBar />
          </div>
        </div>
      )}

      {/* 관리자 본문 — 서버랙 + 장비 목록. */}
      {activeTabIdx === 6 && (
        <main
          className="flex shrink-0 gap-3"
          style={{
            marginLeft: '16px',
            marginRight: '16px',
            marginBottom: '8px',
            flex: '1 0 0',
            minHeight: 0,
          }}
        >
          {adminTab === 'server' ? <>
          <AdminRack />
          <AdminDeviceList selectedIndex={adminDeviceIndex} onSelect={setAdminDeviceIndex} />
          {adminDeviceIndex === 0 ? <>
          <AdminFirewallPanel />
          <div className="admin-hardware-panels">
            <AdminFrontPorts />
            <AdminRearPower />
          </div>
          </> : (
            <div className="admin-device-placeholder" role="status">화면이 준비중입니다.</div>
          )}
          </> : (
            <div className="admin-device-placeholder" role="status">화면 준비중입니다</div>
          )}
        </main>
      )}

      {/* 본문 영역 — 지도 + CCTV (+ 공통 메뉴 시 사이드 패널)
          지도 W: 기본 1236 / 공통 메뉴 active 744 / 재난 예·경보 784 */}
      <main
        className="flex shrink-0 gap-3"
        style={{
          display: activeTabIdx === 6 ? 'none' : undefined,
          marginLeft: '16px',
          marginRight: '16px',
          marginBottom: '8px',
          // 높이는 남는 공간 그대로 — 헤더 자리(0↔168) 가 열리고 닫히는 만큼 자동으로 따라간다.
          //   별도 height 애니메이션을 두면 슬롯 애니메이션과 시작 시점이 어긋나 하단이 흔들린다.
          flex: '1 0 0',
          minHeight: 0,
        }}
      >
        {/* 지도 영역 — H 840, W 는 메뉴 active 여부에 따라 다름
            배수펌프장 구역 선택 시 PumpDetailMap (배경 이미지) 으로 교체
            레이어 메뉴 active 시 MapLegend overlay (지도 위)
            재난 예·경보 (idx 4) 시 지도 784 + DisasterPanel 1092 (CCTV 자리 + 사이드 자리 합쳐서) */}
        {/* CCTV 그리드가 640 이라 공통 메뉴 시 지도는 744 (= 1888 - 12 - 640 - 12 - 480). */}
        <section
          className={`relative shrink-0 overflow-hidden rounded-lg${adminSlideEntry && cctvEntryDone && pendingMapMenu === null ? ' admin-map-reveal' : ''}`}
          style={{
            width: `${mapWidthOf(displayedTabIdx, cctvOpen)}px`,
            height: '100%',
            borderRadius: '16px',
            opacity: pendingMapMenu === activeTabIdx || (adminSlideEntry && !cctvEntryDone) ? 0 : 1,
            visibility: pendingMapMenu === activeTabIdx || (adminSlideEntry && !cctvEntryDone) ? 'hidden' : 'visible',
            // width transition 부드럽게 — canvas 가 부모와 무관하게 1236 fix 라서 resize 없음.
            // section 좁아지면 안의 1236 canvas 가 자연스럽게 우측 cropping (overflow hidden).
            transition: `width 0.45s cubic-bezier(0.33, 1, 0.68, 1) ${shiftDelay}, opacity ${pendingMapMenu === activeTabIdx ? '0s' : '0.3s'} ease-out`,
            contain: 'layout paint',
            willChange: 'width, height',
          }}
        >
          {/* MapSection 은 항상 mount — detail 진입 시 PumpDetailMap 을 absolute overlay 로
              덮어서 지도가 새로 렌더링 (빈 회색 → 타일 채워짐) 되지 않게.
              메뉴 컨텍스트(activeTabIdx) + 레이어 체크/라벨 (layerChecked/layerLabelOn)
              → 마커 표출 조건 결정. 마커 색은 MapSection 이 store(useLayerColorMap) 직접 구독. */}
          <MapSection
            activeTabIdx={activeTabIdx}
            onMenuCameraSettled={handleMenuCameraSettled}
            // 급경사지 총괄·관제 서브탭에서만 관리지역 마커.
            // CCTV 마커는 목록이 정해지는 시점에 같이 뜬다.
            cctvMarkersTabIdx={settledTabIdx}
            // 급경사지는 폭 변화가 늦게(0.55s+0.45s) 끝나므로 카메라도 그 뒤에.
            //   재난에서 벗어나는 중이면 오버레이(0.3s) 가 다 빠진 뒤에 카메라를 움직인다.
            cameraDelayMs={
              adminSlopePair ? 0 : slopeShiftDelay !== '0s' ? 1050 : disasterLeaving ? 320 : 420
            }
            slopeManagedMarkers={activeTabIdx === 2 && slopeTab === 'overview'}
            slopeMeasureMarkers={activeTabIdx === 2 && slopeTab === 'measure'}
            slopeAlertBubbles={activeTabIdx === 2 && slopeTab === 'alert'}
            alarmRange={alarmRange}
            slopeFocus={slopeFocus}
            onCloseSlopeInfo={() => setSlopeFocus(null)}
            layerChecked={layerChecked}
            layerLabelOn={layerLabelOn}
            broadcastList={broadcastList}
            broadcastEmphasizedIds={broadcastSelectedIds}
            signboardList={signboardList}
            signboardEmphasizedIds={signboardSelectedIds}
            disasterMode={disasterMode}
            onSelectDisasterFacility={handleSelectDisasterFacility}
            searchTarget={searchTarget}
            resetSeq={resetSeq}
            activeEvent={activeEvent}
            onDeactivateEvent={() => setActiveEvent(null)}
            isEventPanelOpen={isEventPanelOpen}
            cctvList={cctvList}
            cctvVisibleIds={cctvVisibleIds}
            menuCctvList={cctvOfMenu(settledTabIdx)}
            selectedCctvList={displayedCctvList}
            // 지도 좁아질 때 캔버스(1236) 우측 crop 폭만큼 컨트롤을 왼쪽으로.
            overlayRightInset={mapRightInset(displayedTabIdx, cctvOpen)}
            // 카메라 보정은 클릭 즉시 확정되는 activeTabIdx 기준 —
            // displayed 를 쓰면 한 프레임 뒤 값이 또 바뀌어 easeTo 가 두 번 돈다 (지도가 움찔).
            cameraRightInset={mapRightInset(activeTabIdx, cctvOpen)}
            // 지도가 가려지는 화면(배수펌프장 상세 / 하천시설물 오버레이) — 컨트롤/측정 숨김 + 툴 초기화.
            hideControls={!!selectedPumpRegion || activeTabIdx === 1}
            // 초기화 버튼 → 카메라 기본값 복귀 + 주소 검색(핀·최근접 CCTV·검색어) 초기화.
            netTarget={netTarget}
            onExpandCctv={openModal}
            onNetPick={handleNetPick}
            onNetActivate={handleNetActivate}
            onResetView={() => {
              setSearchTarget(null)
              setNetTarget(null)
              setSearchKey((k) => k + 1) // 검색바 remount → 입력값 초기화
              setResetSeq((s) => s + 1)
            }}
          />
          {(selectedPumpRegion || pumpDetailLeaving) && (
            <div
              className={`pump-detail-map absolute inset-0 overflow-hidden ${
                selectedPumpRegion ? 'is-in' : 'is-out'
              }`}
              style={{ zIndex: 10, borderRadius: '16px' }}
              onAnimationEnd={() => {
                if (!selectedPumpRegion) setPumpDetailLeaving(false)
              }}
            >
              <PumpDetailMap
                name={selectedPumpRegion ?? lastPumpRegionRef.current ?? ''}
                onBack={() => {
                  setPumpDetailLeaving(true)
                  setSelectedPumpRegion(null)
                }}
              />
            </div>
          )}
          {/* 이벤트 버튼/패널 — 지도 영역 좌상단. row 선택 시 flyTo + 마커 (MapSection). */}
          {!selectedPumpRegion && (
            <EventButton
              // 급경사지는 지도가 672 라 패널도 같은 높이로.
              panelHeight={displayedTabIdx === 2 ? 672 : 840}
              activeEvent={activeEvent}
              onActivateEvent={handleActivateEvent}
              isOpen={isEventPanelOpen}
              onOpenChange={(open) => {
                setIsEventPanelOpen(open)
                if (!open) setActiveEvent(null) // 패널 닫으면 활성 이벤트 해제
              }}
            />
          )}

          {/* CCTV 접기 — 지도 위 우측 가장자리 오버레이 (지도 폭을 차지하지 않는다).
              재난 예·경보(4)는 CCTV 자리를 패널이 덮고, 급경사지(2)는 CCTV 규격이
              본문 높이에 맞춰져 있어 접기 대상에서 뺀다. */}
          {displayedTabIdx !== 4 && displayedTabIdx !== 2 && (
            <button
              type="button"
              className="cctv-collapse-handle"
              aria-label={cctvOpen ? 'CCTV 접기' : 'CCTV 펼치기'}
              onClick={toggleCctv}
            >
              {cctvOpen ? '›' : '‹'}
            </button>
          )}
        </section>

        {/* 우측 영역 (CCTV + DisasterPanel/SidePanel) — cross-dissolve + 미세 슬라이드 전환.
            prev/current 둘 다 renderRightArea 로 렌더해서 idx 별 layout 차이까지 정확히 슬라이드.
            overflow-hidden — translateX off-screen content 클리핑 (인접 영역 침범 방지).
            bg #001229 — fade 중 자식 opacity < 1 일 때 부모(bg-center) 비치는 흰 번쩍임 방지.
            border-radius 20 — wrapper 모서리 둥글려 어두운 띠 인상 완화 (자식 panel radius 와 통일). */}
        <div
          className="relative flex flex-1 gap-3 overflow-hidden"
          style={{ background: '#001229', borderRadius: '20px' }}
        >
          {/* CCTV + 사이드 패널 — 한 줄로 붙어서 같이 움직인다.
              패널 자리는 폭 0 ↔ 패널폭 으로 여닫고, CCTV 는 그 레이아웃 변화에 밀려
              메인 위치로 돌아간다 (별도 transform 애니메이션 없음). */}
          <div className="flex flex-1 gap-3" style={{ visibility: activeTabIdx === 4 ? 'hidden' : 'visible' }}>
            {/* CCTV 자리 — 폭은 그대로 두고 음수 marginRight 로 자리만 회수한다.
                지도가 넓어지는 양(+640)과 회수량(-640)이 매 프레임 상쇄돼
                우측 본문 패널은 전혀 움직이지 않는다.
                내용은 오른쪽으로 밀려 우측 패널 뒤로 들어가듯 사라진다. */}
            <div
              className="admin-cctv-entry flex shrink-0 overflow-hidden"
              onAnimationEnd={(event) => {
                if (event.target === event.currentTarget && event.animationName === 'admin-panel-slide-in') setCctvEntryDone(true)
              }}
              style={{
                marginRight:
                  cctvOpen || displayedTabIdx === 4 || displayedTabIdx === 2
                    ? 0
                    : `-${CCTV_SLOT_W}px`,
                transition: `margin-right 0.45s cubic-bezier(0.33, 1, 0.68, 1) ${shiftDelay}`,
              }}
            >
              <div
                className="flex"
                style={{
                  transform:
                    cctvOpen ||
                    displayedTabIdx === 4 ||
                    displayedTabIdx === 2
                      ? 'translateX(0)'
                      : 'translateX(100%)',
                  transition: `transform 0.45s cubic-bezier(0.33, 1, 0.68, 1) ${shiftDelay}`,
                }}
              >
                {renderCctvSlot(settledTabIdx)}
              </div>
            </div>
            <div
              className="admin-side-entry flex shrink-0 overflow-hidden"
              style={{
                width: sidePanelWidth ? `${sidePanelWidth}px` : '0px',
                transition:
                  'width 0.45s cubic-bezier(0.33, 1, 0.68, 1) var(--map-shift-delay, 0s)',
                // 폭이 매 프레임 바뀌어도 내부 레이아웃/페인트는 다시 계산하지 않는다.
                contain: 'layout paint size style',
                willChange: 'width',
              }}
            >
              {/* 닫히는 동안에도 마지막 패널을 그대로 보여준다.
                  오른쪽 기준으로 잘려야 패널이 화면 밖으로 밀려나가는 것처럼 보인다. */}
              <div className="flex shrink-0 gap-3">
                {renderSidePanel(
                  hasSidePanel(displayedTabIdx)
                    ? displayedTabIdx
                    : lastPanelIdx,
                )}
              </div>
            </div>
          </div>
          {/* 재난 예·경보 — 우측 전체를 덮는 오버레이. 나갈 때는 오른쪽으로 밀려난다.
              지도 폭이 그대로라 CCTV/패널을 밀어낼 필요가 없다. */}
          {(activeTabIdx === 4 || displayedTabIdx === 4 || disasterLeaving) && (
            <div
              className={`disaster-overlay ${
                activeTabIdx === 4 || displayedTabIdx === 4
                  ? 'is-in'
                  : // 해제(→ 메인) 만 지도 폭이 함께 커지므로 여유 있게.
                    //   배수펌프장은 오버레이가 빠진 뒤 지도가 3D 로 기운다 (카메라 지연).
                    `is-out ${displayedTabIdx === -1 ? 'is-slow' : ''}`
              }`}
              onAnimationEnd={() => {
                if (displayedTabIdx !== 4) setDisasterLeaving(false)
              }}
            >
              {renderDisasterPanel()}
            </div>
          )}
        </div>
      </main>
      </div>

      {/* CCTV 확장 modal — ExpandButton 클릭 시 open, CollapseButton / backdrop 클릭 시 close.
          항상 mount + opacity / scale / backdrop-filter transition 으로 부드러운 open/close */}
      <CCTVModal
        isOpen={modalOpen}
        onClose={closeModal}
        number={expandedCCTV?.number ?? 0}
        name={expandedCCTV?.name ?? ''}
        cctvId={expandedCCTV?.cctvId}
      />
      {/* 하천시설물 메뉴 (idx 1) 클릭 시 외부 사이트 오버레이.
          닫기 버튼 → activeTabIdx -1 으로 복귀 (기본 layout). */}
      {activeTabIdx === 1 && (
        <RiverFacilityOverlay onClose={() => setActiveTabIdx(-1)} />
      )}
    </div>
  )
}
