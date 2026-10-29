// 관리자(server) 가짜 응답 — 새 화면용. 모양은 server 모듈 dto, 값은 운영 DB 에서 읽은 것(10-23 22:42, notes/gis-front/api-질문/8-관리자-운영DB-값.md)을 바탕으로.
//   운영에선 3~12번 서버 스냅샷이 아직 없지만, 화면을 보려고 3~9번은 값이 있는 것처럼, 10·12번은 실측 대기로 둔다.
const COLOR = { OK: '#45E36C', WARN: '#F2D230', FAIL: '#FF4245', UNKNOWN: '#5A708A' } as const
const LABEL = { OK: '정상', WARN: '주의', FAIL: '장애', UNKNOWN: '실측 대기' } as const
type V = keyof typeof COLOR

interface Def {
  seq: number
  host: string
  confirmed: boolean
  name: string
  short: string
  ip: string
  net: string
  mode: 'SNMP' | 'DIRECT' | 'INDIRECT'
  shape: string
  rackU: number
  keyLabel: string
  verdict: V
  uptime: number | null
  key: [string | null, string | null, V | null]
  res: [string, string, number | null, string | null][]
  conn?: string
  last?: string
  thru?: string
}

const NET: Def['res'] = [
  ['SYSTEM_DISK', '시스템디스크', 12, null],
  ['MEMORY', '메모리', 31, null],
  ['CPU', 'CPU', 4.2, '0.7/16코어'],
  ['NETWORK', '네트워크', 0.3, '1G 대비'],
]
const DATA: Def['res'] = [
  ['SYSTEM_DISK', '시스템디스크', 2, null],
  ['MEMORY', '메모리', 3, null],
  ['CPU', 'CPU', 0.2, '0.1/48코어'],
  ['DATA_DISK', '데이터디스크', 0, null],
]
const NONE: Def['res'] = NET.map(([k, l]) => [k, l, null, null])

