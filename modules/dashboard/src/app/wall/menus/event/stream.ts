// 부엉이 이벤트 실시간 수신 — 연결 1개 (옛 useOwlEventStream 과 같은 견고화).
//   - CLOSED 로 끊기면 3초 뒤 직접 다시 연결 (CONNECTING 이면 브라우저가 알아서 붙는다)
//   - 40초 동안 아무것도 못 받으면(ping 15초) 죽은 연결로 보고 다시 연결
//   - 탭이 다시 보일 때 20초 넘게 못 받았으면 바로 다시 연결
//   - 서버는 끊긴 동안의 이벤트를 다시 보내지 않는다 → 두 번째 연결부터는 onReconnect 로 목록을 다시 받게 한다 (사용자 10-22)
import { useEffect, useRef } from 'react'
import { EVENT, STREAM_URL, type OwlEvent } from './api'

const RECONNECT_MS = 3000
const WATCHDOG_MS = 40_000
const STALE_MS = 20_000
const LOG = '[OWL SSE]'

export function useEventStream(onEvent: (e: OwlEvent) => void, onReconnect: () => void) {
  // 콜백이 렌더마다 바뀌어도 연결은 그대로
  const ref = useRef({ onEvent, onReconnect })
  useEffect(() => {
    ref.current = { onEvent, onReconnect }
  })

  useEffect(() => {
    let es: EventSource | null = null
    let retry: ReturnType<typeof setTimeout> | null = null
    let watchdog: ReturnType<typeof setTimeout> | null = null
    let lastAt = Date.now()
    let opened = false
    let stopped = false

    const alive = () => {
      lastAt = Date.now()
      if (watchdog) clearTimeout(watchdog)
      watchdog = setTimeout(() => {
        console.warn(`${LOG} 오래 못 받음 — 다시 연결`)
        later()
      }, WATCHDOG_MS)
    }
    const close = () => {
      if (watchdog) clearTimeout(watchdog)
      watchdog = null
      es?.close()
      es = null
    }
    const later = () => {
      close()
      if (stopped || retry) return
      retry = setTimeout(() => {
        retry = null
        connect()
      }, RECONNECT_MS)
    }
    const now = () => {
      if (retry) clearTimeout(retry)
      retry = null
      close()
      connect()
    }
    const onMessage = (m: MessageEvent<string>) => {
      alive()
      let e: OwlEvent
      try {
        e = JSON.parse(m.data)
      } catch {
        return
      }
      if (typeof e?.id === 'number') ref.current.onEvent(e)
    }
    function connect() {
      if (stopped) return
      const source = new EventSource(STREAM_URL)
      es = source
      source.onopen = () => {
        alive()
        if (opened) {
          console.log(`${LOG} 다시 연결됨 — 목록 다시 받기`)
          ref.current.onReconnect()
        }
        opened = true
      }
      source.addEventListener(EVENT.message, onMessage as EventListener)
      source.addEventListener(EVENT.ping, alive)
      source.addEventListener(EVENT.connect, alive)
      source.onerror = () => {
        if (source.readyState === EventSource.CLOSED) {
          console.warn(`${LOG} 끊김 — 다시 연결`)
          later()
        }
      }
    }
    const onVisible = () => {
      if (!stopped && !document.hidden && Date.now() - lastAt > STALE_MS) now()
    }

    connect()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisible)
      if (retry) clearTimeout(retry)
      close()
    }
  }, [])
}
