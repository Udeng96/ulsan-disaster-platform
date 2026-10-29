import { act, render, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNow, usePolling, useSse } from '.'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('useNow', () => {
  it('초 경계마다 바뀌고 부른 컴포넌트만 다시 그린다', () => {
    vi.useFakeTimers({ now: new Date('2026-10-16T15:00:00.400+09:00') })
    let clockRenders = 0
    let parentRenders = 0
    function Clock() {
      clockRenders++
      return <span>{useNow()}</span>
    }
    function Parent() {
      parentRenders++
      return <Clock />
    }
    render(<Parent />)
    act(() => vi.advanceTimersByTime(600)) // 15:00:01.000
    act(() => vi.advanceTimersByTime(1000))
    expect(clockRenders).toBe(3)
    expect(parentRenders).toBe(1)
  })
})

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubEnv('VITE_DISABLE_POLLING', 'false') // .env.local 의 개발용 끄기 무시
  })

  it('주기마다 부르고, 같은 값이면 다시 그리지 않는다', async () => {
    const fetcher = vi.fn().mockResolvedValue([1, 2])
    let renders = 0
    const { result } = renderHook(() => {
      renders++
      return usePolling(fetcher, { intervalMs: 1000 })
    })
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(result.current.data).toEqual([1, 2])
    const after = renders
    await act(() => vi.advanceTimersByTimeAsync(3000))
    expect(fetcher).toHaveBeenCalledTimes(4)
    expect(renders).toBe(after)
  })

  it('실패해도 직전 데이터는 남는다', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce('ok').mockRejectedValueOnce(new Error('502'))
    const { result } = renderHook(() => usePolling(fetcher, { intervalMs: 1000 }))
    await act(() => vi.advanceTimersByTimeAsync(0))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.data).toBe('ok')
    expect(result.current.error?.message).toBe('502')
  })

  it('앞 요청이 안 끝났으면 겹쳐 부르지 않는다', async () => {
    let resolve!: (v: number) => void
    const fetcher = vi.fn(() => new Promise<number>((r) => (resolve = r)))
    const { result } = renderHook(() => usePolling(fetcher, { intervalMs: 100 }))
    act(() => result.current.refresh())
    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(fetcher).toHaveBeenCalledTimes(1)
    await act(async () => resolve(1))
    expect(result.current.data).toBe(1)
  })

  it('탭이 안 보이면 멈추고 다시 보이면 바로 부른다', async () => {
    const fetcher = vi.fn().mockResolvedValue(1)
    renderHook(() => usePolling(fetcher, { intervalMs: 1000 }))
    await act(() => vi.advanceTimersByTimeAsync(0))
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(fetcher).toHaveBeenCalledTimes(1)
    hidden.mockReturnValue(false)
    await act(async () => void document.dispatchEvent(new Event('visibilitychange')))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('enabled=false 면 부르지 않는다', async () => {
    const fetcher = vi.fn().mockResolvedValue(1)
    renderHook(() => usePolling(fetcher, { intervalMs: 1000, enabled: false }))
    await act(() => vi.advanceTimersByTimeAsync(3000))
    expect(fetcher).not.toHaveBeenCalled()
  })
})

// ── 가짜 EventSource ──
class FakeES {
  static all: FakeES[] = []
  static CLOSED = 2
  readyState = 0
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  handlers = new Map<string, ((e: MessageEvent) => void)[]>()
  closed = false
  url: string
  constructor(url: string) {
    this.url = url
    FakeES.all.push(this)
  }
  addEventListener(n: string, h: (e: MessageEvent) => void) {
    this.handlers.set(n, [...(this.handlers.get(n) ?? []), h])
  }
  emit(n: string, data: string) {
    for (const h of this.handlers.get(n) ?? []) h(new MessageEvent(n, { data }))
  }
  close() {
    this.closed = true
  }
}

describe('useSse', () => {
  beforeEach(() => {
    FakeES.all = []
    vi.stubGlobal('EventSource', FakeES)
    vi.useFakeTimers()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('같은 주소는 연결 하나, JSON 으로 풀어 넘김, 마지막 구독이 끝나면 닫음', () => {
    const a = vi.fn()
    const b = vi.fn()
    const h1 = renderHook(() => useSse('/s', ['x'], a))
    const h2 = renderHook(() => useSse('/s', ['x'], b))
    expect(FakeES.all).toHaveLength(1)
    const es = FakeES.all[0]
    act(() => es.onopen?.())
    expect(h1.result.current.connected).toBe(true)
    act(() => es.emit('x', '{"v":1}'))
    expect(a).toHaveBeenCalledWith('x', { v: 1 })
    expect(b).toHaveBeenCalledWith('x', { v: 1 })
    h1.unmount()
    expect(es.closed).toBe(false)
    h2.unmount()
    expect(es.closed).toBe(true)
  })

  it('조용하면(watchdog) 다시 연결', () => {
    const h = renderHook(() => useSse('/w', ['x'], () => {}, 1000))
    act(() => FakeES.all[0].onopen?.())
    act(() => vi.advanceTimersByTime(1001))
    expect(FakeES.all).toHaveLength(2)
    expect(FakeES.all[0].closed).toBe(true)
    h.unmount()
  })
})
