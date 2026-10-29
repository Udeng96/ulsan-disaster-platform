// 지진가속도 실시간 SSE — 앱 전체에서 연결 1개 (모듈 싱글턴).
//
// 메뉴를 열 때만 붙이면 화면을 안 열어 둔 동안 수신 상태를 알 수 없다 (부엉이 SSE 와 같은 이유).
// 그래서 대시보드가 뜨면 바로 연결하고, 메뉴를 닫아도 유지한다.
//
// 서버는 계측기 4대를 '한 건씩 따로' 보낸다 (같은 초에 랜덤 순서로 4번 도착).
// 이벤트마다 렌더하면 1초에 4번 그려지고 계열별 점 개수가 어긋나 차트가 움찔거린다.
//   → 수신은 버퍼에만 쌓고, 1초 타이머에서 한 번만 스냅샷을 만들어 구독자에게 알린다.
//
// x축은 데이터 범위가 아니라 '최근 WINDOW_MS' 고정 창이다 (축 흔들림 방지).

import {
  EARTHQUAKE_STREAM_EVENT,
  EARTHQUAKE_STREAM_URL,
  type EarthquakeRealtime,
} from '@/api/earthquake'
import { WINDOW_MS } from './channels'

/** 차트가 쓰는 시계열 한 점 — [epoch ms, 가속도(gal)]. */
export type SeriesPoint = readonly [number, number]

/** 관측소 코드 → 시계열 (오래된 것 → 최신). */
export type SeriesByStation = Record<string, SeriesPoint[]>

export interface EarthquakeStreamState {
  series: SeriesByStation
  /** 업체(관측 장비) 수신 여부 — status 이벤트. false 면 '수신 중단'. */
  sourceConnected: boolean
  /** 우리 SSE 연결 자체가 살아 있는지. */
  streamConnected: boolean
  /** 축을 미는 기준 시각 (flush 마다 갱신). */
  now: number
}

/** flush 주기 — 렌더를 1초에 한 번으로 묶는다. */
const FLUSH_MS = 1000
/** 콘솔 로그 접두어 — 부엉이 상황전파 SSE([OWL SSE]) 와 구분한다. */
const LOG = '[EQ SSE]'

const buffer: SeriesByStation = {}
// null = 아직 status 를 못 받음 (첫 수신은 값과 무관하게 로그를 남긴다).
let sourceConnected: boolean | null = null
let streamConnected = false

let snapshot: EarthquakeStreamState = {
  series: {},
  sourceConnected: true,
  streamConnected: false,
  now: Date.now(),
}

const listeners = new Set<() => void>()
let es: EventSource | null = null
let timer: number | null = null

function emit() {
  for (const l of listeners) l()
}

function flush() {
  const now = Date.now()
  const cutoff = now - WINDOW_MS
  const series: SeriesByStation = {}
  for (const [code, points] of Object.entries(buffer)) {
    // 창을 벗어난 점 제거 — 계속 들고 있으면 렌더가 느려진다.
    const kept = points.filter(([t]) => t >= cutoff)
    buffer[code] = kept
    series[code] = kept
  }
  snapshot = {
    series,
    sourceConnected: sourceConnected ?? true,
    streamConnected,
    now,
  }
  emit()
}

function onSample(e: MessageEvent<string>) {
  let d: EarthquakeRealtime
  try {
    d = JSON.parse(e.data)
  } catch {
    return // 깨진 이벤트는 버린다 (연결은 유지)
  }
  if (!d?.stationCode) return
  // time 은 타임존 없는 ISO — 파싱 실패 시 수신 시각으로 대체.
  const at = new Date(d.time).getTime()
  const ts = Number.isNaN(at) ? Date.now() : at
  buffer[d.stationCode] = [...(buffer[d.stationCode] ?? []), [ts, d.hpga]]
}

function onStatus(e: MessageEvent<string>) {
  try {
    const next = !!JSON.parse(e.data)?.sourceConnected
    // 상태가 바뀔 때만 — 매 이벤트마다 찍으면 로그가 넘친다.
    if (next !== sourceConnected) {
      console.log(
        next ? `${LOG} 수신 재개` : `${LOG} 수신 중단 (관측 장비 연결 끊김)`,
      )
    }
    sourceConnected = next
  } catch {
    // 무시
  }
}

function markConnected() {
  if (streamConnected) return
  streamConnected = true
  console.log(`${LOG} 연결됨`)
}

/** 연결 시작 — 여러 번 불러도 연결은 하나만 만든다. */
export function connectEarthquakeStream(): void {
  if (es) return
  es = new EventSource(EARTHQUAKE_STREAM_URL)
  es.addEventListener(EARTHQUAKE_STREAM_EVENT, onSample as EventListener)
  es.addEventListener('status', onStatus as EventListener)
  // onopen 과 서버의 connect 이벤트 둘 다로 연결을 확정한다
  // (addEventListener('open') 만으로는 안 잡히는 경우가 있다).
  es.onopen = markConnected
  es.addEventListener('connect', markConnected)
  es.onerror = () => {
    if (streamConnected) console.warn(`${LOG} 끊김 — 재연결 시도`)
    streamConnected = false // EventSource 가 자동 재시도한다
  }
  timer = window.setInterval(flush, FLUSH_MS)
}

export function subscribeEarthquakeStream(listener: () => void): () => void {
  connectEarthquakeStream()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getEarthquakeSnapshot(): EarthquakeStreamState {
  return snapshot
}

/** 테스트/HMR 정리용 — 운영 화면에서는 연결을 끊지 않는다. */
export function disconnectEarthquakeStream(): void {
  if (timer !== null) window.clearInterval(timer)
  timer = null
  es?.close()
  es = null
  streamConnected = false
}
