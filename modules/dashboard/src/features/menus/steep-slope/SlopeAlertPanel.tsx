// 급경사지 조기경보·통계 — 좌측 패널 (580×672).
//   상단: 발령 필요 (지역 카드 가로 스크롤) / 하단: 발령 이력 (세로 스크롤)
//   데이터: /slope/api/alarms/pending, /slope/api/alarms/history (각 1분 폴링).

import { useEffect, useRef, useState } from 'react'
import type { SlopeRiskLevel } from './data'
import { RISK_BADGE_COLOR, RISK_TEXT, riskOf } from './variants'
import { useAlarms } from './useAlarms'

/** 측정항목 코드 → 표기명. */
const UNIT_TYPE_LABEL: Record<string, string> = {
  U081: 'X축',
  U082: 'Y축',
  U040: '함수비',
  U010: '강우량',
  U210: '감지',
}

/** 발생 원인 — '함수비 53% 초과'. 값이 없으면 계측기명만, 그것도 없으면 '-'. */
function causeText(a: {
  cause: string | null
  causeUnitType: string | null
  causeValue: number | null
  causeUnit: string | null
}): string {
  if (a.causeValue === null) return a.cause ?? '-'
  const label = a.causeUnitType ? (UNIT_TYPE_LABEL[a.causeUnitType] ?? a.causeUnitType) : ''
  return `${label} ${a.causeValue}${a.causeUnit ?? ''} 초과`.trim()
}

/** 발령 필요 카드의 발령 시간 — 'YYYY-MM-DD HH:mm'. */
function stamp(at: string | null): string {
  if (!at) return '-'
  return `${at.slice(0, 10)} ${at.slice(11, 16)}`
}

/** 발령 이력 목록의 일시 — 'MM-DD HH:mm' (행 폭이 좁다). */
function stampShort(at: string | null): string {
  if (!at) return '-'
  return `${at.slice(5, 10)} ${at.slice(11, 16)}`
}

function StatusBadge({ risk }: { risk: SlopeRiskLevel }) {
  return (
    <span
      className="slope-alert-status"
      style={{ background: RISK_BADGE_COLOR[risk] }}
    >
      <span style={{ position: 'relative', top: '1px' }}>{RISK_TEXT[risk]}</span>
    </span>
  )
}

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M15.8013 10.0009L4.19727 10.0009M11.2606 14.8359L12.7741 13.2243L15.8013 10.0009L12.7741 6.7776L11.2606 5.16594"
        stroke="white"
        strokeWidth="1.934"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 커스텀 스크롤바 — track 6px, thumb 40 (가로/세로 공용). */
