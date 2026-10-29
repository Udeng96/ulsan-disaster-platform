// CCTV 마커 + 지도 위 영상 창 (지도 새로 만들기 6단계 1) — 옛 MapSection 의 CCTV 부분과 같은 동작.
//   마커: 메인·레이어(CCTV 체크)는 전체, 배수펌프장·급경사지·지진가속도는 그 메뉴 CCTV 만. 지도 오른쪽이 다 움직여 카메라가 출발할 때 붙이고, 메뉴를 바꾸면 바로 뗀다
//   영상 창: 마커를 누르면 열린다. 3개까지, 넘으면 안내. 메뉴를 바꾸거나 초기화하면 모두 닫는다
//   창은 하나씩이라 옛 화면과 같은 HTML (CctvPlayerPopup) — 닫히면 플레이어도 같이 정리된다 (6dc209a)
import { useEffect, useMemo } from 'react'
import { Toast } from '@/components/notifications/Toast'
import { CCTV_LAYER_CODE } from '@/features/menus/layer/cctvLayer'
import { CctvPlayerPopup } from '@/features/shared/map/CctvPlayerPopup'
import type { SelectedCctv } from '@/features/shared/map/CctvMarkersML'
import { createStore } from '@/shared/store'
import { useCctvVisibleIds } from '../../menus/layer/data'
import { cctv, dash, MAP_CANVAS_W, mapWidth, MENU } from '../../dashboard/state'
import { bottomCropOf } from '../camera'
import { mapState } from '../state'
import { CctvLayer } from './CctvLayer'

const MAX_PLAYERS = 3
const LIMIT_MESSAGE = `최대 ${MAX_PLAYERS}개까지 재생됩니다.
재생중인 플레이어를 종료해주세요.
초기화 버튼을 누르면 플레이어가 전부 종료됩니다.`

/** 전체 CCTV 를 보이는 메뉴 — 메인·레이어 */
const allMenu = (m: number) => m === MENU.none || m === MENU.layer
/** 그 메뉴 CCTV 만 보이는 메뉴 (재난 예·경보는 방송단말·전광판이 주라 CCTV 없음) */
const ofMenu = (m: number) => m === MENU.pump || m === MENU.slope || m === MENU.earthquake

const players = createStore<{
  open: readonly SelectedCctv[]
  /** 올리면 마커의 물방울(재생 중 표시)을 되돌린다 */
  deactivateSeq: number
  toast: string | null
}>({ open: [], deactivateSeq: 0, toast: null })

const closeAll = () => players.set((s) => ({ open: [], deactivateSeq: s.deactivateSeq + 1 }))

/** 마커·목록에서 고름 — 이미 열려 있으면 그대로, 3개를 넘으면 안내하고 방금 누른 마커도 되돌린다 */
const openPlayer = (c: SelectedCctv) =>
  players.set((s) => {
    if (s.open.some((p) => p.id === c.id)) return {}
    if (s.open.length >= MAX_PLAYERS) return { toast: LIMIT_MESSAGE, deactivateSeq: s.deactivateSeq + 1 }
    return { open: [...s.open, c] }
  })
/** 마커 쪽에서 닫음 (물방울은 마커가 이미 되돌림) */
const dropPlayer = (id: number) => players.set((s) => ({ open: s.open.filter((p) => p.id !== id) }))
/** 창의 닫기 */
const closePlayer = (id: number) => players.set((s) => ({ open: s.open.filter((p) => p.id !== id), deactivateSeq: s.deactivateSeq + 1 }))
const dismissToast = () => players.set({ toast: null })
const expand = (c: SelectedCctv) => dash.set({ modalCctv: { number: 0, name: c.name, cctvId: c.cctvId } })

export function CctvMarkers() {
  const map = mapState.use((s) => s.map)
  const menu = dash.use((s) => s.menu)
  const cctvMenu = dash.use((s) => s.cctvMenu)
  // 카메라가 이 메뉴로 출발했으면 (옛 useDeferredOn — 켤 때만 기다리고 끌 때는 바로)
  const moved = mapState.use((s) => s.cameraMenu === menu)
  const layerCctv = dash.use((s) => s.layerChecked[CCTV_LAYER_CODE] === true)
  const layoutMenu = dash.use((s) => s.layoutMenu)
  const cctvOpen = dash.use((s) => s.cctvOpen)
  const list = cctv.use((s) => s.list)
  const shown = cctv.use((s) => s.shown)
  const menuList = cctv.use((s) => s.ofMenu)
  const visibleIds = useCctvVisibleIds()
  const open = players.use((s) => s.open)
  const deactivateSeq = players.use((s) => s.deactivateSeq)
  const toast = players.use((s) => s.toast)
  // 재생 중인 것 — 마커가 물방울로 두고 묶지 않는다 (창이 바뀔 때만 새로)
  const activeIds = useMemo(() => new Set(open.map((c) => c.id)), [open])

  // 메뉴를 바꾸거나 초기화하면 영상 창을 모두 닫는다 (마커 세트가 바뀌므로)
  useEffect(() => {
    let { menu: m, resetSeq: r } = dash.get()
    closeAll()
    return dash.subscribe(() => {
      const s = dash.get()
      if (s.menu === m && s.resetSeq === r) return
      m = s.menu
      r = s.resetSeq
      closeAll()
    })
  }, [])

  if (!map) return null
  const inLayer = menu === MENU.layer
  const showAll = moved && allMenu(cctvMenu) && allMenu(menu) && (!inLayer || layerCctv)
  const showMenu = moved && ofMenu(cctvMenu) && ofMenu(menu)
  // 마커를 고를 때 '보이는 곳 가운데'로 — 가린 폭·높이의 절반만큼 당긴다
  const cameraOffset: [number, number] = [-((MAP_CANVAS_W - mapWidth(layoutMenu, cctvOpen)) / 2), -(bottomCropOf(menu) / 2)]
  const common = { map, cameraOffset, activeIds, selected: shown, onSelectCctv: openPlayer, deactivateSeq, onCloseCctv: dropPlayer }

  return (
    <>
      {showMenu && menuList.length > 0 && <CctvLayer {...common} items={menuList} />}
      {/* 레이어 메뉴는 행정동 체크가 자주 바뀐다 — 목록을 갈아끼우지 않고 보일 것만 거른다 */}
      {showAll && list.length > 0 && <CctvLayer {...common} items={list} visibleIds={inLayer ? visibleIds : undefined} />}
      {open.map((c) => (
        <CctvPlayerPopup key={c.id} map={map} cctv={c} onClose={() => closePlayer(c.id)} onExpand={() => expand(c)} />
      ))}
      <Toast message={toast} duration={3500} onDismiss={dismissToast} />
    </>
  )
}
