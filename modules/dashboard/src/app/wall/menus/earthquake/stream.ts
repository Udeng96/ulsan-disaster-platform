// 지진가속도 실시간 — 앱 전체에서 연결 1개 (옛 SSE 싱글턴과 같은 방식, 10-21 성능 확인: 1초에 약 30ms, 메모리 그대로).
//   대시보드가 뜨면 바로 연결하고 메뉴를 닫아도 유지한다 (안 열어 둔 동안에도 수신 상태를 안다).
//   4대가 같은 초에 따로 오므로 받은 값은 모아 두고 1초에 한 번만 알린다 (그때마다 그리면 차트가 움찔거린다).
//   x축은 '최근 60초' 고정 창이라 창 밖 점은 버린다.
//   화면은 필요한 값만 골라 구독한다 (수신 상태만 보는 칸은 1초마다 다시 그려지지 않게).
import { useEffect, useSyncExternalStore } from 'react'
import { WINDOW_MS } from '@/features/menus/earthquake/channels'
import { EVENT, STREAM_URL, type EarthquakeRealtime, type EarthquakeStatus } from './api'

/** 차트 점 — [epoch ms, gal] */
export type SeriesPoint = readonly [number, number]

interface Snapshot {
  /** 관측소 코드 → 점 (오래된 것 → 최신) */
  series: Record<string, SeriesPoint[]>
  /** 업체(관측 장비) 수신 여부. false 면 '계측 데이터 수신 중단' */
  sourceConnected: boolean
  /** 축을 미는 기준 시각 */
  now: number
}

const FLUSH_MS = 1000
const LOG = '[EQ SSE]'
const NONE: SeriesPoint[] = []

const buffer: Record<string, SeriesPoint[]> = {}
// null = 아직 상태를 못 받음 (처음 받으면 값과 상관없이 로그)
let sourceConnected: boolean | null = null
let snapshot: Snapshot = { series: {}, sourceConnected: true, now: Date.now() }
const listeners = new Set<() => void>()
let es: EventSource | null = null

function flush() {
  const now = Date.now()
  const cutoff = now - WINDOW_MS
  const series: Snapshot['series'] = {}
  for (const [code, points] of Object.entries(buffer)) {
    const kept = points.filter(([t]) => t >= cutoff)
    buffer[code] = kept
    series[code] = kept
  }
  snapshot = { series, sourceConnected: sourceConnected ?? true, now }
  for (const l of listeners) l()
}

function onValue(e: MessageEvent<string>) {
  let d: EarthquakeRealtime
  try {
    d = JSON.parse(e.data)
  } catch {
    return // 깨진 이벤트는 버린다 (연결은 유지)
  }
  if (!d?.stationCode || typeof d.hpga !== 'number') return
  // 시간대 없는 시각 — 못 읽으면 받은 시각
  const at = new Date(d.time).getTime()
  // 새 배열로 — 지금 화면이 쥔 배열(지난 알림)을 건드리지 않는다
  buffer[d.stationCode] = [...(buffer[d.stationCode] ?? []), [Number.isNaN(at) ? Date.now() : at, d.hpga]]
}

/** status 와 ping 은 같은 모양 — 15초마다 오는 ping 으로도 상태를 맞춘다 */
function onStatus(e: MessageEvent<string>) {
  let d: Partial<EarthquakeStatus>
  try {
    d = JSON.parse(e.data)
  } catch {
    return
  }
  if (typeof d?.sourceConnected !== 'boolean') return
  // 바뀔 때만 로그 (15초마다 찍으면 넘친다)
  if (d.sourceConnected !== sourceConnected) console.log(d.sourceConnected ? `${LOG} 수신 재개` : `${LOG} 수신 중단 (관측 장비 연결 끊김)`)
  sourceConnected = d.sourceConnected
}

/** 연결 — 여러 번 불러도 하나. 끊기면 브라우저가 알아서 다시 붙는다 (서버가 retry 를 안 보내 기본 약 3초) */
function connect() {
  if (es) return
  es = new EventSource(STREAM_URL)
  es.addEventListener(EVENT.value, onValue as EventListener)
  es.addEventListener(EVENT.status, onStatus as EventListener)
  es.addEventListener(EVENT.ping, onStatus as EventListener)
  es.onerror = () => console.warn(`${LOG} 끊김 — 다시 연결`)
  window.setInterval(flush, FLUSH_MS)
}

function subscribe(listener: () => void) {
  connect()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useSourceConnected = () => useSyncExternalStore(subscribe, () => snapshot.sourceConnected)
export const useStationSeries = (code: string) => useSyncExternalStore(subscribe, () => snapshot.series[code] ?? NONE)
export const useStreamNow = () => useSyncExternalStore(subscribe, () => snapshot.now)

/** 대시보드가 뜨면 바로 연결 — 메뉴를 안 열어 둔 동안에도 수신 상태를 안다 (옛 화면과 같다) */
export function EarthquakeSync() {
  useEffect(() => connect(), [])
  return null
}
