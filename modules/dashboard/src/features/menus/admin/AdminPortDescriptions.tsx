import './AdminPortDescriptions.css'
import { useFirewallPorts } from './useFirewallPorts'
import type { FirewallPort } from '@/api/adminServer'
import { formatTrafficMbps } from './formatTrafficMbps'

interface PortRow {
  port: string
  purpose: string
  status: string
  traffic?: { down: string; up: string }
}

// 표의 줄 순서는 장비 전면 그대로. 값은 GET /server/api/firewall/ports 에서 라벨로 찾아 채운다.
//   CONSOLE·USB1·USB2 는 수집 대상이 아니라 API 에 없다 — 이름만 두고 값은 '-'.
const LEFT_LABELS = ['CONSOLE', 'MGMT', 'HA1', 'HA2', 'UTP1', 'UTP2', 'UTP3', 'USB1', 'USB2']
const RIGHT_LABELS = ['SFP4', 'UTP4', 'UTP5', 'UTP6', 'UTP7', 'UTP8', 'SFP1', 'SFP2', 'SFP3']

/** bps → 표에 쓰는 짧은 값. */
function rate(bps: number | null): string | null {
  if (bps === null) return null
  return formatTrafficMbps(bps)
}

function toRow(label: string, port: FirewallPort | undefined): PortRow {
  if (!port) return { port: label, purpose: '-', status: '-' }
  const usage = [port.usage, port.peer].filter(Boolean).join(' · ')
  // 수집 전에는 speed 가 null — linkUp(false)을 '연결 끊김' 으로 읽지 않는다.
  const speed = port.speed?.replace(/\s*(?:[kmg]?bps|[kmg]?bit\/s)\s*$/i, '').trim()
  const status = port.speed === null ? '-' : port.linkUp ? `Up ${speed}`.trim() : '미연결'
  const down = rate(port.inBps)
  const up = rate(port.outBps)
  return {
    port: label === 'MGMT' ? '0(MGMT)' : label,
    purpose: usage || '-',
    status,
    traffic: down !== null && up !== null ? { down, up } : undefined,
  }
}

function TrafficValue({ direction, value }: { direction: 'down' | 'up'; value: string }) {
  return (
    <span className={`admin-port-traffic-value is-${direction}`}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d={direction === 'down' ? 'M11 2H1L6 10L11 2Z' : 'M11 10H1L6 2L11 10Z'} fill={direction === 'down' ? '#0091FF' : '#FFD600'} />
      </svg>
      <span className="sr-only">{direction === 'down' ? '수신 ' : '송신 '}</span>
      {value}
    </span>
  )
}

function PortTable({ rows, label, right = false }: { rows: PortRow[]; label: string; right?: boolean }) {
  return (
    <div className={`admin-port-table${right ? ' is-right' : ''}`} role="table" aria-label={label}>
      <div className="admin-port-table-header" role="row">
        <span className="admin-port-col-name" role="columnheader">포트</span>
        <span className="admin-port-col-purpose" role="columnheader">용도·연결 상대</span>
        <span className="admin-port-col-status" role="columnheader">상태(Gbps)</span>
        <span className="admin-port-col-traffic" role="columnheader">트래픽(Mbps)</span>
      </div>
      {rows.map(({ port, purpose, status, traffic }) => (
        <div className={`admin-port-table-row${traffic ? ' has-traffic' : ''}${status === '미사용' || status === '미구성' ? ' is-idle' : ''}`} role="row" key={port}>
          <span className="admin-port-col-name" role="rowheader">{port}</span>
          <span className="admin-port-col-purpose" role="cell" title={purpose}>{purpose}</span>
          <span className="admin-port-col-status" role="cell">{status}</span>
          <span className="admin-port-col-traffic" role="cell">
            {traffic && <>
              <TrafficValue direction="down" value={traffic.down} />
              <TrafficValue direction="up" value={traffic.up} />
            </>}
          </span>
        </div>
      ))}
    </div>
  )
}

export function AdminPortDescriptions() {
  const ports = useFirewallPorts()
  const byLabel = new Map(ports.map((p) => [p.label, p]))
  const rows = (labels: string[]) => labels.map((label) => toRow(label, byLabel.get(label)))
  return (
    <div className="admin-port-descriptions">
      <PortTable rows={rows(LEFT_LABELS)} label="왼쪽 포트 설명" />
      <PortTable rows={rows(RIGHT_LABELS)} label="오른쪽 포트 설명" right />
    </div>
  )
}
