// 지도 발령 빈도 버블 — /slope/api/alarms/map?from=&to=.
//   기간이 바뀔 때만 조회 (폴링 아님). 조기경보·통계 탭에서만 쓴다.

import { useEffect, useState } from 'react'
import { fetchAlarmMap, type AlarmMapPoint } from '@/api/slope'

export function useAlarmMap(
  from: string | null,
  to: string,
  enabled = true,
): readonly AlarmMapPoint[] {
  const [points, setPoints] = useState<readonly AlarmMapPoint[]>([])
  useEffect(() => {
    if (!enabled || !from) return
    let cancelled = false
    fetchAlarmMap(from, to)
      .then((rows) => {
        if (!cancelled) setPoints(rows)
      })
      .catch((err) => console.warn('[slope-alarm-map] 조회 실패', err))
    return () => {
      cancelled = true
    }
  }, [from, to, enabled])
  return points
}