const DEFS: Def[] = [
  { seq: 1, host: 'fw-ngf1510', confirmed: false, name: '(보안) 방화벽', short: '(보안) 방화벽', ip: '192.0.2.195/24', net: '재난플랫폼망', mode: 'SNMP', shape: 'A', rackU: 1, keyLabel: '차단 24시간', verdict: 'OK', uptime: 99.5, key: ['0건', '평소 기록 없음', 'OK'],
    res: [['LOG_SSD', '로그SSD', 0, '0G/1000G'], ['MEMORY', '메모리', 38, '6.1G/15.7G'], ['CPU', 'CPU', 1.3, '10코어'], ['SESSION', '세션', 0, '33/800만']] },
  { seq: 2, host: 'sw-sg2428gx', confirmed: false, name: '(통신) 스위칭 허브', short: '(통신) 스위칭 허브', ip: '192.0.2.7/24', net: '재난플랫폼망', mode: 'SNMP', shape: 'B', rackU: 1, keyLabel: '트래픽 · 에러 포트', verdict: 'OK', uptime: 59.3, key: ['0.0Gbps', '에러 포트 0', 'OK'],
    res: [['LOAD', 'CPU', null, '부하 11.8'], ['MEMORY', '메모리', 15.3, '0.3G/2G'], ['PORT_USAGE', '포트', 60.7, '17/28'], ['BANDWIDTH', '대역폭', 0.1, '0/16.1Gbps']] },
  { seq: 3, host: 'dbsvr', confirmed: true, name: '(저장) 데이터베이스', short: '(저장) 데이터베이스', ip: '192.0.2.152/24', net: '재난플랫폼망', mode: 'DIRECT', shape: 'C', rackU: 2, keyLabel: '디스크 · 마지막 저장', verdict: 'OK', uptime: 50.2, key: ['2%', '22:41 저장', 'OK'], res: DATA,
    conn: '4대 접속 — 대시보드(.103) 12 · IoT(.104) 5 · 솔루션(.102) 3 · GIS(.101) 2', last: '마지막 저장 22:41 — 지진 · CCTV · 급경사지', thru: '127테이블 · 오늘 증가 21,240행' },
  { seq: 4, host: 'allcontsvr', confirmed: true, name: '(운영) 솔루션', short: '(운영) 솔루션', ip: '192.0.2.93/24', net: '재난플랫폼망', mode: 'DIRECT', shape: 'D', rackU: 2, keyLabel: '서비스 응답 · OMS', verdict: 'OK', uptime: 96.4, key: ['정상', 'oms 실행 중', 'OK'], res: NET,
    conn: '2대 접속 — 데이터베이스(.100) 8 · 대시보드(.103) 2', last: 'OMS 실행 중 · 10-02 09:13부터', thru: '오늘 받음 1.2GB · 보냄 340.0MB' },
  { seq: 5, host: 'contsvr', confirmed: true, name: '(운영) 대시보드', short: '(운영) 대시보드', ip: '192.0.2.124/24', net: '재난플랫폼망', mode: 'DIRECT', shape: 'D', rackU: 2, keyLabel: '재난 서비스 6종', verdict: 'OK', uptime: 45.1, key: ['6 / 6', '정상 구동', 'OK'], res: NET,
    conn: '3대 접속 — 데이터베이스(.100) 12 · GIS(.101) 4 · 내부(.106) 1', last: '마지막 수신 22:41 — 지진 · CCTV', thru: '오늘 수신 21,240건' },
  { seq: 6, host: 'iotplatsvr', confirmed: true, name: '(운영) IoT', short: '(운영) IoT', ip: '192.0.2.152/24', net: '재난플랫폼망', mode: 'DIRECT', shape: 'E', rackU: 2, keyLabel: '마지막 센서 수신', verdict: 'OK', uptime: 96.4, key: ['22:41', '1분 전', 'OK'], res: NET,
    conn: '1대 접속 — 데이터베이스(.100) 5', thru: '오늘 받음 320.4MB · 보냄 41.2MB' },
  { seq: 7, host: 'gissvr', confirmed: true, name: '(운영) GIS', short: '(운영) GIS', ip: '192.0.2.47/24', net: '재난플랫폼망', mode: 'DIRECT', shape: 'C', rackU: 2, keyLabel: '서비스 응답 · GEOMEX', verdict: 'WARN', uptime: 96.4, key: ['정상', 'geomex 실행 중', 'OK'],
    res: [['SYSTEM_DISK', '시스템디스크', 41, null], ['MEMORY', '메모리', 83, null], ['CPU', 'CPU', 12, '1.9/16코어'], ['DATA_DISK', '데이터디스크', null, null]],
    conn: '2대 접속 — 데이터베이스(.100) 2 · 대시보드(.103) 4', last: 'GEOMEX 실행 중 · 10-02 09:20부터', thru: '오늘 받음 2.4GB · 보냄 5.1GB' },
  { seq: 8, host: 'vodrelaysvr', confirmed: true, name: '(연계) CCTV', short: '(연계) CCTV', ip: '192.0.2.72/24', net: '재난플랫폼망', mode: 'DIRECT', shape: 'E', rackU: 2, keyLabel: '현재 송출 채널', verdict: 'OK', uptime: 62.0, key: ['12', '채널', 'OK'], res: NET,
    conn: '1대 접속 — 대시보드(.103) 12', last: 'AthenaAPISvr 실행 중 · 08-22 10:02부터', thru: '오늘 받음 18.2GB · 보냄 17.9GB' },
  { seq: 9, host: 'intlinksvr', confirmed: true, name: '(연계) 프록시', short: '(연계) 내부', ip: '192.0.2.179/24', net: '재난플랫폼망', mode: 'DIRECT', shape: 'F', rackU: 1, keyLabel: '마지막 중계 · 기관 4곳', verdict: 'OK', uptime: 96.4, key: ['22:41', '4곳 정상', 'OK'], res: NET,
    conn: '3대 접속 — 대시보드(.103) 6 · CCTV(.105) 2 · 외부(.80) 1', last: 'nginx 실행 중 · 10-02 09:13부터', thru: '오늘 받음 840.2MB · 보냄 1.1GB' },
  { seq: 10, host: 'SecureGate-XDP-IN', confirmed: false, name: '(망연계) 내부측 #1', short: '(연계) 내부망', ip: '192.0.2.50/24', net: '재난플랫폼망', mode: 'DIRECT', shape: 'F', rackU: 1, keyLabel: '마지막 연계 전송 · ↔ 11', verdict: 'UNKNOWN', uptime: null, key: [null, null, null], res: NONE },
  { seq: 11, host: 'SecureGate-XDP-OUT', confirmed: false, name: '(망연계) 외부측 #2', short: '(연계) 외부망', ip: '192.0.2.53/24', net: '행정망', mode: 'INDIRECT', shape: 'F', rackU: 1, keyLabel: '마지막 연계 전송 · ↔ 10', verdict: 'UNKNOWN', uptime: null, key: [null, null, null], res: NONE },
  { seq: 12, host: 'extlinksvr', confirmed: true, name: '(연계) 관제·외부', short: '(연계) 외부', ip: '192.0.2.163/24', net: '관제망', mode: 'DIRECT', shape: 'F', rackU: 1, keyLabel: '외부 기관 수신 · 5곳', verdict: 'UNKNOWN', uptime: null, key: [null, null, null], res: NONE },
  { seq: 13, host: 'bungyisvr', confirmed: true, name: '(전파) 상황전파메신저', short: '(전파) 상황전파', ip: '192.0.2.87/24', net: '행정망', mode: 'INDIRECT', shape: 'G', rackU: 1, keyLabel: '마지막 부엉이 수신', verdict: 'OK', uptime: null, key: ['20:46', '2시간 전', 'WARN'], res: NONE,
    last: '마지막 수신 20:46 — 부엉이 (3번 DB 기록)', thru: '오늘 수신 12건 (3번 DB 기록)' },
]

