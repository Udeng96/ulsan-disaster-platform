// 메인 대시보드 (1920×1080) — 헤더 + 메뉴 버튼 + 본문(지도 · CCTV · 메뉴 패널).
//   상태는 state.ts 저장소에 있고, 각 칸은 자기 값만 구독한다 (한 값이 바뀌어도 전체가 다시 그려지지 않게).
//   지도는 새 지도 부품(app/wall/map)이 그린다 (지도 새로 만들기 8단계에서 옛 MapSection 을 뗌).
import { memo, useEffect, useMemo } from 'react'
import { cn, PanelBody, PanelHeader, useKept, usePrevious } from '@/shared/ui'
import { Header } from './Header'
import { CctvGrid } from '../menus/cctv/CctvGrid'
import { CctvModal } from '../menus/cctv/CctvModal'
import { CctvSync } from '../menus/cctv/state'
import { DisasterPanel } from '../menus/disaster/DisasterPanel'
import { DisasterSync } from '../menus/disaster/state'
import { EventPanel } from '../menus/event/EventPanel'
import { EventSync } from '../menus/event/state'
import { EarthquakePanel } from '../menus/earthquake/EarthquakePanel'
import { EarthquakeSync } from '../menus/earthquake/stream'
import { LayerPanel } from '../menus/layer/LayerPanel'
import { useLayerColorSync } from '../menus/layer/colors'
import { LayerSync } from '../menus/layer/data'
import { AdminHeader } from '../menus/admin/AdminHeader'
import { AdminRack } from '../menus/admin/AdminRack'
import { ServerList } from '../menus/admin/ServerList'
import { ServerStatus } from '../menus/admin/ServerStatus'
import { FirewallDetail } from '../menus/admin/FirewallDetail'
import { SwitchDetail } from '../menus/admin/SwitchDetail'
import { DatabaseDetail } from '../menus/admin/DatabaseDetail'
import { CctvDetail, DashboardDetail, GisDetail, IotDetail, SolutionDetail } from '../menus/admin/OpsDetail'
import { InnerDetail, InnerNetDetail, OuterDetail, OuterNetDetail } from '../menus/admin/LinkDetail'
import { MessengerDetail } from '../menus/admin/MessengerDetail'
import { AssetLedger } from '../menus/admin/AssetLedger'
import { EtcFlow } from '../menus/admin/EtcFlow'
import { RiverOverlay } from '../menus/river/RiverOverlay'
import { admin as adminState } from '../menus/admin/state'
import { SlopeHeader } from '../menus/slope/SlopeHeader'
import { SlopeList } from '../menus/slope/SlopeList'
import { SlopeAlerts } from '../menus/slope/SlopeAlerts'
import { SlopeChart } from '../menus/slope/SlopeChart'
import { SlopeSensors } from '../menus/slope/SlopeSensors'
import { SlopeStats } from '../menus/slope/SlopeStats'
import { slope, SlopeSync } from '../menus/slope/state'
import { useFocusCamera, useMenuCamera } from '../map/camera'
import { CctvMarkers } from '../map/cctv/CctvMarkers'
import { Controls } from '../map/Controls'
import { DisasterFacilities } from '../map/layers/DisasterFacilities'
import { LayerFacilities } from '../map/layers/LayerFacilities'
import { EventMarker } from '../map/event/EventMarker'
import { SearchPins } from '../map/event/SearchPins'
import { Legend } from '../map/Legend'
import { PumpLayer } from '../map/pump/PumpLayer'
import { QuakeMarkers } from '../map/QuakeMarkers'
import { SlopeMarkers } from '../map/slope/SlopeMarkers'
import { SlopePopups } from '../map/slope/SlopePopups'
import { MapView } from '../map/MapView'
import { MAP_CANVAS_H, mapState } from '../map/state'
import { MenuTabs } from './MenuTabs'
import { canCollapseCctv, cctv, dash, DISASTER_MS, MAP_CANVAS_W, mapWidth, MENU, MENUS, sidePanelWidth, SLIDE_MS, SLOPE_OUT_MS, toggleCctv } from './state'

