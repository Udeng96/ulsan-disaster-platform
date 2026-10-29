// 급경사지 기준 데이터 — GET /slope/api/areas.
//   지역 3곳 + 계측기 48 (좌표·이름·현재값). 앱에서 처음 한 번 받아 모듈 캐시에 둔다.
//
// 갱신은 보고 있는 화면에 따라 갈린다:
//   계측 상세  → 여기서 1분 폴링 (poll: true). 값이 계속 바뀌어야 한다.
//   그 외      → 폴링 없음. 요약 바는 가벼운 /areas/summary 로 값만 받는다.
//
// 업체 측정 주기가 1분이라 그보다 자주 부를 이유가 없다.

import { useEffect, useState } from 'react'
import { fetchAreas, type SlopeArea } from '@/api/slope'

const POLL_MS = 60_000

let cached: readonly SlopeArea[] = []
let loaded = false
let inflight: Promise<void> | null = null
const subscribers = new Set<(a: readonly SlopeArea[]) => void>()
let timer: ReturnType<typeof setInterval> | null = null
/** 폴링을 요구하는 구독자 수 — 0 이 되면 멈춘다. */
let pollers = 0

function load(): Promise<void> {
  if (inflight) return inflight
  inflight = fetchAreas()
    .then((items) => {
      cached = items
      loaded = true
      for (const fn of subscribers) fn(cached)
    })
    .catch((err) => console.warn('[slope-areas] fetch 실패', err))
    .finally(() => {
      inflight = null
    })
  return inflight
}

/**
 * @param poll true 면 1분 주기로 갱신 (계측 상세). 기본은 최초 1회만.
 */
export function useSlopeAreas(poll = false): readonly SlopeArea[] {
  const [areas, setAreas] = useState<readonly SlopeArea[]>(cached)
  useEffect(() => {
    subscribers.add(setAreas)
    if (!loaded) void load()
    else setAreas(cached)
    return () => {
      subscribers.delete(setAreas)
    }
  }, [])

  useEffect(() => {
    if (!poll) return
    pollers += 1
    if (timer === null) timer = setInterval(() => void load(), POLL_MS)
    return () => {
      pollers -= 1
      if (pollers === 0 && timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }
  }, [poll])

  return areas
}
