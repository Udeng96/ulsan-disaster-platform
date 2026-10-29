// 조기경보 — 발령 필요 / 발령 이력을 1분 주기로 폴링.
//   조기경보·통계 탭에서만 구독한다. 화면을 벗어나면 폴링이 멈춘다.

import { useEffect, useState } from 'react'
import {
  fetchAlarmHistory,
  fetchAlarmPending,
  type AlarmHistory,
  type AlarmPending,
} from '@/api/slope'

const POLL_MS = 60_000


export interface Alarms {
  pending: readonly AlarmPending[]
  history: readonly AlarmHistory[]
}

export function useAlarms(): Alarms {
  const [alarms, setAlarms] = useState<Alarms>({ pending: [], history: [] })

  useEffect(() => {
    let cancelled = false
    const load = () => {
      // 한쪽이 실패해도 다른 쪽은 표출한다.
      fetchAlarmPending()
        .then((pending) => {
          if (!cancelled) setAlarms((prev) => ({ ...prev, pending }))
        })
        .catch((err) => console.warn('[slope-alarms] pending 실패', err))
      fetchAlarmHistory()
        .then((history) => {
          if (!cancelled) setAlarms((prev) => ({ ...prev, history }))
        })
        .catch((err) => console.warn('[slope-alarms] history 실패', err))
    }
    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return alarms
}
