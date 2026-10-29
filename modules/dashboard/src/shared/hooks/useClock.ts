// 시계 — 앱 전체에서 타이머 하나를 같이 쓴다. 이 훅을 부른 컴포넌트만 다시 그려진다.
//   옛 LeftPanel 처럼 큰 컴포넌트에서 쓰지 말고, 시각을 찍는 작은 칸에서만 쓴다.
//   매 초 경계(…:00.000)에 맞춰 바뀌므로 화면의 초가 실제 시각과 어긋나지 않는다.
import { useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
const floorSec = (t: number) => t - (t % 1000)
let now = floorSec(Date.now())
let timer: ReturnType<typeof setTimeout> | null = null

function tick() {
  const t = Date.now()
  now = floorSec(t)
  for (const l of listeners) l()
  timer = setTimeout(tick, 1000 - (t % 1000))
}

function subscribe(l: () => void) {
  listeners.add(l)
  if (!timer) {
    const t = Date.now()
    now = floorSec(t)
    timer = setTimeout(tick, 1000 - (t % 1000))
  }
  return () => {
    listeners.delete(l)
    if (!listeners.size && timer) {
      clearTimeout(timer)
      timer = null
    }
  }
}

// 구독 전(타이머 없음)에도 지금 초를 돌려줘야 첫 화면이 맞고, 구독 직후 쓸데없이 한 번 더 그리지 않는다.
const getSnapshot = () => {
  if (!timer) now = floorSec(Date.now())
  return now
}

/** 현재 시각(ms, 초 단위로 내림). 1초마다 바뀐다. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot)
}
