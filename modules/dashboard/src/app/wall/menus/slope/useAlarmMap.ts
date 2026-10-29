// 지도 발령 빈도 버블 — 조기경보·통계에서 고른 기간이 바뀔 때만 받는다 (주기 갱신 없음).
//   실패하면 지난 버블을 둔다.
import { useEffect, useState } from 'react'
import { fetchAlarmMap, type AlarmMapPoint, type Period } from './api'

export function useAlarmMap(period: Period | null, enabled: boolean): readonly AlarmMapPoint[] {
  const [points, setPoints] = useState<readonly AlarmMapPoint[]>([])
  const from = period?.from
  const to = period?.to
  useEffect(() => {
    if (!enabled || !from || !to) return
    const ac = new AbortController()
    fetchAlarmMap({ from, to }, ac.signal)
      .then(setPoints)
      .catch((err) => {
        if (!ac.signal.aborted) console.warn('[slope-alarm-map] 불러오기 실패', err)
      })
    return () => ac.abort()
  }, [from, to, enabled])
  return points
}
