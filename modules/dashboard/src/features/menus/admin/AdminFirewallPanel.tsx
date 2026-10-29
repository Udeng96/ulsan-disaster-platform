import { useId, useRef, useState } from 'react'
import './AdminFirewallPanel.css'
import { AdminAssetPopup, type AssetLedgerField } from './AdminAssetPopup'
import { useFirewallSummary } from './useFirewallSummary'
import { useDevices } from './useDevices'
import { useFirewallEvents } from './useFirewallEvents'
import type { DeviceStatus, ServerDevice } from '@/api/adminServer'

/** 자산대장 — devices 응답 그대로. 값이 없는 항목은 팝업에서 '—'. */
function assetFields(device: ServerDevice | undefined): AssetLedgerField[] {
  return [
    { id: 'model', label: '모델명', value: device?.model ?? null },
    { id: 'manufacturer', label: '제조', value: device?.vendor ?? null },
    { id: 'serialNo', label: '제조번호', value: device?.serialNo ?? null },
    { id: 'ip', label: 'IP', value: device?.ip ?? null },
    { id: 'supplier', label: '공급', value: device?.supplier ?? null },
    { id: 'itemNo', label: '물품식별번호', value: device?.itemNo ?? null },
    {
      id: 'contractPrice',
      label: '계약가',
      value: device?.contractPrice == null ? null : `${device.contractPrice.toLocaleString()}원`,
    },
    { id: 'contractEnd', label: '계약종료', value: device?.contractEnd ?? null },
    { id: 'cpu', label: 'CPU', value: device?.cpu ?? null },
    { id: 'ram', label: 'RAM', value: device?.ram ?? null },
    { id: 'storage', label: '저장장치', value: device?.storage ?? null },
    { id: 'nic', label: 'NIC', value: device?.nic ?? null },
    { id: 'power', label: '전원', value: device?.power ?? null },
    { id: 'size', label: '크기', value: device?.sizeMm ?? null },
    { id: 'os', label: 'OS', value: device?.os ?? null },
  ]
}

/** [MM-DD HH:mm] */
function eventTime(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => `${n}`.padStart(2, '0')
  return `[${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}]`
}

/** MM-DD */
function shortDate(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(iso)
  return `${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`
}

/** 가동 상태 — devices 응답의 방화벽 status. */
const UPTIME_STATUS: Record<DeviceStatus, { key: string; label: string }> = {
  NORMAL: { key: 'normal', label: '정상' },
  WARN: { key: 'warn', label: '주의' },
  DOWN: { key: 'error', label: '장애' },
  UNKNOWN: { key: 'unknown', label: '확인 불가' },
}

// 유형별 내역은 아직 연동 전이라 비워 둔다.
const BLOCK_TYPES: { label: string; value: string }[] = []

function StatusBadge({ status }: { status: { key: string; label: string } }) {
  return (
    <div className={`admin-firewall-health is-${status.key}`}>
      <span className="admin-firewall-led" aria-hidden="true" />
      <span>{status.label}</span>
    </div>
  )
}

function ResourceGauge({ label, value }: { label: string; value: number | null }) {
  const pct = value === null ? 0 : Math.round(value)
  return (
    <div className="admin-firewall-gauge">
      <svg width="80" height="80" viewBox="0 0 80 80" role="img" aria-label={`${label} ${value === null ? '-' : `${pct}%`}`}>
        <circle cx="40" cy="40" r="35" fill="none" stroke="#1b4671" strokeWidth="6" />
        <circle cx="40" cy="40" r="35" fill="none" stroke="#42b8ff" strokeWidth="6"
          pathLength="100" strokeDasharray={`${pct} ${100 - pct}`} transform="rotate(-90 40 40)" />
        <text x="40" y="40" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="18" fontWeight="600">{value === null ? '-' : `${pct}%`}</text>
      </svg>
      <span>{label}</span>
    </div>
  )
}