export function ScrollBar({
  target,
  axis,
}: {
  target: React.RefObject<HTMLDivElement | null>
  axis: 'x' | 'y'
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [visible, setVisible] = useState(false)

  const sync = () => {
    const el = target.current
    const track = trackRef.current
    if (!el || !track) return
    const max =
      axis === 'x'
        ? el.scrollWidth - el.clientWidth
        : el.scrollHeight - el.clientHeight
    setVisible(max > 1)
    if (max <= 1) return setOffset(0)
    const travel =
      (axis === 'x' ? track.clientWidth : track.clientHeight) - 40
    const pos = axis === 'x' ? el.scrollLeft : el.scrollTop
    setOffset((pos / max) * travel)
  }

  // 대상 스크롤 → thumb 동기화 (mount 직후 1회 포함).
  useEffect(() => {
    const el = target.current
    if (!el) return
    el.addEventListener('scroll', sync)
    sync()
    return () => el.removeEventListener('scroll', sync)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    const el = target.current
    const track = trackRef.current
    if (!el || !track) return
    const start = axis === 'x' ? e.clientX : e.clientY
    const startOffset = offset
    const rect = track.getBoundingClientRect()
    const scale = (axis === 'x' ? rect.width : rect.height) /
      (axis === 'x' ? track.clientWidth : track.clientHeight)
    const travel = (axis === 'x' ? track.clientWidth : track.clientHeight) - 40
    const max =
      axis === 'x'
        ? el.scrollWidth - el.clientWidth
        : el.scrollHeight - el.clientHeight
    const onMove = (ev: MouseEvent) => {
      const delta = ((axis === 'x' ? ev.clientX : ev.clientY) - start) / scale
      const next = Math.min(Math.max(startOffset + delta, 0), travel)
      if (axis === 'x') el.scrollLeft = (next / travel) * max
      else el.scrollTop = (next / travel) * max
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div className={`slope-scroll-track is-${axis}`} ref={trackRef}>
      {visible && (
        <div
          className="slope-scroll-thumb"
          style={
            axis === 'x'
              ? { marginLeft: `${offset}px` }
              : { marginTop: `${offset}px` }
          }
          onMouseDown={startDrag}
        />
      )}
    </div>
  )
}

interface Props {
  /** 통계 패널에서 고른 기간 (YYYY-MM-DD, 양끝 포함). 없으면 전체 이력. */
  range?: { from: string; to: string } | null
}

export function SlopeAlertPanel({ range }: Props) {
  const { pending, history: allHistory } = useAlarms()
  // 발령 이력 — 선택 기간에 발령된 건만. 서버 이력 API 는 기간 조건이 없어 화면에서 거른다.
  const history = range
    ? allHistory.filter((h) => {
        const day = h.issuedAt?.slice(0, 10)
        return !!day && day >= range.from && day <= range.to
      })
    : allHistory
  const cardsRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  return (
    <div className="slope-alert-panel">
      {/* 발령 필요 */}
      <div className="slope-alert-pending">
        <div className="slope-alert-pending-head">
          <div className="slope-alert-title">
            발령 필요
            <span className="slope-alert-count">{pending.length}건</span>
          </div>
        </div>
        <div className="slope-alert-cards" ref={cardsRef}>
          {pending.length === 0 && (
            <div className="slope-alert-empty">발령이 필요한 지역이 없습니다</div>
          )}
          {pending.map((a) => (
            <div key={a.areaName} className="slope-alert-card">
              <div className="slope-alert-card-head">{a.areaName}</div>
              <div className="slope-alert-card-body">
                <div className="slope-alert-card-row">
                  <span className="slope-alert-card-label">현재 상태</span>
                  <span className="slope-alert-card-value">
                    <StatusBadge risk={riskOf(a.level)} />
                  </span>
                </div>
                <div className="slope-alert-card-row">
                  <span className="slope-alert-card-label">상태 변경</span>
                  <span className="slope-alert-card-value">
                    {/* 직전 단계가 있을 때만 '경계 → 심각' 으로 (배지 아님). */}
                    {a.fromLevel ? `${a.fromLevel} → ${a.level ?? '-'}` : '-'}
                  </span>
                </div>
                <div className="slope-alert-card-row">
                  <span className="slope-alert-card-label">발령 시간</span>
                  <span className="slope-alert-card-value">
                    {stamp(a.occurredAt)}
                  </span>
                </div>
                <div className="slope-alert-card-row">
                  <span className="slope-alert-card-label">발생 원인</span>
                  {/* 계측기명(cause)은 툴팁으로 — 카드에는 원인 항목·값만. */}
                  <span className="slope-alert-card-value" title={a.cause ?? ''}>
                    {causeText(a)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <ScrollBar target={cardsRef} axis="x" />
      </div>

      {/* 발령 이력 */}
      <div className="slope-alert-history">
        <div className="slope-alert-history-head">
          <span className="slope-alert-title">발령 이력</span>
          <span className="slope-alert-total">총 {history.length}건</span>
        </div>
        <div className="slope-alert-history-body">
          <div className="slope-alert-list" ref={listRef}>
            {history.length === 0 && (
              <div className="slope-alert-empty">발령 이력이 없습니다</div>
            )}
            {history.map((h) => (
              // id 가 없어 지역 + 발령시각으로 식별한다.
              <div
                key={`${h.areaName}-${h.issuedAt}`}
                className="slope-alert-row"
                title={h.message ?? ''}
              >
                <div className="slope-alert-row-main">
                  <span className="slope-alert-change">
                    <StatusBadge risk={riskOf(h.fromLevel)} />
                    <ArrowIcon />
                    <StatusBadge risk={riskOf(h.level)} />
                  </span>
                  <span className="slope-alert-area">{h.areaName}</span>
                </div>
                <span className="slope-alert-actor">{h.issuer ?? '-'}</span>
                <span className="slope-alert-at">{stampShort(h.issuedAt)}</span>
              </div>
            ))}
          </div>
          <ScrollBar target={listRef} axis="y" />
        </div>
      </div>
    </div>
  )
}
