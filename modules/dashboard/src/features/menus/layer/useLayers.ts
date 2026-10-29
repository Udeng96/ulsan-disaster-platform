// 레이어 메타 hook — /api/layers 1회 fetch + 모듈 캐시.
//   레이어 메뉴 진입마다 패널 re-mount 시 매번 fetch → 빈 리스트 깜빡임 방지 (usePumpStations 패턴).
//   LayerPanel (리스트) · DashboardPage (state 초기화) · MapSection (마커색) 이 공유 — 캐시라 fetch 1회.

import { useEffect, useState } from 'react'
import { fetchLayers, type LayerMeta } from '@/api/layer'

let cached: readonly LayerMeta[] | null = null
let inflight: Promise<readonly LayerMeta[]> | null = null

function loadOnce(): Promise<readonly LayerMeta[]> {
  if (cached) return Promise.resolve(cached)
  if (inflight) return inflight
  inflight = fetchLayers()
    .then((items) => {
      cached = items
      inflight = null
      return cached
    })
    .catch((err) => {
      console.warn('[layers] fetch 실패', err)
      inflight = null
      return [] as readonly LayerMeta[]
    })
  return inflight
}

export function useLayers(): readonly LayerMeta[] {
  const [layers, setLayers] = useState<readonly LayerMeta[]>(() => cached ?? [])
  useEffect(() => {
    if (cached) return
    let cancelled = false
    loadOnce().then((items) => {
      if (!cancelled) setLayers(items)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return layers
}