// 가동·차단 건수(24h)·자원은 summary API 값. 차트·이전 기간 대비·7일·정책·이벤트·만료·운영도우미는 아직 시안 고정값.
export function AdminFirewallPanel() {
  const summary = useFirewallSummary()
  const firewall = useDevices().find((d) => d.code === 'firewall')
  const events = useFirewallEvents()
  const [period, setPeriod] = useState<'24h' | '7d'>('24h')
  const [activePopup, setActivePopup] = useState<'asset' | 'types' | null>(null)
  const assetOpen = activePopup === 'asset'
  const typeDetailsOpen = activePopup === 'types'
  const assetButtonRef = useRef<HTMLButtonElement>(null)
  const typeDetailsId = useId()
  const typeButtonRef = useRef<HTMLButtonElement>(null)
  const closeTypeDetails = () => {
    setActivePopup(null)
    typeButtonRef.current?.focus()
  }
  return (
    <section className="admin-firewall" aria-labelledby="admin-firewall-title">
      <header className="admin-firewall-header">
        <h2 id="admin-firewall-title">1. 방화벽 (Firewall)</h2>
        <div className="admin-firewall-description">
          최상단 장비 · 단일 구성(HA 미구성) · 장애 시 플랫폼 전체 통신 중단
        </div>
      </header>

      <div className="admin-firewall-uptime">
        <span className="admin-firewall-label">가동</span>
        <div className="admin-firewall-uptime-value">
          <span>
            {firewall?.status === 'DOWN'
              ? '현재 통신 안됨'
              : firewall?.status === 'UNKNOWN' ? '상태 확인 불가'
              : `${summary?.uptimeDays ?? '-'}일 연속 · 응답 ${summary?.rttMs == null ? '-' : `${summary.rttMs}ms`}`}
          </span>
        </div>
        {firewall && <StatusBadge status={UPTIME_STATUS[firewall.status]} />}
      </div>

      <div className="admin-firewall-blocks">
        <span className="admin-firewall-label">차단 현황</span>
        <div className="admin-firewall-blocks-content">
          <div className="admin-firewall-chart">
            <span style={{ fontSize: 11, color: '#aabac9' }}>차단 추이 · 시안</span>
            <svg viewBox="0 0 310 78" role="img" aria-label="차단 현황 차트 시안, 실제 데이터 아님">
              <g fontSize="10" fontFamily="Roboto" strokeWidth="0.7">
                <path d="M0 18H310" stroke="#ff4245" strokeDasharray="2 2" />
                <path d="M0 47H310" stroke="#ffd600" strokeDasharray="2 2" />
                <path d="M0 76H310" stroke="#45e36c" strokeDasharray="2 2" />
                <text x="0" y="12" fill="#ff4245">경계 360</text>
                <text x="0" y="41" fill="#ffd600">주의 240</text>
                <text x="0" y="70" fill="#45e36c">관심 120</text>
              </g>
              <path d="M42 75L68 75L93 73L119 69L146 63L172 56L198 50L224 46L250 44L277 44L310 42" fill="none" stroke="#1ea7ff" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="admin-firewall-blocks-summary">
            <div className="admin-firewall-periods" aria-label="조회 기간">
              <button type="button" className={period === '24h' ? 'is-active' : undefined} aria-pressed={period === '24h'} onClick={() => setPeriod('24h')}>24h</button>
              <button type="button" className={period === '7d' ? 'is-active' : undefined} aria-pressed={period === '7d'} onClick={() => setPeriod('7d')}>7일</button>
            </div>
            <div className="admin-firewall-blocks-details">
              <div className="admin-firewall-detail-line">
                <span>차단 건수</span><strong>{period === '24h' && summary?.collectedAt ? `${summary.blockedLast24h.toLocaleString()}건` : '-'}</strong>
              </div>
              <div className="admin-firewall-detail-line">
                <span>이전 기간 대비</span><strong>-</strong>
              </div>
              <div className="admin-firewall-type-anchor">
              <button ref={typeButtonRef} type="button" className="admin-firewall-type-button"
                aria-haspopup="dialog" aria-expanded={typeDetailsOpen} aria-controls={typeDetailsOpen ? typeDetailsId : undefined}
                onClick={() => setActivePopup((popup) => popup === 'types' ? null : 'types')}>
                <span>유형별 내역</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 11L9.5 7.5L6 4" stroke="white" strokeWidth="1.3125" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {typeDetailsOpen && (
                <section id={typeDetailsId} className="admin-firewall-type-popup" role="dialog" aria-labelledby={`${typeDetailsId}-title`}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') { event.stopPropagation(); closeTypeDetails() }
                  }}>
                  <header className="admin-firewall-type-popup-header">
                    <h3 id={`${typeDetailsId}-title`}>유형별 내역</h3>
                    <button type="button" autoFocus className="admin-firewall-type-popup-close" aria-label="유형별 내역 닫기" onClick={closeTypeDetails}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </header>
                  <div className="admin-firewall-type-popup-content">
                    {BLOCK_TYPES.map(({ label, value }) => (
                      <div className="admin-firewall-type-popup-row" key={label}>
                        <span className="admin-firewall-type-popup-label">{label}</span>
                        <span className="admin-firewall-type-popup-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="admin-firewall-policy">
        <span className="admin-firewall-label">정책</span>
        <div className="admin-firewall-policy-content">
          {summary && summary.policyCount > 0
            ? `정책 ${summary.policyCount}개 · 허용 ${summary.allowCount}개 · 최종 변경 ${shortDate(summary.policyChangedAt) ?? '-'}`
            : '-'}
        </div>
      </div>

      <div className="admin-firewall-events">
        <span className="admin-firewall-label">이벤트</span>
        <div className="admin-firewall-event-content">
          {events.map((e) => (
            <div className="admin-firewall-event-line" key={`${e.at}-${e.body}`}>
              <span className="admin-firewall-event-time">{eventTime(e.at)}</span>
              <span className="admin-firewall-event-text">{e.summary}</span>
            </div>
          ))}
        </div>
        <span className="admin-firewall-text-status">-</span>
      </div>

      <div className="admin-firewall-resources">
        <span className="admin-firewall-label">자원</span>
        <div className="admin-firewall-resource-charts">
          <ResourceGauge label="CPU" value={summary?.cpuPct ?? null} />
          <ResourceGauge label="메모리" value={summary?.memPct ?? null} />
        </div>
        <span className="admin-firewall-text-status">-</span>
      </div>

      <div className="admin-firewall-expiry">
        <span className="admin-firewall-label">만료</span>
        <div className="admin-firewall-expiry-content">-</div>
      </div>

      <div className="admin-firewall-assistant">
        <span className="admin-firewall-label">운영도우미</span>
        <div className="admin-firewall-assistant-content">-</div>
      </div>

      <div className="admin-firewall-equipment">
        <span className="admin-firewall-label">장비정보</span>
        <button ref={assetButtonRef} type="button" className="admin-firewall-asset-button" aria-haspopup="dialog" aria-expanded={assetOpen}
          onClick={() => setActivePopup('asset')}>
          <span>자산대장</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 11L9.5 7.5L6 4" stroke="#DCE6EE" strokeWidth="1.3125" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {assetOpen && <AdminAssetPopup fields={assetFields(firewall)} onClose={() => { setActivePopup(null); assetButtonRef.current?.focus() }} />}
    </section>
  )
}
