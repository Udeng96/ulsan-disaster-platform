// 장비 목록 — GET /server/api/devices 를 10초 주기로 폴링 (status 가 수집에 따라 바뀐다).
//   장비 목록·방화벽 상세가 같이 쓰므로 모듈 캐시 + 구독 — useAreaSummary 와 같은 패턴.

import { useEffect, useState } from 'react'
import { fetchDevices, type ServerDevice } from '@/api/adminServer'

const POLL_MS = 10_000

let cached: ServerDevice[] = []
const subscribers = new Set<(d: ServerDevice[]) => void>()
let timer: ReturnType<typeof setInterval> | null = null

function load() {
  fetchDevices()
    .then((items) => {
      cached = items
      for (const fn of subscribers) fn(cached)
    })
    .catch((err) => {
      cached = cached.map((device) => ({ ...device, status: 'UNKNOWN' }))
      for (const fn of subscribers) fn(cached)
      console.warn('[devices] fetch 실패', err)
    })
}

export function useDevices(): ServerDevice[] {
  const [devices, setDevices] = useState<ServerDevice[]>(cached)
  useEffect(() => {
    subscribers.add(setDevices)
    if (timer === null) {
      load()
      timer = setInterval(load, POLL_MS)
    } else {
      setDevices(cached)
    }
    return () => {
      subscribers.delete(setDevices)
      if (subscribers.size === 0 && timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }
  }, [])
  return devices
}
