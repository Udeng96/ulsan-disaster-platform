// 급경사지 관리지역 hook — 1회 fetch + 모듈 캐시.
//   메뉴 토글마다 패널이 re-mount 돼도 재요청하지 않는다 (usePumpStations 패턴).
//
// 정렬은 여기서 한 번만 — 서버 DB 로케일이 C.UTF-8 이라 한글이 코드포인트 순으로 어긋난다.

import { useEffect, useState } from 'react'
import { fetchManagedAreas, type ManagedArea } from '@/api/slope'

let cached: readonly ManagedArea[] | null = null
let inflight: Promise<readonly ManagedArea[]> | null = null

function loadOnce(): Promise<readonly ManagedArea[]> {
  if (cached) return Promise.resolve(cached)
  if (inflight) return inflight
  inflight = fetchManagedAreas()
    .then((items) => {
      cached = [...items].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      inflight = null
      return cached
    })
    .catch((err) => {
      console.warn('[slope-managed-areas] fetch 실패', err)
      inflight = null
      return [] as readonly ManagedArea[]
    })
  return inflight
}

export function useManagedAreas(): readonly ManagedArea[] {
  const [areas, setAreas] = useState<readonly ManagedArea[]>(() => cached ?? [])
  useEffect(() => {
    if (cached) return
    let cancelled = false
    loadOnce().then((items) => {
      if (!cancelled) setAreas(items)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return areas
}
