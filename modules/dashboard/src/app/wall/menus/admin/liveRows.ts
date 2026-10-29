// 전면·후면 표 줄에 서버 값 덮기 — 줄 이름·순서·장착 내용·상태는 디자인(규격서·사진 기준, 표 아래 안내 문구) 그대로 두고,
//   서버가 같은 항목을 주면 그 값으로 바꾼다. 사용/용량·트래픽은 실시간 값이라 서버가 안 주면 '-' (사용자 10-23).
//   서버 항목 ↔ 디자인 줄: 이름이 같거나 앞이 같으면 (LED1 → 'LED1 전원'), 디스크(sda…)는 같은 종류(SSD·HDD)가 적힌 장착 BAY 먼저 · 없으면 장착 BAY 순서,
//   연결된 랜(eno…)은 LAN 순서. 디스크·랜은 장착 내용·연결 상대를 디자인 그대로 두고(케이블 태그·규격서) 상태·사용량만 바꾼다
import type { FirewallPort, PartRow, ServerCard, SwitchPort, Verdict } from './api'
import type { PortRow } from './FirewallFront'
import { bps, NONE } from './view'

const TONE: Record<Verdict, PortRow['tone']> = { OK: 'ok', WARN: 'warn', FAIL: 'warn', UNKNOWN: 'idle' }

/** 서버 항목 이름 → 디자인 줄 이름 앞부분 (수기 엑셀 이름이 디자인과 다른 것) */
const ALIAS: Record<string, string> = { '리셋 버튼': 'RST', BMC: 'Mgmt' }
const DISK = /^(sd[a-z]+|nvme\d)/
const NIC = /^(en|eth)/

const sameItem = (rowName: string, item: string) => {
  const key = ALIAS[item] ?? item
  return rowName === key || rowName.startsWith(`${key} `) || rowName.startsWith(`${key}(`) || rowName.startsWith(`${item} (`) || rowName.endsWith(`(${key})`)
}

/** 랜 상태 글 → 표의 다른 줄과 같은 말 */
const LINK: Record<string, string> = { 연결됨: '결선', '연결 안 됨': '미결선' }

/** 디스크·랜 — 상태·사용량만 */
const withMeasured = (r: PortRow, p: PartRow): PortRow => ({ ...r, state: p.state ? (LINK[p.state] ?? p.state) : r.state, tone: p.verdict ? TONE[p.verdict] : r.tone, usage: p.usage ?? NONE })

const kindOf = (p: PartRow) => /SSD|HDD|NVMe/i.exec(p.content ?? '')?.[0].toUpperCase()

const withPart = (r: PortRow, p: PartRow): PortRow => ({
  ...r,
  mount: p.content ?? r.mount,
  used: p.content ? true : r.used,
  state: p.state ?? r.state,
  tone: p.verdict ? TONE[p.verdict] : r.tone,
  usage: p.usage ?? NONE,
})

/** 랙 서버 표 (3~13번) — /servers/{host}/parts 의 front 또는 rear */
export function partRows(design: PortRow[][], live: readonly PartRow[] | undefined): PortRow[][] {
  const named = new Map<string, PartRow>()
  const disks: PartRow[] = []
  const nics: PartRow[] = []
  for (const p of live ?? []) {
    if (DISK.test(p.item)) disks.push(p)
    else if (NIC.test(p.item)) {
      if (p.verdict === 'OK') nics.push(p)
    } else named.set(p.item, p)
  }
  // 디스크 → BAY 자리 먼저 정함 (종류가 맞는 칸 먼저)
  const bays = design.flat().filter((r) => r.name.startsWith('BAY') && r.used)
  const diskOf = new Map<string, PartRow>()
  for (const d of disks) {
    const free = bays.filter((b) => !diskOf.has(b.name))
    const k = kindOf(d)
    const at = (k && free.find((b) => b.mount.toUpperCase().includes(k))) ?? free[0]
    if (at) diskOf.set(at.name, d)
  }
  return design.map((g) =>
    g.map((r) => {
      for (const [item, p] of named) if (sameItem(r.name, item)) return withPart(r, p)
      const disk = diskOf.get(r.name)
      if (disk) return withMeasured(r, disk)
      if (r.name.startsWith('LAN') && nics.length) return withMeasured(r, nics.shift()!)
      return { ...r, usage: NONE }
    }),
  )
}

const traffic = (up: boolean, inBps: number | null, outBps: number | null) => (up ? `${bps(inBps)} / ${bps(outBps)}` : NONE)

/** 방화벽 전면 표 — /firewall/ports (디자인 '0/MGMT' = 서버 'MGMT'). 포트가 아닌 줄(LED · USB · CONSOLE)은 디자인 그대로 */
export function firewallRows(design: PortRow[][], ports: readonly FirewallPort[]): PortRow[][] {
  const by = new Map(ports.map((p) => [p.label, p]))
  return design.map((g) =>
    g.map((r) => {
      const p = by.get(r.name.replace(/^0\//, ''))
      if (!p) return { ...r, usage: NONE }
      const mount = p.peer ? `→ ${p.peer}` : (p.usage ?? '—')
      return { ...r, mount, used: p.linkUp || !!p.peer || !!p.usage, state: p.linkUp ? '결선' : '미결선', tone: p.linkUp ? 'ok' : 'idle', usage: traffic(p.linkUp, p.inBps, p.outBps) }
    }),
  )
}

/** 스위칭 허브 전면 표 — /switch/ports. 연결 상대는 서버 host 를 카드 이름으로 ('← 3 (저장) 데이터베이스'), 에러가 있으면 노랑 */
export function switchRows(design: PortRow[][], ports: readonly SwitchPort[], cards: readonly ServerCard[] | undefined): PortRow[][] {
  const by = new Map(ports.map((p) => [p.label, p]))
  const nameOf = (host: string) => {
    const c = cards?.find((x) => x.host === host)
    return c ? `${c.seq} ${c.shortName}` : host
  }
  return design.map((g) =>
    g.map((r) => {
      const p = by.get(r.name)
      if (!p) return { ...r, usage: NONE }
      const mount = p.host ? `← ${nameOf(p.host)}` : (p.note ?? '—')
      const state = p.errors > 0 ? `에러 ${p.errors}` : p.linkUp ? '결선' : '미결선'
      const tone = p.errors > 0 ? 'warn' : p.linkUp ? 'ok' : 'idle'
      return { ...r, mount, used: p.linkUp || !!p.host, state, tone, usage: traffic(p.linkUp, p.inBps, p.outBps) }
    }),
  )
}
