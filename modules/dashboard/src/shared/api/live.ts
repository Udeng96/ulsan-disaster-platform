// 같이 쓰는 주기 갱신 값 — once 에 "보는 곳이 있으면 주기 갱신"을 더한 것.
//   화면 여러 곳이 같은 목록을 읽어도 요청은 한 줄. 갱신이 필요한 곳(use('poll'))이 하나라도 붙어 있으면
//   intervalMs 마다 다시 받고, 다 떨어지면 멈춘다. 탭이 안 보이면 건너뛰고 다시 보이면 바로 받는다.
//   받은 값이 전과 같으면 다시 그리지 않는다. 실패하면 지난 값을 둔다.
//   const areas = live(fetchAreas, [], { intervalMs: 60_000, label: 'slope-areas' })
//   areas.use()        처음 한 번만 (이미 있으면 안 받음)
//   areas.use('poll')  붙어 있는 동안 주기 갱신
//   areas.use('off')   받지 않고 받아 둔 값만
import { useSyncExternalStore } from 'react'

export type LiveMode = 'once' | 'poll' | 'off'

export interface Live<T> {
  use: (mode?: LiveMode) => T
  get: () => T
  /** 받아 둔 값을 버리고 타이머를 멈춘다 (테스트용) */
  reset: () => void
}

const pollingOff = () => import.meta.env.VITE_DISABLE_POLLING === 'true'

export function live<T>(load: (signal: AbortSignal) => Promise<T>, empty: T, { intervalMs, label = 'live' }: { intervalMs: number; label?: string }): Live<T> {
  let value: T = empty
  let json = ''
  let loaded = false
  let inflight: AbortController | null = null
  let pollers = 0
  let timer: ReturnType<typeof setInterval> | null = null
  const listeners = new Set<() => void>()

  const fetchNow = () => {
    if (inflight) return
    const ac = new AbortController()
    inflight = ac
    load(ac.signal)
      .then((v) => {
        loaded = true
        const next = JSON.stringify(v)
        if (next === json) return
        json = next
        value = v
        for (const l of listeners) l()
      })
      .catch((err) => {
        if (!ac.signal.aborted) console.warn(`[${label}] 불러오기 실패`, err)
      })
      .finally(() => {
        if (inflight === ac) inflight = null
      })
  }
  const tick = () => {
    if (!document.hidden) fetchNow()
  }
  const onVisible = () => {
    if (!document.hidden) fetchNow()
  }
  const startPolling = () => {
    pollers += 1
    if (pollers > 1) return
    // 갱신하는 곳이 새로 생기면 지난 값이 오래됐을 수 있어 바로 한 번
    fetchNow()
    if (pollingOff()) return
    timer = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', onVisible)
  }
  const stopPolling = () => {
    pollers -= 1
    if (pollers > 0 || timer === null) return
    clearInterval(timer)
    timer = null
    document.removeEventListener('visibilitychange', onVisible)
  }

  // use(mode) 마다 같은 함수를 써야 React 가 다시 구독하지 않는다
  const subscribers: Record<LiveMode, (l: () => void) => () => void> = {
    off: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    once: (l) => {
      listeners.add(l)
      if (!loaded) fetchNow()
      return () => listeners.delete(l)
    },
    poll: (l) => {
      listeners.add(l)
      startPolling()
      return () => {
        listeners.delete(l)
        stopPolling()
      }
    },
  }
  const snapshot = () => value

  return {
    use: (mode = 'once') => useSyncExternalStore(subscribers[mode], snapshot),
    get: snapshot,
    reset: () => {
      inflight?.abort()
      inflight = null
      if (timer !== null) clearInterval(timer)
      timer = null
      pollers = 0
      value = empty
      json = ''
      loaded = false
    },
  }
}
