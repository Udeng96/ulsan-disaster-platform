// 지진계측기 목록 hook — /earthquake/api/instruments 1회 fetch + 모듈 캐시.
//   메뉴를 여닫을 때마다 재요청하지 않도록 (usePumpStations 패턴).
//   조회 실패/응답 전에는 빈 배열 — 호출처가 기존 상수로 폴백한다.

import { useEffect, useState } from 'react'
import {
  fetchEarthquakeInstruments,
  type EarthquakeInstrument,
} from '@/api/earthquake'

let cached: readonly EarthquakeInstrument[] | null = null
let inflight: Promise<readonly EarthquakeInstrument[]> | null = null

function loadOnce(): Promise<readonly EarthquakeInstrument[]> {
  if (cached) return Promise.resolve(cached)
  if (inflight) return inflight
  inflight = fetchEarthquakeInstruments()
    .then((items) => {
      cached = items
      inflight = null
      return cached
    })
    .catch((err) => {
      console.warn('[earthquake] 계측기 목록 fetch 실패', err)
      inflight = null
      return [] as readonly EarthquakeInstrument[]
    })
  return inflight
}

export function useEarthquakeInstruments(): readonly EarthquakeInstrument[] {
  const [items, setItems] = useState<readonly EarthquakeInstrument[]>(
    () => cached ?? [],
  )
  useEffect(() => {
    if (cached) return
    let cancelled = false
    loadOnce().then((list) => {
      if (!cancelled) setItems(list)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return items
}