function MapArea() {
  const menu = dash.use((s) => s.menu)
  const layoutMenu = dash.use((s) => s.layoutMenu)
  const cctvOpen = dash.use((s) => s.cctvOpen)
  const sliding = dash.use((s) => s.sliding)
  const resetSeq = dash.use((s) => s.resetSeq)
  const activeEvent = dash.use((s) => s.activeEvent)
  // 급경사지 마커는 지도 오른쪽이 다 움직인 뒤 (옛 화면과 같게)
  const slopeSettled = menu === MENU.slope && layoutMenu === MENU.slope && !sliding
  const slopeTab = slope.use((s) => (slopeSettled ? s.tab : null))
  const map = mapState.use((s) => s.map)
  // 보이는 지도 폭. 지도 칸은 처음부터 가장 넓게(MAP_CANVAS_W) 그려 두고
  //   CCTV·메뉴 패널(RightOverlay)이 그 위를 덮었다 비켰다 한다 — 메뉴를 바꾸거나 CCTV 를 접어도 폭을 바꾸지 않게.
  const inset = MAP_CANVAS_W - mapWidth(layoutMenu, cctvOpen)
  const overlayEdge = useMemo(() => ({ baseInset: 0, animate: sliding }), [sliding])
  // 카메라는 지도 오른쪽이 다 움직인 뒤 맞춘다. 급경사지로 들고 날 때 배치가 아직 안 바뀌었으면
  //   바뀔 때(이 값이 다시 바뀌어 다시 잡힘)까지 기다린다
  const cameraDelayMs = menu !== layoutMenu ? CAMERA_HOLD_MS : sliding ? SLIDE_MS : 0
  useMenuCamera({ map, menu, inset, delayMs: cameraDelayMs, resetSeq })
  useFocusCamera(map)

  return (
    <section className="relative h-full shrink-0 overflow-hidden rounded-2xl [contain:layout_paint]" style={{ width: MAP_CANVAS_W }}>
      {/* 지도 칸은 가장 클 때(1888×840)로 고정 — 오른쪽 패널·급경사지 머리 줄이 가리고, 지도는 크기를 다시 재지 않는다 (재면 덜덜 떤다).
          옛 화면 지도 부품에 있던 움직임은 아직 끈다 (애니메이션은 하나씩 의논해서 넣는다).
          CCTV 접기 때 오른쪽 끝을 따라가는 버튼·범례(data-edge)와 옛 화면 그대로 쓰는 범례 여닫기(data-anim)만 남긴다 */}
      <div
        className="relative overflow-hidden rounded-2xl [&_*:not([data-edge]):not([data-anim])]:transition-none!"
        style={{ width: MAP_CANVAS_W, height: MAP_CANVAS_H }}
      >
        <MapView />
        <Controls inset={inset} edge={overlayEdge} hidden={menu === MENU.river} netDisabled={!!activeEvent || menu === MENU.layer} />
        <Legend inset={inset} edge={overlayEdge} slopeTab={slopeTab} />
        <LayerFacilities />
        <DisasterFacilities />
        <SlopeMarkers tab={slopeTab} />
        <SlopePopups tab={slopeTab} />
        <PumpLayer />
        <QuakeMarkers />
        <SearchPins />
        <CctvMarkers />
        <EventMarker />
      </div>
      {/* 급경사지는 머리 줄만큼 낮다 — 나가는 중에는 자리가 닫힐 때까지 */}
      <EventPanel height={menu === MENU.slope || layoutMenu === MENU.slope ? 672 : 840} />
    </section>
  )
}

/** 급경사지로 들고 날 때 배치가 바뀌기 전 — 카메라를 잡아 두는 시간 (배치가 바뀌면 다시 잡힌다) */
const CAMERA_HOLD_MS = 60_000

/** 지도 오른쪽 끝 둥근 모서리 — 넓게 그려 둔 지도 위에서 보이는 끝을 만든다 (위·아래 모서리 바깥만 바탕색) */
function MapEdgeCover() {
  return (
    <div className="pointer-events-none flex h-full w-4 shrink-0 flex-col justify-between">
      <div className="size-4 bg-[radial-gradient(circle_at_0_100%,transparent_16px,var(--color-neutral-900)_16.5px)]" />
      <div className="size-4 bg-[radial-gradient(circle_at_0_0,transparent_16px,var(--color-neutral-900)_16.5px)]" />
    </div>
  )
}

/** 지도 끝 가리개 + CCTV 칸 + 손잡이 — 지도 끝을 따라 통째로 이동(transform)한다.
 *  메뉴를 바꾸면 지도 끝 자리로, 접으면 메뉴 패널 밑(오른쪽)으로 들어간다.
 *  재난 예·경보는 패널이 이 위를 덮는다 (CCTV 는 숨김, 옛 화면과 같게).
 *  급경사지 계측 상세·조기경보는 CCTV 자리에 패널. */
