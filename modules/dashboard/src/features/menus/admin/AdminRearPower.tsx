import { RackEar } from './AdminFrontPorts'
import './AdminRearPower.css'

function RearPowerUnit() {
  return (
    <svg width="41" height="41" viewBox="0 0 41 41" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#141D24" stroke="#3C4650" strokeWidth="2" />
      <g transform="translate(40 0) scale(-1 1)">
        <path d="M9 8C14 8 21 12 24 18L19 19C16 14 12 12 9 12Z" fill="#000" stroke="#2B333B" strokeWidth="1" />
        <path d="M17 23L22 22C25 27 29 29 32 29V33C27 33 20 29 17 23Z" fill="#000" stroke="#2B333B" strokeWidth="1" />
      </g>
      <circle cx="20" cy="20" r="5" fill="#3C4650" />
    </svg>
  )
}

function RearPsu({ number }: { number: number }) {
  return (
    <div className="admin-rear-psu" role="img" aria-label={`PSU${number} 전원 포트, 정상 표시 시안`}>
      <span className="admin-rear-psu-led" />
      <div className="admin-rear-psu-vents" aria-hidden="true">
        {Array.from({ length: 20 }, (_, i) => <span key={i} />)}
      </div>
      <span className="admin-rear-psu-socket" />
      <span className="admin-rear-psu-label">PSU{number}</span>
    </div>
  )
}

/** 후면 그림 — 치수선(438 mm · 44 mm) + 장비 뒷면. /v2/wall 방화벽 상세도 같이 쓴다.
 *  wide: /v2/wall 칸(748×82)에 맞춰 장비 몸통 592 → 722 로 가로만 늘린다 — 부품은 가로 위치·너비만 같은 비율(×1.22), 높이·원은 그대로 (사용자 10-22) */
export function RearRackDrawing({ wide = false }: { wide?: boolean }) {
  const w = wide ? 748 : 618
  const body = w - 26
  return (
    <div className={`admin-front-rack-area admin-rear-rack-area${wide ? ' admin-rear-wide' : ''}`}>
      <svg className="admin-front-dimension-lines" width={w} height="82" viewBox={`0 0 ${w} 82`} fill="#6F93B5" aria-hidden="true">
        <rect x="0" y="16" width={body} height="1" />
        <rect x="0" y="12" width="1" height="8" />
        <rect x={body - 1} y="12" width="1" height="8" />
        <rect x={body + 10} y="22" width="1" height="60" />
        <rect x={body + 6} y="22" width="8" height="1" />
        <rect x={body + 6} y="81" width="8" height="1" />
      </svg>
      <span className="admin-front-dimension-width admin-rear-dimension-width">438 mm</span>
      <span className="admin-front-dimension-height admin-rear-dimension-height">44 mm</span>
      <div className="admin-front-rack">
        <RackEar />
        <div className="admin-rear-power-background">
          <div className="admin-rear-power-units" aria-label="후면 원형 전원부 4개 시안">
            {[0, 1, 2, 3].map((index) => <RearPowerUnit key={index} />)}
          </div>
        </div>
        {/* 사용자 제공 시안의 장비 라벨. */}
        <div className="admin-rear-label">
          <span className="admin-rear-label-title">SECUI BLUEMAX NGF 1510</span>
          <span className="admin-rear-label-content">S/N: -</span>
          <span className="admin-rear-label-content">100-240V~ 50/60Hz</span>
          <span className="admin-rear-label-ce">CE</span>
        </div>
        <div className="admin-rear-power-button" role="img" aria-label="전원 버튼">
          <span>⏻</span>
        </div>
        <div className="admin-rear-psus">
          <RearPsu number={1} />
          <RearPsu number={2} />
        </div>
        <RackEar />
      </div>
    </div>
  )
}

export function AdminRearPower() {
  return (
    <section className="admin-rear-panel" aria-labelledby="admin-rear-title">
      <header className="admin-rear-header">
        <h2 id="admin-rear-title">후면 · 전원 (시안 · 상태 미연동)</h2>
      </header>
      <div className="admin-rear-content">
        <RearRackDrawing />
      </div>
    </section>
  )
}