const uptimeText = (d: number | null) => (d == null ? '실측 대기' : d < 1 ? `가동 ${Math.round(d * 24)}시간` : `가동 ${Math.floor(d)}일`)
const nowIso = () => new Date().toISOString()
const kst = () => new Date(Date.now() + 9 * 3600_000).toISOString().replace('Z', '+09:00')

const card = (s: Def) => ({
  seq: s.seq,
  host: s.host,
  shortName: s.short,
  verdict: s.verdict,
  verdictLabel: LABEL[s.verdict],
  color: COLOR[s.verdict],
  directDot: s.mode !== 'INDIRECT',
  subLine: s.mode === 'INDIRECT' ? '행정망 · 간접 확인' : s.verdict === 'UNKNOWN' ? uptimeText(s.uptime) : `${uptimeText(s.uptime)} · 응답 정상`,
  keyLabel: s.keyLabel,
  keyValue: s.key[0],
  keyAux: s.key[1],
  keyVerdict: s.key[2],
})

export function overview() {
  const n = (v: V) => DEFS.filter((s) => s.verdict === v).length
  return { counts: { ok: n('OK'), warn: n('WARN'), fail: n('FAIL'), pending: n('UNKNOWN'), total: DEFS.length }, lastSync: nowIso(), cards: DEFS.map(card) }
}

export const rackSlots = () => DEFS.map((s) => ({ seq: s.seq, host: s.host, name: s.short, shape: s.shape, rackU: s.rackU, verdict: s.verdict, color: COLOR[s.verdict], directDot: s.mode !== 'INDIRECT' }))

const ledgerOf = (s: Def) => ({
  seq: s.seq, name: s.name, host: s.host, hostConfirmed: s.confirmed, ip: s.ip, networkName: s.net, manager: s.net === '행정망' ? '울산시 정보화담당' : '남구 전산',
  model: s.seq === 1 ? 'SECUI BLUEMAX NGF 1510' : s.seq === 2 ? 'SubGate SG2428GX' : 'RE2208-P3', itemId: '25593542', serialNo: s.seq === 1 ? 'JTQ2UA01T0006' : null, introDate: null,
  vendor: s.seq === 1 ? '㈜시스원' : s.seq >= 10 && s.seq <= 11 ? '한싹 ' : null, vendorTel: s.seq === 2 ? '' : null,
  note: s.seq === 1 ? 'HA 미구성 — 이중화 계획 회신 요망' : null, maker: null, setName: s.seq === 10 ? 'SecureGate 1조 · 내부측' : null, measureMode: s.mode,
})
const specOf = (s: Def) => ({
  seq: s.seq, name: s.name, host: s.host, ip: s.ip,
  os: s.seq === 1 ? 'secuiOS' : s.seq === 2 ? 'SubGate OS v2.1.4' : 'Ubuntu 24.04.4 LTS', kernel: s.seq > 2 ? '6.8.0-85-generic' : null,
  cpuMeasured: s.seq > 2 ? 'Xeon Silver 4510 ×2' : null, cpuSpec: s.seq > 2 ? 'Xeon Silver 4410Y ×2' : null, socketsCores: s.seq > 2 ? '2 / 24C 48T' : null,
  ramMeasured: s.seq === 1 ? '16GB' : s.seq === 2 ? '2GB' : '64GB', ramSpec: s.seq > 2 ? '64GB' : null,
  storageLogical: s.seq > 2 ? '/ 446GB · /data 7.3TB' : null, storagePhysical: s.seq > 2 ? 'SSD 480GB ×2 · HDD 8TB ×2' : null, raid: s.seq > 2 ? 'RAID1' : null,
  nic: s.seq > 2 ? 'GbE ×2 (bond0)' : null, power: s.seq === 2 ? '단일 PSU' : '1200W ×2', apps: null, backup: null, note: null,
})
export const ledger = () => DEFS.map(ledgerOf)
export const specs = () => DEFS.map(specOf)

