// 작은 상태 저장소 — 화면 여러 곳이 같이 쓰는 값을 한 곳에 두고, 쓰는 컴포넌트는 고른 값이 바뀔 때만 다시 그린다.
//   const store = createStore({ menu: -1 })
//   const menu = store.use((s) => s.menu)   // menu 가 바뀔 때만 다시 그림
//   store.set({ menu: 2 })  /  store.set((s) => ({ menu: s.menu === 2 ? -1 : 2 }))
import { useSyncExternalStore } from 'react'

export interface Store<S extends object> {
  get: () => S
  set: (patch: Partial<S> | ((s: S) => Partial<S>)) => void
  subscribe: (l: () => void) => () => void
  use: <T>(select: (s: S) => T) => T
  /** 처음 값으로 되돌린다 (테스트·화면 초기화용) */
  reset: () => void
}

export function createStore<S extends object>(init: S): Store<S> {
  let state = init
  const listeners = new Set<() => void>()
  const store: Store<S> = {
    get: () => state,
    set: (patch) => {
      const p = typeof patch === 'function' ? patch(state) : patch
      if (Object.keys(p).every((k) => Object.is(p[k as keyof S], state[k as keyof S]))) return
      state = { ...state, ...p }
      for (const l of listeners) l()
    },
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    // 고른 값은 Object.is 로 비교 — 객체를 새로 만들어 돌려주는 selector 는 쓰지 말 것 (매번 다시 그림)
    use: (select) => useSyncExternalStore(store.subscribe, () => select(state)),
    reset: () => store.set(init),
  }
  return store
}
