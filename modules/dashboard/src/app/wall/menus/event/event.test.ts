import { afterEach, describe, expect, it, vi } from 'vitest'
import { dash } from '../../dashboard/state'
import type { Region as RegionItem } from '../layer/api'
import type { EventType as EventTypeItem, OwlEvent as EventListItem } from './api'
import { allKeys, eventTypeColor, regionLeaves, rowTime, searchParams, shortLocation, tokensOf, typeLeaves, typeTree, upsertEvent } from './logic'
import { clickRow, events, removeKey, search } from './state'

const regions: RegionItem[] = [
  { id: 1, code: 'a', name: '달동' },
  { id: 2, code: 'b', name: '가상시설0412' },
]
const types: EventTypeItem[] = [
  { id: 6, name: '긴급구조', code: '6', children: [{ id: 1, name: '화재', code: '601', groupCode: '6' }, { id: 2, name: '구조', code: '602', groupCode: '6' }] },
  { id: 9, name: '공지/안내', code: '9', children: [] },
]
const ev = (id: number, extra: Partial<EventListItem> = {}): EventListItem => ({
  id,
  msgId: `MSG${id}`,
  disasterTypeCode: '601',
  disasterTypeName: '화재',
  title: 't',
  occurDtm: '2026-10-19T10:00:00',
  sendDtm: '2026-10-19T10:00:00',
  endStatus: null,
  regionName: '가상시설0565 달동 1',
  addr: null,
  roadAddr: null,
  lat: 0,
  lng: 0,
  summary: null,
  ...extra,
})

describe('이벤트 검색 조건', () => {
  it('소분류가 없는 대분류는 leaf, 대분류·소분류 id 가 겹쳐도 키가 다르다', () => {
    expect(typeTree(types)[0].children!.map((n) => [n.id, n.children?.length])).toEqual([
      ['event:group:6', 2],
      ['event:group:9', undefined],
    ])
    expect(typeLeaves(types).map((l) => l.key)).toEqual(['event:6:1', 'event:6:2', 'event:group:9'])
  })

  it('토큰 — 다 고르면 전체 하나, 일부면 고른 것마다 ✕, 없으면 비움', () => {
    const leaves = regionLeaves(regions)
    expect(tokensOf(leaves, allKeys(leaves), '#지역 전체')).toEqual([{ label: '#지역 전체' }])
    expect(tokensOf(leaves, new Set(['region:2']), '#지역 전체')).toEqual([{ label: '#가상시설0412', key: 'region:2' }])
    expect(tokensOf(leaves, new Set(), '#지역 전체')).toEqual([])
  })

  it('조회 파라미터 — 통째로 고른 대분류는 typeIds, 일부는 subTypeIds, 지역 전체는 비움', () => {
    const all = allKeys(regionLeaves(regions))
    expect(searchParams(regions, types, all, new Set(['event:6:1', 'event:6:2', 'event:group:9']))).toEqual({ typeIds: [6, 9], subTypeIds: [], regionIds: [] })
    expect(searchParams(regions, types, new Set(['region:2']), new Set(['event:6:2']))).toEqual({ typeIds: [], subTypeIds: [2], regionIds: [2] })
  })

  it('표기 — 발생 일시·지역', () => {
    expect(rowTime('2026-10-19T06:46:33')).toBe('26-10-19 06:46:33')
    expect(shortLocation('가상시 가상구 가상동 1')).toBe('가상동 1')
    expect(shortLocation('남구')).toBe('남구')
  })

  it('실시간 이벤트는 맨 위로, 같은 이벤트는 바꿔 끼운다', () => {
    const list = [ev(1), ev(2)]
    expect(upsertEvent(list, ev(2, { title: '새' })).map((e) => [e.id, e.title])).toEqual([
      [2, '새'],
      [1, 't'],
    ])
  })

  it('실시간으로 100건을 넘으면 오래된 것(아래)부터 지운다', () => {
    const list = Array.from({ length: 100 }, (_, i) => ev(100 - i))
    const next = upsertEvent(list, ev(101))
    expect([next.length, next[0].id, next.at(-1)!.id]).toEqual([100, 101, 2])
  })

  it('비어 온 값 — 유형 색은 흰색, 시각은 빈칸', () => {
    expect([eventTypeColor(null), eventTypeColor('7xx'), rowTime(null)]).toEqual(['#FFFFFF', '#FFFFFF', ''])
  })
})

describe('이벤트 상태', () => {
  afterEach(() => {
    events.reset()
    dash.reset()
    vi.restoreAllMocks()
  })

  it('조건을 다 풀고 조회하면 알림만, 보내지 않는다', () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    events.set({ regions, types, regionChecked: new Set(), typeChecked: allKeys(typeLeaves(types)) })
    search()
    expect(fetch).not.toHaveBeenCalled()
    expect(events.get().toast?.message).toBe('지역 조건을 선택해주세요')
  })

  it('조회 — 고른 이벤트·신규 표시를 풀고, 조건대로 요청', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]'))
    dash.set({ activeEvent: ev(1) })
    events.set({ regions, types, regionChecked: new Set(['region:1']), typeChecked: allKeys(typeLeaves(types)), newKeys: new Set(['1']) })
    search()
    expect(String(fetch.mock.calls[0][0])).toBe('/owl/events?typeIds=6%2C9&regionIds=1&limit=100')
    expect([dash.get().activeEvent, events.get().newKeys.size]).toEqual([null, 0])
  })

  it('토큰 ✕ 는 그 항목만 해제', () => {
    events.set({ regionChecked: new Set(['region:1', 'region:2']) })
    removeKey('region', 'region:1')
    expect([...events.get().regionChecked]).toEqual(['region:2'])
  })

  it('줄 누름 — 고르면 신규 표시가 풀리고, 다시 누르면 해제', () => {
    const a = ev(1)
    events.set({ newKeys: new Set(['1']) })
    clickRow(a)
    expect([dash.get().activeEvent?.id, events.get().newKeys.has('1')]).toEqual([1, false])
    clickRow(a)
    expect(dash.get().activeEvent).toBeNull()
  })
})