export function detail(host: string) {
  const s = DEFS.find((x) => x.host === host)
  if (!s) return null
  const c = card(s)
  return {
    seq: s.seq, host: s.host, hostConfirmed: s.confirmed, name: s.name, shortName: s.short, ip: s.ip, networkName: s.net, measureMode: s.mode,
    verdict: s.verdict, verdictLabel: LABEL[s.verdict], uptimeText: s.uptime == null ? null : uptimeText(s.uptime),
    resources: s.res.map(([kind, label, pct, detailText]) => {
      const judged = !['SESSION', 'LOAD', 'PORT_USAGE'].includes(kind)
      const v: V | null = !judged ? null : pct == null ? 'UNKNOWN' : pct >= 90 ? 'FAIL' : pct >= 80 ? 'WARN' : 'OK'
      return { kind, label, pct, detail: detailText, warnPct: judged ? 80 : null, failPct: judged ? 90 : null, judged, verdict: v, color: v ? COLOR[v] : '#4DA3FF' }
    }),
    keyLabel: c.keyLabel, keyValue: c.keyValue, keyAux: c.keyAux, keyVerdict: c.keyVerdict,
    lastActivityText: s.last ?? null, lastActivityVerdict: s.last ? 'OK' : null,
    connectionText: s.conn ?? null, connectionVerdict: s.conn ? 'OK' : null, throughputText: s.thru ?? null,
    measuredAt: s.verdict === 'UNKNOWN' ? null : nowIso(), collectedAt: nowIso(), source: s.mode, staleness: 'OK',
    reasons: s.verdict === 'WARN' ? ['메모리 83% (주의 80%)'] : [], ledger: ledgerOf(s), spec: specOf(s),
  }
}

const row = (item: string, content: string | null, state: string | null, verdict: V | null, usage: string | null, source = '수기항목 엑셀 10-16') => ({ item, content, state, verdict, usage, source })
export function parts(host: string) {
  const s = DEFS.find((x) => x.host === host)
  if (!s) return null
  if (s.seq === 1) return { host, measuredAt: null, front: [], rear: [row('PSU1', '상시 전원', '공급 중', null, null), row('PSU2', 'UPS 전원', '공급 중', null, null)] }
  if (s.seq === 2 || s.seq >= 10) return { host, measuredAt: null, front: [], rear: [] }
  const read = '서버에서 읽음'
  return {
    host,
    measuredAt: nowIso(),
    front: [
      row('전원 버튼', '좌 이어', '사용', null, null), row('ID 버튼', '장비 식별', '사용 안 함', null, null), row('리셋 버튼', '리셋', '사용 안 함', null, null),
      row('LED1', '디스크 작동', null, null, null), row('LED2', '장애 램프', null, null, null), row('LED3', '네트워크 작동', null, null, null),
      row('sda', 'SSD 480.1GB', '장착', 'OK', '7.6GB / 446.6GB', read), row('sdb', 'HDD 8.0TB', '장착', 'OK', '28.0KB / 7.3TB', read),
    ],
    rear: [
      row('PSU1', 'UPS 전원', null, null, null), row('PSU2', '상시 전원', null, null, null), row('VGA', null, '사용 안 함', null, null), row('COM', null, '사용 안 함', null, null), row('BMC', null, '사용 안 함', null, null),
      row('eno3', 'bond0 묶음', '연결됨', 'OK', '받음 30.2GB · 보냄 36.1GB', read), row('eno4', 'bond0 묶음', '연결됨', 'OK', '받음 76.9GB · 보냄 12.4GB', read), row('eno1', null, '연결 안 됨', 'UNKNOWN', null, read),
    ],
  }
}

