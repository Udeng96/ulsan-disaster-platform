// 부엉이 이벤트 실시간 수신 (SSE).
//   GET /owl/events/stream — 새 이벤트 발생 시 EventListItem JSON 을 push.
//   부엉이 서비스(8082, context-path /owl). payload 는 GET /owl/events 와 동일 스키마.
//
// 연결 견고화 (서버 재시작/프록시 이슈/백그라운드 탭 대비):
//   - onerror(CLOSED) 시 직접 재연결.
//   - watchdog: 서버 ping(및 이벤트)을 일정 시간 못 받으면 죽은 연결로 보고 재연결.
//     onerror 가 안 뜨는 케이스(프록시가 죽은 연결을 붙들어 브라우저가 감지 못 함)를 잡음.
//   - visibilitychange: 탭이 다시 보일 때 최근 무수신이면 즉시 재연결 (관제 실시간성).

import { useEffect, useRef } from 'react'
import type { EventListItem } from './event'

const STREAM_URL = '/owl/events/stream'
const RECONNECT_MS = 3000
// 서버 heartbeat(owl.sse.heartbeat-ms) 는 15s. 그 2.5배 넘게 무수신이면 죽은 연결로 판단.
const WATCHDOG_MS = 40000
// 탭 활성화 시: 마지막 수신 후 이 시간 넘었으면(하트비트 1회 이상 놓침) 즉시 재연결.
const STALE_MS = 20000

/**
 * 부엉이 이벤트 SSE 구독.
 *
 * @param onEvent 새 이벤트 수신 콜백. (매 렌더 새 함수여도 재연결 안 되도록 ref 로 고정)
 * @param enabled false 면 구독하지 않음 (기본 true).
 */
export function useOwlEventStream(
  onEvent: (event: EventListItem) => void,
  enabled = true,
) {
  // 콜백이 매 렌더 바뀌어도 연결은 유지 — deps 에서 제외하고 ref 로 최신값 참조.
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!enabled) return

    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let watchdog: ReturnType<typeof setTimeout> | null = null
    let lastDataAt = Date.now()
    let stopped = false // unmount 후 재연결 방지

    // 데이터(ping/이벤트/handshake)를 받을 때마다 호출 → 생존 확인 + 무수신 감시 타이머 리셋.
    function armWatchdog() {
      lastDataAt = Date.now()
      if (watchdog != null) clearTimeout(watchdog)
      watchdog = setTimeout(() => {
        console.warn('[OWL SSE] 데이터 무수신 — 죽은 연결로 판단, 재연결')
        scheduleReconnect()
      }, WATCHDOG_MS)
    }

    function teardown() {
      if (watchdog != null) {
        clearTimeout(watchdog)
        watchdog = null
      }
      if (es != null) {
        es.close()
        es = null
      }
    }

    // 지연 재연결 (watchdog/onerror 용).
    function scheduleReconnect() {
      teardown()
      if (!stopped && reconnectTimer == null) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          connect()
        }, RECONNECT_MS)
      }
    }

    // 즉시 재연결 (탭 활성화 용).
    function reconnectNow() {
      if (reconnectTimer != null) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      teardown()
      if (!stopped) connect()
    }

    function handlePayload(raw: unknown, eventName: string) {
      armWatchdog() // 무엇이든 수신했으니 생존 확인.
      if (typeof raw !== 'string' || !raw.trim()) return
      try {
        const parsed = JSON.parse(raw) as EventListItem | EventListItem[]
        const list = Array.isArray(parsed) ? parsed : [parsed]
        console.log(`[OWL SSE] Message (${eventName})`, parsed)
        for (const item of list) {
          // id 가 없는 payload 도 받는다 (msgId 로 식별). 하트비트 같은 빈 객체만 거른다.
          if (item && (typeof item.id === 'number' || item.msgId)) {
            onEventRef.current(item)
          }
        }
      } catch {
        // 하트비트 등 JSON 이 아닌 payload — 원문만 남김.
        console.log(`[OWL SSE] Message (${eventName}, non-JSON)`, raw)
      }
    }

    // 탭이 다시 보일 때: 최근 무수신이면 죽은 연결일 수 있으니 즉시 재연결.
    function onVisible() {
      if (stopped || document.visibilityState !== 'visible') return
      if (Date.now() - lastDataAt > STALE_MS) {
        console.warn('[OWL SSE] 탭 활성화 — 오래 무수신, 즉시 재연결')
        reconnectNow()
      }
    }

    function connect() {
      if (stopped) return
      es = new EventSource(STREAM_URL)

      es.onopen = () => {
        console.log('[OWL SSE] Connected')
        armWatchdog()
      }

      // 이벤트 이름 없이 오는 기본 message (event: 필드 없는 경우).
      es.onmessage = (e) => handlePayload(e.data, 'message')
      // 백엔드는 event: owl-message 로 push (owl 의 EVENT_NAME). 나머지는 방어적 fallback.
      for (const name of ['owl-message', 'owl-event', 'event']) {
        es.addEventListener(name, (e) =>
          handlePayload((e as MessageEvent).data, name),
        )
      }
      // ping/connect handshake — 이벤트 처리 없이 watchdog 만 리셋 (생존 신호).
      es.addEventListener('ping', () => armWatchdog())
      es.addEventListener('connect', () => armWatchdog())

      es.onerror = () => {
        // CONNECTING 이면 브라우저가 자동 재연결 중. CLOSED(치명적) 면 직접 재연결.
        if (es && es.readyState === EventSource.CLOSED) {
          console.warn('[OWL SSE] Disconnected (closed) — 직접 재연결')
          scheduleReconnect()
        } else {
          console.warn('[OWL SSE] Disconnected — 브라우저 자동 재연결 시도 중')
        }
      }
    }

    connect()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisible)
      if (reconnectTimer != null) clearTimeout(reconnectTimer)
      teardown()
      console.log('[OWL SSE] Disconnected (unmount)')
    }
  }, [enabled])
}
