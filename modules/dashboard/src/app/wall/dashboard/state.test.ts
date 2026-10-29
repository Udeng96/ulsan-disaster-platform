// 메뉴 바꾸기 — 지도 오른쪽이 미끄러지는 동안만 sliding, CCTV 목록은 거의 다 움직인 뒤 바뀐다
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ADMIN_IN_MS, dash, DISASTER_MS, MENU, SATELLITE_WAIT_MS, selectMenu, SLIDE_MS, SLOPE_IN_MS, SLOPE_OUT_MS, toggleCctv } from './state'

describe('메뉴 바꾸기 움직임', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    dash.set({ menu: MENU.none, layoutMenu: MENU.none, cctvMenu: MENU.none, sliding: false, satellite: false, cctvOpen: true })
  })
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('메인 → 레이어: 움직이는 동안 sliding, CCTV 목록은 0.42초 뒤', () => {
    selectMenu(MENU.layer)
    expect(dash.get()).toMatchObject({ menu: MENU.layer, sliding: true, cctvMenu: MENU.none })
    vi.advanceTimersByTime(420)
    expect(dash.get().cctvMenu).toBe(MENU.layer)
    vi.advanceTimersByTime(SLIDE_MS - 420)
    expect(dash.get().sliding).toBe(false)
  })

  it('급경사지로 들어갈 때: 머리 줄 자리가 열린 뒤(0.55초) 지도 오른쪽이 움직이고, CCTV 목록은 1.6초 뒤', () => {
    selectMenu(MENU.slope)
    expect(dash.get()).toMatchObject({ menu: MENU.slope, layoutMenu: MENU.none, sliding: false })
    vi.advanceTimersByTime(SLOPE_IN_MS)
    expect(dash.get()).toMatchObject({ layoutMenu: MENU.slope, sliding: true, cctvMenu: MENU.none })
    vi.advanceTimersByTime(SLIDE_MS)
    expect(dash.get().sliding).toBe(false)
    vi.advanceTimersByTime(1600 - SLOPE_IN_MS - SLIDE_MS)
    expect(dash.get().cctvMenu).toBe(MENU.slope)
  })

  it('급경사지에서 나갈 때: 머리 줄이 닫힌 뒤(1초) 지도 오른쪽이 움직인다', () => {
    selectMenu(MENU.slope)
    vi.advanceTimersByTime(2000)
    selectMenu(MENU.layer)
    expect(dash.get()).toMatchObject({ menu: MENU.layer, layoutMenu: MENU.slope })
    vi.advanceTimersByTime(SLOPE_OUT_MS)
    expect(dash.get()).toMatchObject({ layoutMenu: MENU.layer, sliding: true })
  })

  it('급경사지로 들어가는 중에 다른 메뉴로 바꾸면 기다리던 배치는 버리고 새 메뉴로', () => {
    selectMenu(MENU.slope)
    vi.advanceTimersByTime(200)
    selectMenu(MENU.layer)
    vi.advanceTimersByTime(SLOPE_IN_MS)
    expect(dash.get().layoutMenu).toBe(MENU.none)
    vi.advanceTimersByTime(SLOPE_OUT_MS - SLOPE_IN_MS)
    expect(dash.get().layoutMenu).toBe(MENU.layer)
  })

  it('위성 지도: 들어갈 때는 움직임이 끝나고 0.5초 뒤, 나갈 때는 움직임이 끝나면 일반으로', () => {
    selectMenu(MENU.slope)
    vi.advanceTimersByTime(SLOPE_IN_MS + SLIDE_MS + SATELLITE_WAIT_MS - 1)
    expect(dash.get().satellite).toBe(false)
    vi.advanceTimersByTime(1)
    expect(dash.get().satellite).toBe(true)
    selectMenu(MENU.slope)
    vi.advanceTimersByTime(SLOPE_OUT_MS + SLIDE_MS - 1)
    expect(dash.get().satellite).toBe(true)
    vi.advanceTimersByTime(1)
    expect(dash.get().satellite).toBe(false)
  })

  it('급경사지↔관리자: 관리자로 갈 때는 지도가 숨은 뒤 일반, 관리자에서 오면 숨은 동안 바로 위성', () => {
    selectMenu(MENU.slope)
    vi.advanceTimersByTime(5000)
    selectMenu(MENU.admin)
    vi.advanceTimersByTime(ADMIN_IN_MS - 1)
    expect(dash.get().satellite).toBe(true)
    vi.advanceTimersByTime(1)
    expect(dash.get()).toMatchObject({ satellite: false, layoutMenu: MENU.admin })
    selectMenu(MENU.slope)
    expect(dash.get()).toMatchObject({ satellite: true, layoutMenu: MENU.admin })
    vi.advanceTimersByTime(ADMIN_IN_MS)
    expect(dash.get().layoutMenu).toBe(MENU.slope)
  })

  it('위성으로 바뀌기 전에 나가면 그대로 일반', () => {
    selectMenu(MENU.slope)
    vi.advanceTimersByTime(SLOPE_IN_MS + SLIDE_MS)
    selectMenu(MENU.slope)
    vi.advanceTimersByTime(5000)
    expect(dash.get().satellite).toBe(false)
  })

  it('재난 예·경보로 들어갈 때: 패널이 다 덮을 때(0.6초)까지 뒤 화면 배치·CCTV 그대로', () => {
    selectMenu(MENU.layer)
    vi.advanceTimersByTime(2000)
    selectMenu(MENU.disaster)
    expect(dash.get()).toMatchObject({ menu: MENU.disaster, layoutMenu: MENU.layer, cctvMenu: MENU.layer, sliding: false })
    vi.advanceTimersByTime(DISASTER_MS - 1)
    expect(dash.get().layoutMenu).toBe(MENU.layer)
    vi.advanceTimersByTime(1)
    expect(dash.get()).toMatchObject({ layoutMenu: MENU.disaster, cctvMenu: MENU.layer })
  })

  it('재난 예·경보에서 나갈 때: 뒤 화면은 바로 새 메뉴로 (패널이 빠지며 드러남)', () => {
    selectMenu(MENU.disaster)
    vi.advanceTimersByTime(2000)
    selectMenu(MENU.layer)
    expect(dash.get()).toMatchObject({ menu: MENU.layer, layoutMenu: MENU.layer, cctvMenu: MENU.layer, sliding: false })
  })

  it('관리자: 머리 줄 자리가 열린 뒤 본문이 바뀌고, 나갈 때는 관리자 본문이 사라진 뒤 바뀐다', () => {
    selectMenu(MENU.layer)
    selectMenu(MENU.admin)
    expect(dash.get()).toMatchObject({ menu: MENU.admin, layoutMenu: MENU.layer, sliding: false })
    vi.advanceTimersByTime(ADMIN_IN_MS)
    expect(dash.get()).toMatchObject({ layoutMenu: MENU.admin, cctvMenu: MENU.admin, sliding: false })
    selectMenu(MENU.layer)
    expect(dash.get()).toMatchObject({ menu: MENU.layer, layoutMenu: MENU.admin })
    vi.advanceTimersByTime(ADMIN_IN_MS)
    expect(dash.get()).toMatchObject({ layoutMenu: MENU.layer, cctvMenu: MENU.layer, sliding: false })
  })

  it('CCTV 접기는 메뉴가 그대로라 CCTV 목록을 건드리지 않는다', () => {
    toggleCctv()
    expect(dash.get()).toMatchObject({ cctvOpen: false, sliding: true, cctvMenu: MENU.none })
  })
})
