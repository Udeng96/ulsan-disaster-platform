// 관리자 서버 운영 API client — server 모듈 (:8087, context-path /server).

/** 방화벽 카드 — GET /server/api/firewall/summary. */
export interface FirewallSummary {
  /** 마지막 수집 시각. 10초 넘게 지났으면 수집 중단. */
  collectedAt: string | null
  uptimeDays: number | null
  /** SNMP 응답 ms */
  rttMs: number | null
  sessionCnt: number | null
  cpuPct: number | null
  memPct: number | null
  cpuTempC: number | null
  fanRpm: number[] | null
  /** 적용 정책 수 */
  policyCount: number
  /** 허용 정책 수 */
  allowCount: number
  /** 정책 표를 마지막으로 바꾼 관리자 로그 시각 */
  policyChangedAt: string | null
  blockedLast24h: number
  alertsLast24h: number
}

/** BigDecimal → string 직렬화 대비 number 캐스팅. */
function numOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null
  return typeof v === 'string' ? parseFloat(v) : v
}

export async function fetchFirewallSummary(): Promise<FirewallSummary> {
  const res = await fetch('/server/api/firewall/summary', { signal: AbortSignal.timeout(8000) })
  if (!res.ok) {
    throw new Error(`fetchFirewallSummary failed: ${res.status} ${res.statusText}`)
  }
  const data = (await res.json()) as FirewallSummary
  return { ...data, cpuPct: numOrNull(data.cpuPct), cpuTempC: numOrNull(data.cpuTempC) }
}

/** 장비 상태 — NORMAL 수집 30초 이내 / WARN 정상이지만 24시간 경고 있음 / DOWN 30초 넘게 수집 없음 / UNKNOWN 수집 연동 전. */
export type DeviceStatus = 'NORMAL' | 'WARN' | 'DOWN' | 'UNKNOWN'

/** 장비 한 대 — GET /server/api/devices (랙 순, 표출 Y 만). */
export interface ServerDevice {
  id: number
  kind: string
  code: string
  name: string
  ip: string | null
  /** 랙 위치 — 위에서부터 1. */
  rackPos: number | null
  vendor: string | null
  model: string | null
  serialNo: string | null
  /** 자산대장 — 값이 없으면 null (엑셀에 없는 항목). */
  supplier: string | null
  /** 물품식별번호 */
  itemNo: string | null
  /** 계약가 — 원 단위 정수 */
  contractPrice: number | null
  /** 계약종료 yyyy-MM-dd */
  contractEnd: string | null
  cpu: string | null
  ram: string | null
  storage: string | null
  nic: string | null
  power: string | null
  /** 폼팩터·크기 (예: "2U · 433×87.6×695") */
  sizeMm: string | null
  os: string | null
  /** 화면 표출 여부 — 서버가 Y 만 내려준다. */
  displayYn: 'Y' | 'N'
  status: DeviceStatus
  /** 마지막 수집 시각 */
  lastSeenAt: string | null
}

export async function fetchDevices(): Promise<ServerDevice[]> {
  const res = await fetch('/server/api/devices', { signal: AbortSignal.timeout(8000) })
  if (!res.ok) {
    throw new Error(`fetchDevices failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as ServerDevice[]
}

/** 방화벽 전면 포트 한 개 — GET /server/api/firewall/ports (라벨 순). */
export interface FirewallPort {
  label: string
  ifName: string | null
  /** external / internal */
  zone: string | null
  /** 용도 (수기) */
  usage: string | null
  /** 연결 상대 (수기) */
  peer: string | null
  linkUp: boolean
  /** 링크 속도 — 수집 전에는 null */
  speed: string | null
  inBps: number | null
  outBps: number | null
}

export async function fetchFirewallPorts(): Promise<FirewallPort[]> {
  const res = await fetch('/server/api/firewall/ports', { signal: AbortSignal.timeout(8000) })
  if (!res.ok) {
    throw new Error(`fetchFirewallPorts failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as FirewallPort[]
}

/** 방화벽 이벤트 한 줄 — GET /server/api/firewall/events?limit=N. */
export interface FirewallEvent {
  at: string
  /** audit / alert / threat … */
  tag: string
  /** CSV 원문 */
  body: string
  /** 화면용 한 줄 — audit 은 "계정(접속IP) · 메뉴 · 동작 · 결과", 그 외 tag 는 body 원문. */
  summary: string
}

export async function fetchFirewallEvents(limit = 3): Promise<FirewallEvent[]> {
  const res = await fetch(`/server/api/firewall/events?limit=${limit}`, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) {
    throw new Error(`fetchFirewallEvents failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as FirewallEvent[]
}
