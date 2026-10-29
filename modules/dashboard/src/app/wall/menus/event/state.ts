// 이벤트(부엉이) 상태 — 검색 조건·목록·실시간 신규 표시. 패널은 닫혀 있어도 목록·실시간 수신은 계속된다(옛 화면과 같음).
//   고른 이벤트(지도 마커·CCTV)는 대시보드 저장소의 activeEvent.
import { useEffect } from 'react'
import { createStore } from '@/shared/store'
import { activateEvent, dash } from '../../dashboard/state'
import { fetchRegions, type Region } from '../layer/api'
import { EVENT_LIMIT, fetchEventTypes, searchEvents, type EventSearchParams, type EventType, type OwlEvent } from './api'
import { allKeys, eventKey, regionLeaves, searchParams, typeLeaves, upsertEvent } from './logic'
import { useEventStream } from './stream'

export type FilterRow = 'region' | 'type'

export interface EventState {
  regions: Region[]
  types: EventType[]
  regionChecked: ReadonlySet<string>
  typeChecked: ReadonlySet<string>
  /** 열린 고르기 칸 (한 번에 하나) */
  openRow: FilterRow | null
  list: OwlEvent[]
  /** 마지막 조회 시각 */
  lastUpdated: Date
  /** 실시간으로 새로 온 이벤트 — 누르기 전까지 빨간 테두리 */
  newKeys: ReadonlySet<string>
  toast: { message: string; seq: number } | null
}

export const events = createStore<EventState>({
  regions: [],
  types: [],
  regionChecked: new Set(),
  typeChecked: new Set(),
  openRow: null,
  list: [],
  lastUpdated: new Date(),
  newKeys: new Set(),
  toast: null,
})

export const setChecked = (row: FilterRow, next: ReadonlySet<string>) => events.set(row === 'region' ? { regionChecked: next } : { typeChecked: next })
export const setOpenRow = (row: FilterRow | null) => events.set({ openRow: row })
/** 토큰 ✕ — 그 항목만 해제 */
export function removeKey(row: FilterRow, key: string) {
  const cur = row === 'region' ? events.get().regionChecked : events.get().typeChecked
  const next = new Set(cur)
  next.delete(key)
  setChecked(row, next)
}

function showToast(message: string) {
  events.set((s) => ({ toast: { message, seq: (s.toast?.seq ?? 0) + 1 } }))
}

const ALL: EventSearchParams = { typeIds: [], subTypeIds: [], regionIds: [] }
/** 마지막으로 조회한 조건 — 실시간 연결이 다시 붙으면 같은 조건으로 다시 받는다 */
let lastParams = ALL

// 최신 100건 (수정사항 7번 — 서버가 최신순으로 잘라 준다)
async function load(params: EventSearchParams) {
  lastParams = params
  try {
    const rows = await searchEvents(params)
    // 응답을 기다리는 동안 실시간으로 온 것은 남긴다 (첫 조회보다 먼저 온 신규가 지워지지 않게)
    const got = new Set(rows.map(eventKey))
    events.set((s) => ({ list: [...s.list.filter((e) => s.newKeys.has(eventKey(e)) && !got.has(eventKey(e))), ...rows].slice(0, EVENT_LIMIT) }))
  } catch (err) {
    console.warn('[event] 조회 실패', err)
    events.set({ list: [] })
  }
}

/** 실시간 연결이 끊겼다 다시 붙음 — 끊긴 동안 온 것을 채운다. 신규 표시·고른 이벤트는 그대로 (사용자 10-22) */
const reload = () => {
  events.set({ lastUpdated: new Date() })
  void load(lastParams)
}

/** 조회 — 고른 이벤트·신규 표시를 풀고 다시 받는다. 조건을 하나도 안 골랐으면 알림만 */
export function search() {
  const s = events.get()
  // 옵션을 못 받은 쪽(그 서비스가 죽음)은 건너뛴다 — 고를 게 없는데 막으면 아무것도 못 본다
  if (s.regions.length && !s.regionChecked.size) return showToast('지역 조건을 선택해주세요')
  if (s.types.length && !s.typeChecked.size) return showToast('이벤트 유형을 선택해주세요')
  activateEvent(null)
  events.set({ lastUpdated: new Date(), newKeys: new Set() })
  void load(searchParams(s.regions, s.types, s.regionChecked, s.typeChecked))
}

/** 줄 누름 — 같은 줄이면 해제, 아니면 그 이벤트로 (신규 표시도 풀림) */
export function clickRow(e: OwlEvent) {
  const key = eventKey(e)
  const active = dash.get().activeEvent
  if (active && eventKey(active) === key) return activateEvent(null)
  events.set((s) => {
    if (!s.newKeys.has(key)) return {}
    const newKeys = new Set(s.newKeys)
    newKeys.delete(key)
    return { newKeys }
  })
  activateEvent(e)
}

function onStream(e: OwlEvent) {
  events.set((s) => ({ list: upsertEvent(s.list, e), newKeys: new Set(s.newKeys).add(eventKey(e)) }))
}

/** 조건 옵션·첫 조회·실시간 수신. 대시보드에 한 번 둔다 */
export function EventSync() {
  useEffect(() => {
    let alive = true
    // 지역(gis)과 이벤트 종류(부엉이)는 다른 서비스 — 한쪽이 죽어도 나머지는 살린다
    Promise.all([
      fetchRegions().catch((err) => (console.warn('[event] 행정동 조회 실패', err), [] as Region[])),
      fetchEventTypes().catch((err) => (console.warn('[event] 이벤트 종류 조회 실패', err), [] as EventType[])),
    ]).then(([regions, types]) => {
      if (alive) events.set({ regions, types, regionChecked: allKeys(regionLeaves(regions)), typeChecked: allKeys(typeLeaves(types)) })
    })
    void load(ALL)
    return () => {
      alive = false
    }
  }, [])
  useEventStream(onStream, reload)
  return null
}
