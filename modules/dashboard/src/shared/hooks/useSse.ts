// SSE 구독 — 같은 주소는 연결 하나를 같이 쓴다 (지진·부엉이 SSE 를 여러 화면이 들어도 1개).
//   - 서버가 보내는 이벤트 이름별로 핸들러를 건다 (JSON 으로 풀어서 넘김)
//   - watchdogMs 동안 아무것도 안 오면(ping 포함) 죽은 연결로 보고 다시 연결
//   - 탭이 다시 보일 때 오래 조용했으면 바로 다시 연결
//   - 연결 상태(connected)를 같이 돌려준다
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'

type Listener = (event: string, data: unknown) => void

interface Conn {
  es: EventSource | null
  listeners: Set<Listener>
  events: Set<string>
  connected: boolean
  stateListeners: Set<() => void>
  lastAt: number
  watchdog: ReturnType<typeof setTimeout> | null
  retry: ReturnType<typeof setTimeout> | null
  watchdogMs: number
}

const conns = new Map<string, Conn>()
const RETRY_MS = 3000

function setConnected(c: Conn, v: boolean) {
  if (c.connected === v) return
  c.connected = v
  for (const l of c.stateListeners) l()
}

function arm(c: Conn, url: string) {
  c.lastAt = Date.now()
  if (c.watchdog) clearTimeout(c.watchdog)
  c.watchdog = setTimeout(() => reconnect(c, url, 0), c.watchdogMs)
}

function attach(c: Conn, url: string, name: string) {
  c.es?.addEventListener(name, (e) => {
    arm(c, url)
    const raw = (e as MessageEvent).data
    let data: unknown = raw
    if (typeof raw === 'string' && raw.trim()) {
      try {
        data = JSON.parse(raw)
      } catch {
        data = raw
      }
    }
    for (const l of c.listeners) l(name, data)
  })
}

function open(c: Conn, url: string) {
  const es = new EventSource(url)
  c.es = es
  es.onopen = () => {
    setConnected(c, true)
    arm(c, url)
  }
  for (const n of ['connect', 'ping']) es.addEventListener(n, () => {
    setConnected(c, true)
    arm(c, url)
  })
  for (const n of c.events) attach(c, url, n)
  es.onerror = () => {
    setConnected(c, false)
    if (es.readyState === EventSource.CLOSED) reconnect(c, url, RETRY_MS)
  }
}

function close(c: Conn) {
  if (c.watchdog) clearTimeout(c.watchdog)
  if (c.retry) clearTimeout(c.retry)
  c.watchdog = c.retry = null
  c.es?.close()
  c.es = null
}

function reconnect(c: Conn, url: string, delay: number) {
  close(c)
  setConnected(c, false)
  if (!c.listeners.size) return
  c.retry = setTimeout(() => {
    c.retry = null
    if (c.listeners.size) open(c, url)
  }, delay)
}

function onVisible() {
  if (document.hidden) return
  for (const [url, c] of conns) if (Date.now() - c.lastAt > c.watchdogMs / 2) reconnect(c, url, 0)
}

function getConn(url: string, watchdogMs: number): Conn {
  let c = conns.get(url)
  if (!c) {
    c = { es: null, listeners: new Set(), events: new Set(), connected: false, stateListeners: new Set(), lastAt: Date.now(), watchdog: null, retry: null, watchdogMs }
    conns.set(url, c)
    if (conns.size === 1) document.addEventListener('visibilitychange', onVisible)
  }
  return c
}

/**
 * @param url     SSE 주소
 * @param events  받을 이벤트 이름들 (예: ['earthquake-realtime', 'status'])
 * @param onEvent (이벤트 이름, JSON 으로 푼 데이터)
 */
export function useSse(url: string | null, events: readonly string[], onEvent: (event: string, data: unknown) => void, watchdogMs = 40_000): { connected: boolean } {
  const handler = useRef(onEvent)
  useLayoutEffect(() => {
    handler.current = onEvent
  })
  const key = events.join(',')

  useEffect(() => {
    if (!url) return
    const c = getConn(url, watchdogMs)
    const l: Listener = (e, d) => handler.current(e, d)
    c.listeners.add(l)
    const fresh = key.split(',').filter((n) => n && !c.events.has(n))
    for (const n of fresh) c.events.add(n)
    if (!c.es && !c.retry) open(c, url)
    else for (const n of fresh) attach(c, url, n)
    return () => {
      c.listeners.delete(l)
      if (!c.listeners.size) {
        close(c)
        setConnected(c, false)
        conns.delete(url)
        if (!conns.size) document.removeEventListener('visibilitychange', onVisible)
      }
    }
  }, [url, key, watchdogMs])

  const connected = useSyncExternalStore(
    (cb) => {
      if (!url) return () => {}
      const c = getConn(url, watchdogMs)
      c.stateListeners.add(cb)
      return () => c.stateListeners.delete(cb)
    },
    () => (url ? (conns.get(url)?.connected ?? false) : false),
  )
  return { connected }
}
