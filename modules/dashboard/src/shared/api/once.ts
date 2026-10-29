// 한 번 받아 두고 같이 쓰기 — 화면 여러 곳이 같은 목록을 읽어도 요청은 1번.
//   처음 쓰는 컴포넌트가 붙을 때 받는다. 실패하면 비어 있는 값으로 두고, 다음에 붙는 컴포넌트가 다시 받는다.
//   const layers = once(() => fetchLayers(), [])
//   const list = layers.use()
//   layers.reload()  다시 받기 (하루 한 번 등) — 받는 동안 지난 값을 두고, 같은 값이면 다시 그리지 않는다, 실패하면 지난 값 그대로
import { useSyncExternalStore } from 'react'

export interface Once<T> {
  use: () => T
  /** 받아 둔 값 (아직이면 처음 값) */
  get: () => T
  /** 다시 받기 — 같은 값이면 알리지 않고, 실패하면 지난 값 그대로 */
  reload: () => void
  /** 받아 둔 값을 버린다 (테스트용) */
  reset: () => void
}

export function once<T>(load: () => Promise<T>, empty: T, label = 'once'): Once<T> {
  let value: T = empty
  let loaded = false
  let inflight: Promise<void> | null = null
  const listeners = new Set<() => void>()

  const fetchNow = () => {
    inflight = load()
      .then((v) => {
        const same = loaded && JSON.stringify(v) === JSON.stringify(value)
        loaded = true
        if (same) return
        value = v
        for (const l of listeners) l()
      })
      .catch((err) => console.warn(`[${label}] 불러오기 실패`, err))
      .finally(() => {
        inflight = null
      })
  }
  const start = () => {
    if (loaded || inflight) return
    fetchNow()
  }
  const subscribe = (l: () => void) => {
    listeners.add(l)
    start()
    return () => listeners.delete(l)
  }
  return {
    use: () => useSyncExternalStore(subscribe, () => value),
    get: () => value,
    reload: () => {
      if (!inflight) fetchNow()
    },
    reset: () => {
      value = empty
      loaded = false
    },
  }
}
