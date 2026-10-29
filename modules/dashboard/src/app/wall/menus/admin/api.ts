// 관리자(서버 운영) API — server 모듈 (/server/api). 화면 칸 ↔ 값 대응: notes/gis-front/api-질문/8-관리자.md (10-23).
//   시각은 모두 ISO 문자열 (Instant 는 UTC 'Z', OffsetDateTime 은 +09:00) — 화면에서 서울 시각으로 바꾼다.
//   못 읽은 칸은 null. 서버가 안 주는 칸은 화면에서 '-' (사용자 10-23).
import { request } from '@/shared/api'

/** 판정 — 정상 · 주의 · 장애 · 실측 대기 */
export type Verdict = 'OK' | 'WARN' | 'FAIL' | 'UNKNOWN'

export interface ServerCard {
  seq: number
  host: string
  shortName: string
  verdict: Verdict
  verdictLabel: string
  color: string
  /** 직접 측정 ● / 간접 확인 ○ */
  directDot: boolean
  /** 「가동 214일 · 응답 정상」 또는 「행정망 · 간접 확인」 */
  subLine: string | null
  keyLabel: string | null
  keyValue: string | null
  keyAux: string | null
  keyVerdict: Verdict | null
}

export interface Overview {
  counts: { ok: number; warn: number; fail: number; pending: number; total: number }
  lastSync: string | null
  cards: ServerCard[]
}

export interface RackSlot {
  seq: number
  host: string
  name: string
  shape: string
  rackU: number
  verdict: Verdict
  color: string
  directDot: boolean
}

export interface Resource {
  kind: string
  label: string
  pct: number | null
  detail: string | null
  warnPct: number | null
  failPct: number | null
  judged: boolean
  /** null = 기준 없음 (항상 파랑) */
  verdict: Verdict | null
  color: string
}

export interface Ledger {
  seq: number
  name: string
  host: string
  hostConfirmed: boolean
  ip: string | null
  networkName: string | null
  manager: string | null
  model: string | null
  itemId: string | null
  serialNo: string | null
  introDate: string | null
  vendor: string | null
  vendorTel: string | null
  note: string | null
  maker: string | null
  setName: string | null
  measureMode: string
}

export interface Spec {
  seq: number
  name: string
  host: string
  ip: string | null
  os: string | null
  kernel: string | null
  cpuMeasured: string | null
  cpuSpec: string | null
  socketsCores: string | null
  ramMeasured: string | null
  ramSpec: string | null
  storageLogical: string | null
  storagePhysical: string | null
  raid: string | null
  nic: string | null
  power: string | null
  apps: string | null
  backup: string | null
  note: string | null
}

export interface ServerDetail {
  seq: number
  host: string
  hostConfirmed: boolean
  name: string
  shortName: string
  ip: string | null
  networkName: string | null
  measureMode: string
  verdict: Verdict
  verdictLabel: string
  /** 「가동 96일」 — 못 읽으면 null */
  uptimeText: string | null
  resources: Resource[]
  keyLabel: string | null
  keyValue: string | null
  keyAux: string | null
  keyVerdict: Verdict | null
  lastActivityText: string | null
  lastActivityVerdict: Verdict | null
  connectionText: string | null
  connectionVerdict: Verdict | null
  throughputText: string | null
  measuredAt: string | null
  collectedAt: string | null
  source: string | null
  staleness: Verdict | null
  reasons: string[]
  ledger: Ledger | null
  spec: Spec | null
}

export interface PartRow {
  item: string
  content: string | null
  state: string | null
  verdict: Verdict | null
  usage: string | null
  source: string | null
}

export interface HostParts {
  host: string
  measuredAt: string | null
  front: PartRow[]
  rear: PartRow[]
}

