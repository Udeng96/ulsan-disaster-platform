// 방화벽 전면 포트 — GET /server/api/firewall/ports 를 수집 주기(10초)에 맞춰 폴링.
//   포트 표와 전면 포트 그림이 같이 쓰므로 모듈 캐시 + 구독.

import { useEffect, useState } from 'react'
import { fetchFirewallPorts, type FirewallPort } from '@/api/adminServer'

const POLL_MS = 10_000

let cached: FirewallPort[] = []
const subscribers = new Set<(p: FirewallPort[]) => void>()
let timer: ReturnType<typeof setInterval> | null = null

function load() {
  fetchFirewallPorts()
    .then((items) => {
      cached = items
      for (const fn of subscribers) fn(cached)
    })
    .catch((err) => {
      cached = []
      for (const fn of subscribers) fn(cached)
      console.warn('[firewall-ports] fetch 실패', err)
    })
}

export function useFirewallPorts(): FirewallPort[] {
  const [ports, setPorts] = useState<FirewallPort[]>(cached)
  useEffect(() => {
    subscribers.add(setPorts)
    if (timer === null) {
      load()
      timer = setInterval(load, POLL_MS)
    } else {
      setPorts(cached)
    }
    return () => {
      subscribers.delete(setPorts)
      if (subscribers.size === 0 && timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }
  }, [])
  return ports
}
