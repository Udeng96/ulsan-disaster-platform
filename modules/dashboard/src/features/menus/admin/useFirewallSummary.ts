// 방화벽 카드 — GET /server/api/firewall/summary 를 수집 주기(SNMP 10초)에 맞춰 폴링.

import { useEffect, useState } from 'react'
import { fetchFirewallSummary, type FirewallSummary } from '@/api/adminServer'

const POLL_MS = 10_000

export function useFirewallSummary(): FirewallSummary | null {
  const [summary, setSummary] = useState<FirewallSummary | null>(null)
  useEffect(() => {
    let alive = true
    const load = () =>
      fetchFirewallSummary()
        .then((s) => alive && setSummary(s))
        .catch((err) => {
          if (alive) setSummary(null)
          console.warn('[firewall-summary] fetch 실패', err)
        })
    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])
  return summary
}
