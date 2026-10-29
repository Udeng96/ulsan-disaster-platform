// 무더위쉼터 hook — /api/shelter/cooling 1회 fetch + 모듈 캐시.
//   레이어 메뉴 재진입 / 체크 토글마다 재fetch 방지 (usePumpStations 패턴).
//   레이어 메뉴 (idx 5) 에서 'SHELTER' 체크 시 지도 마커 표출.

import { useEffect, useState } from 'react'
import { fetchCoolingShelters, type CoolingShelter } from '@/api/shelter'

let cached: readonly CoolingShelter[] | null = null
let inflight: Promise<readonly CoolingShelter[]> | null = null

function loadOnce(): Promise<readonly CoolingShelter[]> {
  if (cached) return Promise.resolve(cached)
  if (inflight) return inflight
  inflight = fetchCoolingShelters()
    .then((items) => {
      cached = items
      inflight = null
      return cached
    })
    .catch((err) => {
      console.warn('[shelters] fetch 실패', err)
      inflight = null
      return [] as readonly CoolingShelter[]
    })
  return inflight
}

export function useShelters(): readonly CoolingShelter[] {
  const [shelters, setShelters] = useState<readonly CoolingShelter[]>(
    () => cached ?? [],
  )
  useEffect(() => {
    if (cached) return
    let cancelled = false
    loadOnce().then((items) => {
      if (!cancelled) setShelters(items)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return shelters
}
