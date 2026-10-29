import './AdminFrontPorts.css'
import { useFirewallPorts } from './useFirewallPorts'
import type { FirewallPort } from '@/api/adminServer'
import { AdminPortDescriptions } from './AdminPortDescriptions'
import { AdminTrafficFlow } from './AdminTrafficFlow'

function FrontPort({ name }: { name: string }) {
  return (
    <div className="admin-front-port">
      <span>{name}</span>
      <svg width="18" height="22" viewBox="0 0 18 22" fill="none" aria-hidden="true">
        <rect width="18" height="22" rx="1" fill="#E9EEF4" />
        <path d="M3 0H15V7H3Z" fill="#12283F" />
      </svg>
    </div>
  )
}

export function RackEar() {
  return (
    <div className="admin-front-ear" aria-hidden="true">
      <span />
      <span />
    </div>
  )
}

function FrontGridPort({ lit }: { lit: boolean }) {
  const hole = lit ? '#6CC860' : '#12151C'
  return (
    <svg width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden="true">
      <rect width="16" height="20" rx="1" fill="#E9EEF4" />
      <rect x="3" width="10" height="6" fill={hole} />
      <rect x="3" y="8" width="10" height="9" fill={hole} />
    </svg>
  )
}

// 8구 격자 — 위 줄 UTP5~8, 아래 줄 UTP1~4.
const GRID_LABELS = ['UTP5', 'UTP6', 'UTP7', 'UTP8', 'UTP1', 'UTP2', 'UTP3', 'UTP4']

function FrontPortGrid({ byLabel }: { byLabel: Map<string, FirewallPort> }) {
  return (
    <div className="admin-front-module admin-front-grid-module">
      <div className="admin-front-grid-indices" aria-hidden="true">
        {[5, 6, 7, 8].map((n) => <span key={n}>{n}</span>)}
      </div>
      <div className="admin-front-port-grid" aria-label="8개 포트">
        {GRID_LABELS.map((label) => <FrontGridPort key={label} lit={isUp(byLabel.get(label))} />)}
      </div>
      <div className="admin-front-grid-indices" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => <span key={n}>{n}</span>)}
      </div>
    </div>
  )
}

// 1G 4구 — SFP1~4.
const SFP_LABELS = ['SFP1', 'SFP2', 'SFP3', 'SFP4']

function FrontOneGigabit({ byLabel }: { byLabel: Map<string, FirewallPort> }) {
  return (
    <div className="admin-front-module admin-front-one-gigabit">
      <span className="admin-front-one-gigabit-label">1G</span>
      <div className="admin-front-one-gigabit-ports" aria-label="1G 포트 4개">
        {SFP_LABELS.map((label) => {
          const up = isUp(byLabel.get(label))
          return (
            <div className="admin-front-one-gigabit-pair" key={label}>
              <span className={`admin-front-one-gigabit-led${up ? ' is-on' : ''}`} />
              <span className={`admin-front-one-gigabit-port${up ? ' is-on' : ''}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FrontVent({ badge = false }: { badge?: boolean }) {
  return (
    <div className={`admin-front-module admin-front-vent${badge ? ' has-badge' : ''}`}>
      <div className="admin-front-vent-dots" aria-hidden="true">
        {[7, 6, 7, 6].map((count, row) => (
          <div className={`admin-front-vent-row${row % 2 ? ' is-offset' : ''}`} key={row}>
            {Array.from({ length: count }, (_, index) => <span key={index} />)}
          </div>
        ))}
      </div>
      {badge && <span className="admin-front-platform-badge">재난통합플랫폼 FW</span>}
    </div>
  )
}

// 전면 포트 퍼블리싱: 모든 부품의 크기와 배치를 정수 px로 맞춘다.
/** 연결됨 — 수집 전에는 speed 가 null 이라 linkUp(false)을 끊김으로 읽지 않는다. */
function isUp(port: FirewallPort | undefined) {
  return port !== undefined && port.speed !== null && port.linkUp
}
/** 전면 그림 — 치수선(438 mm · 44 mm) + 장비 앞면. /v2/wall 방화벽 상세도 같이 쓴다. */
export function FrontRackDrawing() {
  const byLabel = new Map(useFirewallPorts().map((p) => [p.label, p]))
  return (
    <div className="admin-front-rack-area">
      <svg className="admin-front-dimension-lines" width="618" height="80" viewBox="0 0 618 80" fill="#6F93B5" aria-hidden="true">
        {/* 1px 선과 8px 눈금 — 렌더링 좌표를 정수로 유지. */}
        <rect x="0" y="14" width="592" height="1" />
        <rect x="0" y="10" width="1" height="8" />
        <rect x="591" y="10" width="1" height="8" />
        <rect x="602" y="20" width="1" height="60" />
        <rect x="598" y="20" width="8" height="1" />
        <rect x="598" y="79" width="8" height="1" />
      </svg>
      <span className="admin-front-dimension-width">438 mm</span>
      <span className="admin-front-dimension-height">44 mm</span>
      <div className="admin-front-rack">
        <RackEar />
        <div className="admin-front-brand-block">
          <span className="admin-front-brand">SECUI</span>
          <div className="admin-front-controls">
            <div className="admin-front-tall" />
            <div className="admin-front-leds">
              <div className="admin-front-led-row">
                <span>PWR</span>
                <span className="admin-front-led" />
              </div>
              <div className="admin-front-led-row">
                <span>HDD</span>
                <span className="admin-front-led" />
              </div>
              <div className="admin-front-led-row">
                <span>RST</span>
                <span className="admin-front-reset" />
              </div>
            </div>
            <div className="admin-front-usbs">
              {['USB1', 'USB2'].map((name) => (
                <div className="admin-front-usb" key={name}>
                  <span>{name}</span>
                  <span className="admin-front-usb-slot" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* 왼쪽 랙의 SECUI처럼 아래 가로 2개 + 오른쪽 세로 2개. */}
        <div className="admin-front-ports">
          <div className="admin-front-ports-horizontal">
            <FrontPort name="CONSOLE" />
            <FrontPort name="0(MGMT)" />
          </div>
          <div className="admin-front-ports-vertical">
            <FrontPort name="HA1" />
            <FrontPort name="HA2" />
          </div>
        </div>
        <div className="admin-front-modules">
          <FrontPortGrid byLabel={byLabel} />
          <FrontOneGigabit byLabel={byLabel} />
          <FrontVent />
          <FrontVent badge />
        </div>
        <RackEar />
      </div>
    </div>
  )
}

export function AdminFrontPorts() {
  return (
    <section className="admin-front-panel" aria-labelledby="admin-front-title">
      <header className="admin-front-header">
        <h2 id="admin-front-title">전면 · 포트 구성</h2>
      </header>
      <div className="admin-front-body">
        <FrontRackDrawing />
        <AdminPortDescriptions />
        <AdminTrafficFlow />
      </div>
    </section>
  )
}
