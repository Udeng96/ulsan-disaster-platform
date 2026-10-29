// 불러오기 + 주기 갱신 — 메뉴마다 복사하던 코드를 하나로.
//   - 탭이 안 보이면 멈추고, 다시 보이면 바로 한 번 불러온 뒤 주기 재개
//   - 앞 요청이 끝나기 전에는 다음 요청을 보내지 않는다
//   - 받은 값이 전과 같으면 상태를 바꾸지 않는다 (다시 그리지 않음)
//   - 실패해도 직전 데이터는 남기고 error 만 채운다
//   - VITE_DISABLE_POLLING=true 면 처음 한 번만 부른다 (개발용)
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface PollingState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  /** 지금 바로 다시 불러오기 */
  refresh: () => void
}

interface Options {
  /** 주기 ms. 0 이면 처음 한 번만. */
  intervalMs?: number
  /** false 면 부르지 않는다 (메뉴가 닫혀 있을 때 등). */
  enabled?: boolean
}

const pollingOff = () => import.meta.env.VITE_DISABLE_POLLING === 'true'

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

export function usePolling<T>(fetcher: (signal: AbortSignal) => Promise<T>, { intervalMs = 0, enabled = true }: Options = {}): PollingState<T> {
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({ loading: enabled })
  // 비교는 setState 밖에서 한다 — 같은 값을 돌려주는 updater 도 React 가 한 번 더 그릴 수 있어서.
  const stateRef = useRef(state)
  const fetcherRef = useRef(fetcher)
  useLayoutEffect(() => {
    stateRef.current = state
    fetcherRef.current = fetcher
  })
  const runRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!enabled) return
    let alive = true
    let inFlight: AbortController | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = null
      if (!alive || !intervalMs || pollingOff() || document.hidden) return
      timer = setTimeout(run, intervalMs)
    }

    async function run() {
      if (!alive || inFlight) return
      const ac = new AbortController()
      inFlight = ac
      try {
        const data = await fetcherRef.current(ac.signal)
        if (!alive) return
        const s = stateRef.current
        if (same(s.data, data) && !s.error && !s.loading) return
        setState((p) => ({ data: same(p.data, data) ? p.data : data, loading: false }))
      } catch (e) {
        if (!alive || ac.signal.aborted) return
        const error = e instanceof Error ? e : new Error(String(e))
        const s = stateRef.current
        if (s.error?.message === error.message && !s.loading) return
        setState((p) => ({ data: p.data, error, loading: false }))
      } finally {
        if (inFlight === ac) inFlight = null
        schedule()
      }
    }
    runRef.current = () => void run()

    const onVisible = () => {
      if (document.hidden) {
        if (timer) clearTimeout(timer)
        timer = null
      } else {
        void run()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    void run()
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisible)
      if (timer) clearTimeout(timer)
      inFlight?.abort()
    }
  }, [enabled, intervalMs])

  const refresh = useCallback(() => runRef.current(), [])
  return { data: state.data, error: state.error, loading: state.loading, refresh }
}