function CctvSlider() {
  const menu = dash.use((s) => s.layoutMenu)
  const open = dash.use((s) => s.cctvOpen)
  const sliding = dash.use((s) => s.sliding)
  const hasCells = cctv.use((s) => s.cells.length > 0)
  const slopeTab = slope.use((s) => (menu === MENU.slope ? s.tab : null))
  const collapsible = canCollapseCctv(menu)
  return (
    <div
      className={cn('absolute top-0 left-0 z-[1] flex h-full', sliding && 'transition-slide')}
      style={{ translate: `${mapWidth(menu, open) - 16}px 0` }}
    >
      <MapEdgeCover />
      <div className="h-full w-3 shrink-0 bg-neutral-900" />
      <div className="h-full w-[640px] shrink-0 bg-neutral-900">
        {/* 접을 때는 옛 화면처럼 CCTV 가 한 칸 더 빨리 빠진다 (자기 폭만큼 더 이동).
            펼 때는 바로 제자리로 돌려 두어 배경과 같이 들어온다. */}
        <div className={cn('h-full', sliding && !open && 'transition-slide', !open && 'translate-x-full', menu === MENU.disaster && 'invisible')}>
          {slopeTab === 'measure' ? <SlopeSensors /> : slopeTab === 'alert' ? <SlopeAlerts /> : hasCells && <CctvGrid />}
        </div>
      </div>
      {collapsible && (
        <button
          type="button"
          aria-label={open ? 'CCTV 접기' : 'CCTV 펼치기'}
          onClick={toggleCctv}
          className="absolute top-1/2 -left-1 h-[76px] w-5 -translate-y-1/2 rounded-l-lg border border-neutral-450 bg-neutral-800 text-[18px] leading-none text-neutral-200 transition-ui-slow hover:bg-neutral-450 hover:text-white"
        >
          {open ? '›' : '‹'}
        </button>
      )}
    </div>
  )
}

/** 메뉴 패널 — 오른쪽 밖에서 밀려 들어오고, 메뉴를 끄면 마지막 패널 그대로 밀려 나간다.
 *  CCTV 칸과 같은 시간·곡선이라 둘이 붙어서 움직인다.
 *  메뉴끼리 바꿀 때는 이전 패널을 깔아 둔 채 새 패널이 오른쪽에서 밀려 들어와 덮는다 (PANEL_SWAP_MS, 10-19 사용자 결정). */
function SidePanelSlider() {
  const menu = dash.use((s) => s.layoutMenu)
  const sliding = dash.use((s) => s.sliding)
  const has = sidePanelWidth(menu) > 0
  const shown = useKept(has ? menu : null, SLIDE_MS)
  const under = usePrevious(shown, PANEL_SWAP_MS)
  if (shown === null) return null
  return (
    <div className={cn('absolute top-0 right-0 z-[2] h-full overflow-hidden bg-neutral-900 pl-3', sliding && 'transition-slide starting:translate-x-full', !has && 'translate-x-full')}>
      {under !== null && (
        <div className="absolute top-0 right-0 h-full bg-neutral-900">
          <SidePanelArea menu={under} />
        </div>
      )}
      <div key={shown} className={cn('relative h-full bg-neutral-900', under !== null && 'animate-panel-in')}>
        <SidePanelArea menu={shown} />
      </div>
    </div>
  )
}
/** 메뉴끼리 바꿀 때 새 패널이 밀려 들어오는 시간 — tokens.css animate-panel-in 과 같게 */
const PANEL_SWAP_MS = 350

/** 재난 예·경보 — CCTV·메뉴 패널 자리를 덮는 패널. 오른쪽에서 밀려 들어오고 나갈 때 밀려 나간다 (0.6초).
 *  덮었다 비키는 동안 뒤는 움직이지 않는다 — 들어갈 때는 다 덮은 뒤 뒤를 바꾸고, 나갈 때는 갈 화면이 이미 제자리에 있다 (state.ts).
 *  급경사지로 나갈 때는 배치가 바뀔 때(머리 줄 자리가 열린 뒤)까지 덮고 있다. */