// ── 1번 방화벽 ──
export const firewallSummary = () => ({
  collectedAt: kst(), uptimeDays: 99, restartedAt: new Date(Date.now() - 99.5 * 86400_000).toISOString(), rttMs: 35, sessionCnt: 33, cpuPct: 0.6, memPct: 38, cpuTempC: 35.0, fanRpm: [5491, 6874, 6221, 5682],
  policyCount: 3, allowCount: 2, policyChangedAt: null, policyStatus: '유지', blockedLast24h: 0, blockedBaseline: 0, blockedRatio: null, blockedVerdict: 'OK', alertsLast24h: 0, psuStatus: '공급 중', powerSwitch: 'ON',
})
export function firewallBlocks(range: string) {
  const n = range === '7d' ? 7 : 24
  const step = range === '7d' ? 86400_000 : 3600_000
  const end = Math.floor(Date.now() / step) * step
  const points = Array.from({ length: n }, (_, i) => {
    const count = i < n - 2 ? 0 : 2 + i - (n - 2)
    return { at: new Date(end - (n - i) * step).toISOString(), count, value: range === '7d' ? count : count * 24 }
  })
  return { range, baseline: 0, warn: 0, fail: 0, points }
}
export const firewallBlockTypes = () => [
  { tag: 'fw4_deny', label: 'IPv4 차단', count: 0 },
  { tag: 'fw6_deny', label: 'IPv6 차단', count: 0 },
  { tag: 'threat', label: '위협', count: 0 },
]
const FW_PORTS: [string, string, string, string | null, string | null][] = [
  ['MGMT', 'mgmt0', 'unknown', '관리', null], ['HA1', 'eth1', 'unknown', 'HA 미구성', null], ['HA2', 'eth2', 'unknown', 'HA 미구성', null],
  ...Array.from({ length: 8 }, (_, i): [string, string, string, string | null, string | null] => [`UTP${i + 1}`, `eth${111 + i}`, i === 0 ? 'external' : 'unknown', i === 0 ? '관제센터 백본' : null, null]),
  ['SFP1', 'eth121', 'internal', null, null], ['SFP2', 'eth122', 'unknown', '내부 L2스위치', '스위칭 허브'], ['SFP3', 'eth123', 'unknown', null, null], ['SFP4', 'eth124', 'unknown', null, null],
]
export const firewallPorts = () => FW_PORTS.map(([label, ifName, zone, usage, peer]) => {
  const up = ifName === 'eth111' || ifName === 'eth121'
  return { label, ifName, zone, usage, peer, linkUp: up, speed: up ? '1Gbps' : null, inBps: up ? (ifName === 'eth111' ? 3_700_000 : 38_000) : null, outBps: up ? (ifName === 'eth111' ? 36_000 : 3_700_000) : null }
})
export const firewallEvents = (limit: number) =>
  Array.from({ length: Math.min(limit, 4) }, (_, i) => ({ at: new Date(Date.now() - i * 600_000).toISOString(), tag: 'audit', body: '', summary: i === 0 ? 'admin(192.0.2.146) · 정책 · 조회 · 성공' : `admin(192.0.2.146) · 로그 · 조회 · 성공` }))

// ── 2번 스위치 ──
export const switchSummary = () => ({
  collectedAt: kst(), uptimeDays: 59, restartedAt: new Date(Date.now() - 59.3 * 86400_000).toISOString(), rttMs: 4, load1m: 11.79, memPct: 15,
  portsUp: 17, portsTotal: 28, errorPorts: [], trafficGbps: 0.0049, broadcastPct: 0.4, broadcastHigh: false, powerStatus: '결선',
})
export function switchTraffic(range: string) {
  const n = range === '7d' ? 7 : 24
  const step = range === '7d' ? 86400_000 : 3600_000
  const end = Math.floor(Date.now() / step) * step
  return {
    range,
    baselineGbps: 0.005,
    points: Array.from({ length: n }, (_, i) => ({ at: new Date(end - (n - i) * step).toISOString(), gbps: i < n - 3 ? null : 0.004 + (i % 3) * 0.001, maxRttMs: 4, rttLevel: 'WARN', maxBroadcastPct: 0.5, broadcastHigh: false })),
  }
}
const SW_HOST: Record<number, string> = { 2: 'dbsvr', 4: 'allcontsvr', 6: 'contsvr', 8: 'iotplatsvr', 10: 'gissvr', 12: 'vodrelaysvr', 14: 'intlinksvr' }
export const switchPorts = () => [
  ...Array.from({ length: 24 }, (_, i) => {
    const n = i + 1
    const up = n <= 14 || n === 23 || n === 24
    return { ifName: `ge${n}`, label: `P${n}`, host: SW_HOST[n] ?? null, note: null, linkUp: up, speedMbps: up ? (n === 23 ? 100 : 1000) : null, inBps: up ? 200_000 + n * 3000 : 0, outBps: up ? 180_000 + n * 2000 : 0, errors: 0, macs: [], unknownMacs: [] }
  }),
  ...Array.from({ length: 4 }, (_, i) => ({ ifName: `xe${i + 1}`, label: `SFP${i + 1}`, host: i === 0 ? 'fw-ngf1510' : null, note: null, linkUp: i === 0, speedMbps: i === 0 ? 10000 : null, inBps: i === 0 ? 3_700_000 : 0, outBps: i === 0 ? 3_600_000 : 0, errors: 0, macs: [], unknownMacs: [] })),
]
export const switchEvents = () => [] as { at: string; port: string; kind: string; summary: string }[]