export interface FirewallSummary {
  collectedAt: string | null
  uptimeDays: number | null
  restartedAt: string | null
  rttMs: number | null
  sessionCnt: number | null
  cpuPct: number | null
  memPct: number | null
  cpuTempC: number | null
  fanRpm: number[] | null
  policyCount: number
  allowCount: number
  policyChangedAt: string | null
  /** 「변경」(24시간 안) / 「유지」 */
  policyStatus: string | null
  blockedLast24h: number
  blockedBaseline: number
  blockedRatio: number | null
  blockedVerdict: string | null
  alertsLast24h: number
  psuStatus: string | null
  powerSwitch: string | null
}

export type Range = '24h' | '7d'

export interface BlockChart {
  range: Range
  baseline: number
  warn: number
  fail: number
  points: { at: string; count: number; value: number }[]
}

export interface BlockType {
  tag: string
  label: string
  count: number
}

export interface FirewallPort {
  label: string
  ifName: string
  zone: string
  usage: string | null
  peer: string | null
  linkUp: boolean
  speed: string | null
  inBps: number | null
  outBps: number | null
}

export interface DeviceEvent {
  at: string
  /** 방화벽 tag · 스위치 kind */
  tag?: string
  kind?: string
  port?: string
  summary: string
}

export interface SwitchSummary {
  collectedAt: string | null
  uptimeDays: number | null
  restartedAt: string | null
  rttMs: number | null
  load1m: number | null
  memPct: number | null
  portsUp: number
  portsTotal: number
  errorPorts: string[]
  trafficGbps: number | null
  broadcastPct: number | null
  broadcastHigh: boolean
  powerStatus: string | null
}

export interface TrafficChart {
  range: Range
  baselineGbps: number | null
  points: { at: string; gbps: number | null; maxRttMs: number | null; rttLevel: string | null; maxBroadcastPct: number | null; broadcastHigh: boolean }[]
}

export interface SwitchPort {
  ifName: string
  label: string
  host: string | null
  note: string | null
  linkUp: boolean
  speedMbps: number | null
  inBps: number | null
  outBps: number | null
  errors: number
  macs: string[]
  unknownMacs: string[]
}

type S = AbortSignal | undefined
const get = <T>(path: string, signal: S, query?: Record<string, string | number>) => request<T>('server', path, { signal, query })

export const fetchOverview = (signal?: S) => get<Overview>('/overview', signal)
export const fetchRackSlots = (signal?: S) => get<RackSlot[]>('/rack-slots', signal)
export const fetchLedger = (signal?: S) => get<Ledger[]>('/servers', signal)
export const fetchSpecs = (signal?: S) => get<Spec[]>('/server-specs', signal)
export const fetchDetail = (host: string, signal?: S) => get<ServerDetail>(`/servers/${encodeURIComponent(host)}`, signal)
export const fetchParts = (host: string, signal?: S) => get<HostParts>(`/servers/${encodeURIComponent(host)}/parts`, signal)

export const fetchFirewallSummary = (signal?: S) => get<FirewallSummary>('/firewall/summary', signal)
export const fetchFirewallBlocks = (range: Range, signal?: S) => get<BlockChart>('/firewall/blocks', signal, { range })
export const fetchFirewallBlockTypes = (signal?: S) => get<BlockType[]>('/firewall/block-types', signal)
export const fetchFirewallPorts = (signal?: S) => get<FirewallPort[]>('/firewall/ports', signal)
export const fetchFirewallEvents = (limit: number, signal?: S) => get<DeviceEvent[]>('/firewall/events', signal, { limit })

export const fetchSwitchSummary = (signal?: S) => get<SwitchSummary>('/switch/summary', signal)
export const fetchSwitchTraffic = (range: Range, signal?: S) => get<TrafficChart>('/switch/traffic', signal, { range })
export const fetchSwitchPorts = (signal?: S) => get<SwitchPort[]>('/switch/ports', signal)
export const fetchSwitchEvents = (limit: number, signal?: S) => get<DeviceEvent[]>('/switch/events', signal, { limit })