function DisasterSlider({ back }: { back: boolean }) {
  const on = dash.use((s) => s.menu === MENU.disaster || s.layoutMenu === MENU.disaster)
  const shown = useKept(on || null, DISASTER_MS)
  if (!shown) return null
  return (
    <div className="absolute top-0 right-0 z-[3] h-full overflow-hidden" style={{ width: MAP_CANVAS_W - mapWidth(MENU.disaster, true) }}>
      {/* 관리자에서 오면 본문과 같이 제자리에서 나타난다 — 밀려 들어오면 그 사이로 뒤(CCTV·메뉴 패널)가 보여서 (사용자 10-23) */}
      <div className={cn('size-full bg-neutral-900 pl-3 transition-overlay', on ? !back && 'starting:translate-x-full' : 'translate-x-full')}>
        <DisasterPanel />
      </div>
    </div>
  )
}

/** 지도 오른쪽 — 넓게 그려 둔 지도 위에 겹쳐 그린다. back: 관리자에서 막 돌아옴 */
function RightOverlay({ back }: { back: boolean }) {
  return (
    <>
      <CctvSlider />
      <SidePanelSlider />
      <DisasterSlider back={back} />
    </>
  )
}

/** 메뉴 패널 자리 — 메뉴 내용은 메뉴별로 새로 만들 때 채운다 */
function SidePanelArea({ menu }: { menu: number }) {
  const slopeTab = slope.use((s) => (menu === MENU.slope ? s.tab : null))
  const width = sidePanelWidth(menu)
  if (slopeTab === 'alert') return <SlopeStats />
  if (slopeTab === 'measure') return <SlopeChart />
  if (!width) return null
  return (
    <div className="flex h-full shrink-0 flex-col items-center justify-center overflow-hidden rounded-[20px]" style={{ width }}>
      <PanelHeader className={cn('w-full shrink-0 rounded-t-2xl pt-[9px] pb-[4.5px]', menu === MENU.slope ? 'h-[54.539px]' : 'h-14')}>
        <h2 className="font-display text-[30px] leading-8 font-bold text-neutral-50 [-webkit-text-stroke:1px_var(--color-neutral-500)]">{MENUS[menu]}</h2>
      </PanelHeader>
      {menu === MENU.layer || menu === MENU.slope || menu === MENU.earthquake ? (
        <PanelBody className="min-h-0 flex-[1_0_0]" style={{ width }}>
          {menu === MENU.layer ? <LayerPanel /> : menu === MENU.slope ? <SlopeList /> : <EarthquakePanel />}
        </PanelBody>
      ) : (
        <PanelBody className="min-h-0 flex-[1_0_0]" style={{ width }}>
          <Preparing />
        </PanelBody>
      )}
    </div>
  )
}

/** 배수펌프장 — 화면 시안(Figma) 대기 */
const Preparing = () => <div className="flex size-full items-center justify-center text-b2 text-neutral-200">준비중</div>

/** 관리자 본문 — 서버 운영 탭은 왼쪽 서버실 랙 + 리스트 + 상세, 자산대장 탭은 AssetLedger. 나머지 탭은 디자인 값을 받는 대로 채운다. 머리는 AdminHeaderSlot */
function AdminBody() {
  const device = adminState.use((s) => s.device)
  const tab = adminState.use((s) => s.tab)
  if (tab === 'asset') return <AssetLedger />
  // 네트워크 탭은 아직 비워 둠 (사용자 10-23)
  if (tab === 'network') return <main aria-label="네트워크" className="mx-4 mb-2 flex-[1_0_0]" />
  return (
    <main className="mx-4 mb-2 flex min-h-0 flex-[1_0_0] gap-3 overflow-hidden">
      <AdminRack />
      <ServerList />
      {tab === 'etc' ? <EtcFlow /> : device === 1 ? <FirewallDetail /> : device === 2 ? <SwitchDetail /> : device === 3 ? <DatabaseDetail /> : device === 4 ? <SolutionDetail /> : device === 5 ? <DashboardDetail /> : device === 6 ? <IotDetail /> : device === 7 ? <GisDetail /> : device === 8 ? <CctvDetail /> : device === 9 ? <InnerDetail /> : device === 10 ? <InnerNetDetail /> : device === 11 ? <OuterNetDetail /> : device === 12 ? <OuterDetail /> : device === 13 ? <MessengerDetail /> : <ServerStatus />}
    </main>
  )
}

