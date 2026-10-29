// CCTV 고르기 — 목록을 한 번 받고(매일 00:30 다시), 메뉴·지점·레이어 행정동이 바뀌거나 30초가 지나면 5칸을 다시 정한다.
//   결과만 대시보드 저장소(cctv)에 넣어 지도·CCTV 칸이 나눠 쓴다 (순환이 대시보드를 다시 그리지 않게).
import { useEffect, useMemo, useState } from 'react'
import { cctv, dash, MENU } from '../../dashboard/state'
import { slope } from '../slope/state'
import { cctvList, msToReload, toFacilityItems } from './api'
import { candidates, cellsOf, CELLS, ofMenu, rotate, ROTATION_MS } from './logic'

export function CctvSync() {
  const raw = cctvList.use()
  // 매일 00:30 에 목록 다시 받기 — 켜 둔 채로 며칠 가는 상황판이라
  useEffect(() => {
    let id = 0
    const plan = () => {
      id = window.setTimeout(() => {
        cctvList.reload()
        plan()
      }, msToReload(new Date()))
    }
    plan()
    return () => clearTimeout(id)
  }, [])
  const all = useMemo(() => toFacilityItems(raw), [raw])

  // 메뉴가 미끄러지며 바뀌면 CCTV 는 거의 다 움직인 뒤 바뀐다
  const menu = dash.use((s) => s.cctvMenu)
  const ev = dash.use((s) => s.activeEvent)
  const search = dash.use((s) => s.searchTarget)
  const net = dash.use((s) => s.netTarget)
  const regions = dash.use((s) => s.cctvRegions)
  // 지점 — 이벤트 > 주소 검색 > 투망
  const target = useMemo(() => (ev?.lat != null && ev.lng != null ? { lat: ev.lat, lng: ev.lng } : (search ?? net)), [ev, search, net])
  const list = useMemo(() => candidates(raw, all, menu, target, regions), [raw, all, menu, target, regions])

  // 순환 — 메뉴·지점이 바뀌면 처음 5개부터. CCTV 칸이 없는 곳(재난 예·경보, 급경사지 총괄·관제 밖 탭)은 돌리지 않고,
  //   그 탭에 들어갈 때는 지금 5개 그대로 멈추고, 급경사지 총괄·관제로 돌아오면 처음 5개부터 다시
  const slopeOther = slope.use((s) => menu === MENU.slope && s.tab !== 'overview')
  const [block, setBlock] = useState({ key: { menu, target, slopeOther }, n: 0 })
  const same = block.key.menu === menu && block.key.target === target && !(block.key.slopeOther && !slopeOther)
  const n = same ? block.n : 0
  if (!same || n !== block.n || block.key.slopeOther !== slopeOther) setBlock({ key: { menu, target, slopeOther }, n })
  const rotating = list.length > CELLS && menu !== MENU.disaster && !slopeOther
  useEffect(() => {
    if (!rotating) return
    const id = setInterval(() => setBlock((b) => ({ ...b, n: b.n + 1 })), ROTATION_MS)
    return () => clearInterval(id)
  }, [rotating])

  const shown = useMemo(() => rotate(list, n), [list, n])
  const menuList = useMemo(() => ofMenu(raw, menu), [raw, menu])
  useEffect(() => {
    cctv.set({ list: all, cells: cellsOf(shown), hasCctv: shown.length > 0, shown, ofMenu: menuList })
  }, [all, shown, menuList])
  return null
}
