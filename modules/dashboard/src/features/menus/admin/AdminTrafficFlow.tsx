import './AdminTrafficFlow.css'
import { useFirewallPorts } from './useFirewallPorts'
import { useFirewallSummary } from './useFirewallSummary'
import { useDevices } from './useDevices'
import { formatTrafficMbps } from './formatTrafficMbps'

/** bps → Mbps 표시. 수집 전에는 null 이라 '-'. */
function mbps(bps: number | null | undefined) {
  return formatTrafficMbps(bps)
}

// 외부(UTP1) · 내부(SFP1) 포트 트래픽과 summary 차단 건수, 장비 대수.
export function AdminTrafficFlow() {
  const ports = useFirewallPorts()
  const summary = useFirewallSummary()
  const devices = useDevices()
  const external = ports.find((p) => p.label === 'UTP1')
  const internal = ports.find((p) => p.label === 'SFP1')
  return (
    <div className="admin-traffic-flow" aria-label="외부망에서 방화벽을 거쳐 내부망으로 이어지는 트래픽 흐름">
      <div className="admin-traffic-flow-box">
        <div className="admin-traffic-flow-title">외부 · DMZ</div>
        <div className="admin-traffic-flow-description">공공API · 기상 · CCTV</div>
      </div>
      <div className="admin-traffic-flow-rates">
        <span className="admin-traffic-flow-unit">Mbps</span>
        <div className="admin-traffic-flow-rate is-down">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M11 2H1L6 10L11 2Z" fill="#0091FF" />
          </svg>
          <span>수집 {mbps(external?.inBps)}</span>
        </div>
        <div className="admin-traffic-flow-rate is-up">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M11 10H1L6 2L11 10Z" fill="#FFD600" />
          </svg>
          <span>전파 {mbps(external?.outBps)}</span>
        </div>
      </div>
      <div className="admin-traffic-flow-box">
        <div className="admin-traffic-flow-title">방화벽 · 검사 중</div>
        <div className="admin-traffic-flow-description">
          차단 {summary?.collectedAt ? `${summary.blockedLast24h.toLocaleString()}건` : '-'}
        </div>
      </div>
      <div className="admin-traffic-flow-arrow">
        <span className="admin-traffic-flow-unit">Mbps</span>
        <svg width="52" height="8" viewBox="0 0 80 8" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <path d="M79.3536 4.03519C79.5488 3.83993 79.5488 3.52335 79.3536 3.32809L76.1716 0.146107C75.9763 -0.0491555 75.6597 -0.0491555 75.4645 0.146107C75.2692 0.341369 75.2692 0.657951 75.4645 0.853214L78.2929 3.68164L75.4645 6.51007C75.2692 6.70533 75.2692 7.02191 75.4645 7.21717C75.6597 7.41244 75.9763 7.41244 76.1716 7.21717L79.3536 4.03519ZM0 3.68164V4.18164H79V3.68164V3.18164H0V3.68164Z" fill="#1EA7FF" />
        </svg>
        <span>{mbps(internal?.inBps)}</span>
      </div>
      <div className="admin-traffic-flow-box">
        <div className="admin-traffic-flow-title">내부망 · 서버 {devices.length > 0 ? `${devices.length}대` : '-'}</div>
        <div className="admin-traffic-flow-description">통합 SW 경유</div>
      </div>
    </div>
  )
}
