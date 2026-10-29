// 대기질 측정소 hook — /api/air/stations 1회 fetch + 모듈 캐시.
//   레이어 메뉴 재진입 / 체크 토글마다 재fetch 방지 (useShelters 패턴).
//   레이어 메뉴 (idx 5) 에서 'AIR_QUALITY' 체크 시 지도 마커 표출.

import { useEffect, useState } from 'react'
import { fetchAirStations, type AirStation } from '@/api/airStation'

let cached: readonly AirStation[] | null = null
let inflight: Promise<readonly AirStation[]> | null = null

function loadOnce(): Promise<readonly AirStation[]> {
  if (cached) return Promise.resolve(cached)
  if (inflight) return inflight
  inflight = fetchAirStations()
    .then((items) => {
      cached = items
      inflight = null
      return cached
    })
    .catch((err) => {
      console.warn('[air-stations] fetch 실패', err)
      inflight = null
      return [] as readonly AirStation[]
    })
  return inflight
}

export function useAirStations(): readonly AirStation[] {
  const [stations, setStations] = useState<readonly AirStation[]>(
    () => cached ?? [],
  )
  useEffect(() => {
    if (cached) return
    let cancelled = false
    loadOnce().then((items) => {
      if (!cancelled) setStations(items)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return stations
}
