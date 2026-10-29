// 요약 바 지역 배지 — GET /slope/api/areas/summary 를 1분 주기로 폴링.
//   총괄·관제 / 조기경보용 경량 응답 (지역 3건: id/name/grade/level).
//   계측 상세에서는 areas 가 이미 1분마다 갱신되므로 이쪽 폴링을 끈다 (enabled=false).
//
// 모듈 캐시 + 구독 — useSlopeAreas 와 같은 패턴.

import { useEffect, useState } from 'react'
import { fetchAreaSummary, type AreaSummary } from '@/api/slope'

const POLL_MS = 60_000

let cached: readonly AreaSummary[] = []
const subscribers = new Set<(a: readonly AreaSummary[]) => void>()
let timer: ReturnType<typeof setInterval> | null = null

function load() {
  fetchAreaSummary()
    .then((items) => {
      cached = items
      for (const fn of subscribers) fn(cached)
    })
    .catch((err) => console.warn('[slope-summary] fetch 실패', err))
}

export function useAreaSummary(enabled = true): readonly AreaSummary[] {
  const [summary, setSummary] = useState<readonly AreaSummary[]>(cached)
  useEffect(() => {
    if (!enabled) return
    subscribers.add(setSummary)
    if (timer === null) {
      load()
      timer = setInterval(load, POLL_MS)
    } else {
      setSummary(cached)
    }
    return () => {
      subscribers.delete(setSummary)
      if (subscribers.size === 0 && timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }
  }, [enabled])
  return summary
}
