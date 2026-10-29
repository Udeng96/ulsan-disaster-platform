// 방화벽 이벤트 — GET /server/api/firewall/events 를 10초 주기로 폴링.
//   화면에 세 줄이라 limit 3.

import { useEffect, useState } from 'react'
import { fetchFirewallEvents, type FirewallEvent } from '@/api/adminServer'

const POLL_MS = 10_000
const LIMIT = 3

export function useFirewallEvents(): FirewallEvent[] {
  const [events, setEvents] = useState<FirewallEvent[]>([])
  useEffect(() => {
    let alive = true
    const load = () =>
      fetchFirewallEvents(LIMIT)
        .then((e) => alive && setEvents(e))
        .catch((err) => {
          if (alive) setEvents([])
          console.warn('[firewall-events] fetch 실패', err)
        })
    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])
  return events
}
