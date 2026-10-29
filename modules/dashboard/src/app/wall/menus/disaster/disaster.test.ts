import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FacilityListItem } from '@/api/facility'
import { expandableIds, hostNames, idsOf, previewCells, signItems, voiceTree } from './logic'
import { cancelDispatch, canSend, disaster, dispatch, lists, selectMode, setInput, toggleFacility, toggleSign, verified } from './state'

const fac = (id: number, name: string, extra: Partial<FacilityListItem> = {}): FacilityListItem => ({ id, name, type: 'BROADCAST', region: '', lat: 0, lng: 0, ...extra })

describe('전파 대상 트리', () => {
  const list = [fac(1, '나동', { region: '달동', groupType: '경로당' }), fac(2, '가동', { region: '달동' }), fac(3, '다동', { region: '' })]
  const tree = voiceTree(list)
  it('행정동별·유형별 두 갈래, 빈 값은 미지정·기타, 가나다순', () => {
    expect(tree.map((n) => n.label)).toEqual(['행정동별', '유형별'])
    expect(tree[0].children!.map((n) => n.label)).toEqual(['달동', '미지정'])
    expect(tree[0].children![0].children!.map((n) => n.label)).toEqual(['가동', '나동'])
    expect(tree[1].children!.map((n) => n.label)).toEqual(['경로당', '기타'])
  })
  it('같은 장비는 두 갈래 모두 같은 leaf id', () => {
    expect(tree[1].children![0].children![0].id).toBe('fac-1')
    expect(tree[0].children![0].children![1].id).toBe('fac-1')
  })
  it('펼칠 수 있는 노드 = 갈래 + 그룹', () => {
    expect(expandableIds(tree)).toEqual(['branch-region', 'vregion-달동', 'vregion-미지정', 'branch-type', 'type-경로당', 'type-기타'])
  })
})

describe('전광판', () => {
  const boards = [fac(5, '삼호', { host: 'h5' }), fac(2, '삼호', { host: 'h2' }), fac(3, '가로', { host: 'h3' })]
  it('같은 이름은 가장 작은 id 하나만, 가나다순', () => {
    expect(signItems(boards)).toEqual([
      { id: 'sign-3', label: '가로' },
      { id: 'sign-2', label: '삼호' },
    ])
  })
  it('CCTV 칸은 고른 순서대로 6칸', () => {
    const cells = previewCells(new Set(['sign-2', 'sign-3']), boards, { 3: 'C3' })
    expect(cells).toHaveLength(6)
    expect(cells.slice(0, 3)).toEqual([{ label: '삼호', cctvId: undefined }, { label: '가로', cctvId: 'C3' }, null])
  })
  it('표출 중 host 는 이름으로, 모르는 건 그대로', () => {
    expect(hostNames(['h3', 'x'], boards)).toEqual(['가로', 'x'])
  })
  it('체크 집합에서 시설 id', () => {
    expect(idsOf(new Set(['sign-2', 'fac-9', 'sign-3']), 'sign')).toEqual([2, 3])
  })
})

describe('재난 예·경보 상태', () => {
  afterEach(() => {
    disaster.reset()
    lists.reset()
    vi.restoreAllMocks()
  })

  it('모드를 바꾸면 대상·입력·권한을 비운다', () => {
    toggleFacility('voice', 1)
    setInput({ title: '제목', content: '내용' })
    verified('확인')
    selectMode('sign')
    const s = disaster.get()
    expect([s.mode, s.voiceChecked.size, s.title, s.content, s.verified]).toEqual(['sign', 0, '', '', false])
  })

  it('권한 확인 뒤엔 대상·입력을 바꿀 수 없고, 취소하면 풀린다', () => {
    selectMode('sign')
    toggleSign({ id: 'sign-1', label: 'a' })
    setInput({ content: '알림' })
    verified('확인')
    toggleFacility('sign', 2)
    setInput({ content: '바꿈' })
    expect([...disaster.get().signChecked]).toEqual(['sign-1'])
    expect(disaster.get().content).toBe('알림')
    cancelDispatch()
    expect([disaster.get().verified, disaster.get().signChecked.size, disaster.get().content]).toEqual([false, 0, ''])
  })

  it('음성 내용은 1000자까지, 전광판은 제한 없음', () => {
    setInput({ content: 'a'.repeat(1200) })
    expect(disaster.get().content).toHaveLength(1000)
    selectMode('sign')
    setInput({ content: 'a'.repeat(1200) })
    expect(disaster.get().content).toHaveLength(1200)
  })

  it('음성 송출 성공 — 결과 남기고 처음으로, 실패면 그대로', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: 'SUCCESS' })))
    toggleFacility('voice', 1)
    toggleFacility('voice', 2)
    setInput({ title: 't', content: 'c' })
    verified('확인')
    await dispatch()
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ title: 't', content: 'c', alertSound: '0', terminalIds: [1, 2] })
    expect(disaster.get().result).toEqual({ kind: 'count', success: 2, total: 2 })
    expect([disaster.get().verified, disaster.get().voiceChecked.size, disaster.get().toast?.tone]).toEqual([false, 0, 'success'])

    fetch.mockResolvedValue(new Response(JSON.stringify({ status: 'FAILED' })))
    toggleFacility('voice', 1)
    setInput({ title: 't', content: 'c' })
    verified('확인')
    await dispatch()
    expect([disaster.get().verified, disaster.get().voiceChecked.size, disaster.get().toast?.message]).toEqual([true, 1, '송출에 실패했습니다.'])
  })

  it('재난 알림음 — 입력을 비우고 받지 않으며, 대상만 있으면 "오"로 송출', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: 'SUCCESS' })))
    setInput({ title: 't', content: 'c' })
    setInput({ alertSound: '1' })
    setInput({ title: '다시', content: '입력' })
    expect([disaster.get().title, disaster.get().content]).toEqual(['', ''])
    expect(canSend(disaster.get())).toBe(false)
    toggleFacility('voice', 3)
    expect(canSend(disaster.get())).toBe(true)
    verified('확인')
    await dispatch()
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ title: '사이렌', content: '오', alertSound: '1', terminalIds: [3] })
    setInput({ alertSound: '0' })
    setInput({ content: '다시 입력' })
    expect(disaster.get().content).toBe('다시 입력')
  })

  it('전광판 송출 — host 를 보내고, 응답의 표출 중 목록을 남긴다', async () => {
    lists.set({ signboard: [fac(1, 'a', { host: 'h1' }), fac(2, 'b')] })
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: 'SUCCESS', message: ['h1 : 7', 'h9 : 8', 'h1 : 9'] })))
    selectMode('sign')
    toggleFacility('sign', 1)
    toggleFacility('sign', 2)
    setInput({ content: '알림' })
    await dispatch()
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ msgCn: '알림', targetHosts: ['h1'] })
    expect(disaster.get().result).toEqual({ kind: 'hosts', hosts: ['h1', 'h9'] })
  })

  it('고른 전광판에 host 가 하나도 없으면 보내지 않는다', async () => {
    lists.set({ signboard: [fac(2, 'b')] })
    const fetch = vi.spyOn(globalThis, 'fetch')
    selectMode('sign')
    toggleFacility('sign', 2)
    setInput({ content: '알림' })
    await dispatch()
    expect(fetch).not.toHaveBeenCalled()
    expect(disaster.get().toast?.message).toBe('선택한 전광판에 송출 도메인이 없습니다.')
  })
})