const Body = memo(function Body() {
  // 관리자 본문 — 머리 자리가 다 열린 뒤 바뀐다 (그동안 이전 본문은 짧아지다 흐려짐). 떠날 때는 관리자 본문이 사라진 뒤 (급경사지로 갈 때는 바로, state.ts)
  //   본문은 머리 내용과 같이 위에서 내려오며 나타나고, 떠날 때 같이 위로 사라진다 (사용자 10-23 '위에서 내려오기')
  const layout = dash.use((s) => s.layoutMenu)
  const admin = layout === MENU.admin
  const toAdmin = dash.use((s) => s.menu === MENU.admin)
  // 관리자에서 막 돌아온 동안만 나타나는 움직임 (처음 열 때는 없음)
  const back = usePrevious(layout, BODY_FADE_MS) === MENU.admin
  // 관리자에서 급경사지로 — 급경사지 머리 내용은 내려오고 본문(지도)은 아래에서 올라온다 (사용자 10-23)
  const rise = back && layout === MENU.slope
  return (
    <>
      {admin && (
        <div className={cn('flex min-h-0 flex-[1_0_0] flex-col', toAdmin ? 'animate-admin-body-in' : 'animate-slope-out')}>
          <AdminBody />
        </div>
      )}
      {/* 밀려 나간 CCTV·메뉴 패널은 본문 밖(오른쪽)에 있다 — 잘라 낸다. 관리자로 갈 때 흐려지고, 관리자에서 돌아오면 다시 나타남.
          관리자에 있는 동안 지도는 숨겨만 둔다 — 돌아올 때 새로 띄우면 버벅여서 (사용자 10-23). CCTV·메뉴 패널은 걷는다 (영상이 계속 돌지 않게) */}
      <main
        aria-hidden={admin || undefined}
        className={cn(
          'mx-4 mb-2 flex min-h-0 flex-[1_0_0] shrink-0 gap-3 overflow-hidden',
          // 숨길 때는 자리를 차지하지 않게 absolute (relative 와 같이 쓰면 relative 가 이겨서 관리자 본문이 반으로 잘렸다)
          admin ? 'pointer-events-none invisible absolute' : cn('relative', toAdmin ? 'animate-body-fade-out' : rise ? 'animate-body-rise' : back && 'animate-body-fade-in'),
        )}
      >
        <MapArea />
        {!admin && <RightOverlay back={back} />}
      </main>
    </>
  )
})

/** 관리자에서 돌아올 때 본문이 나타나는 시간 — tokens.css animate-body-fade-in 과 같게 */
const BODY_FADE_MS = 300

/** 급경사지 서브탭·요약 바 — 메뉴 버튼과 본문 사이 (본문은 그만큼 낮아진다).
 *  떠날 때는 내용이 사라지고 자리가 다 닫힐 때까지 남긴다. 관리자로 갈 때는 바로 걷는다 (두 머리 줄이 겹쳐 쌓이지 않게) */
function SlopeHeaderSlot() {
  const on = dash.use((s) => s.menu === MENU.slope)
  const admin = dash.use((s) => s.menu === MENU.admin)
  const swap = dash.use((s) => s.fromMenu === MENU.admin)
  const shown = useKept(on || null, SLOPE_OUT_MS)
  if (!shown || admin) return null
  return <SlopeHeader closing={!on} swap={swap} />
}

/** 관리자 서브탭·공지 줄 — 급경사지처럼 자리가 열리고 내용이 내려온다. 떠날 때는 내용이 사라지고 자리가 다 닫힐 때까지 남긴다 (사용자 10-23).
 *  급경사지로 갈 때는 바로 걷는다 (두 머리 줄이 겹쳐 쌓이지 않게). 다 닫히면 탭을 처음(서버 운영)으로 */
function AdminHeaderSlot() {
  const on = dash.use((s) => s.menu === MENU.admin)
  const slope = dash.use((s) => s.menu === MENU.slope)
  const swap = dash.use((s) => s.fromMenu === MENU.slope)
  const shown = useKept(on || null, SLOPE_OUT_MS)
  useEffect(() => {
    if (!shown) adminState.reset()
  }, [shown])
  if (!shown || slope) return null
  return <AdminHeader closing={!on} swap={swap} />
}

export function Dashboard() {
  // 레이어 색 바꾼 것 60초마다·페이지 떠날 때 저장
  useLayerColorSync()
  return (
    <div className="relative flex size-full flex-col bg-neutral-900 text-white">
      <CctvSync />
      <LayerSync />
      <SlopeSync />
      <EarthquakeSync />
      <DisasterSync />
      <EventSync />
      <Header />
      <MenuTabs />
      <SlopeHeaderSlot />
      <AdminHeaderSlot />
      <Body />
      <CctvModal />
      <RiverOverlay />
    </div>
  )
}
