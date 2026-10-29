// 2번 스위칭 허브 상세 — 리스트에서 스위칭 허브를 누르면 운영 현황 자리에 나온다.
//   모양은 방화벽 상세와 같고 값만 스위칭 허브 디자인 캡처대로 바꾼다 (사용자 10-22). 왼쪽 요약 상자부터, 오른쪽은 값 받는 대로.
//   값은 server /switch/* · /servers/{host} (8-관리자.md, 사용자 10-23). 서버가 안 주는 칸은 '-'.
import { memo, useState } from 'react'
import type { Range, TrafficChart as TrafficData } from './api'
import { detail, switchEvents, switchSummary, switchTraffic, useHost } from './data'
import { Periods, Recent, ResourceGauges, Resources, Row, SummaryFrame, VerdictState } from './DetailSummary'
import { SwitchFront } from './SwitchFront'
import { SwitchRear } from './SwitchRear'
import { bps, hms, LIGHT, mdhm, NONE, uptimeLine } from './view'

/** Gbps → 「4.9Mbps」 */
const gbps = (v: number | null | undefined) => (v == null ? NONE : bps(Math.round(v * 1e9)))

/** 트래픽 추이 그래프 — 방화벽 차단 그래프 칸(266×140)과 같은 크기, 시안 모양(평소 점선 + 파란 선 · 아래 파란 면)에 /switch/traffic 값.
 *  못 잰 시간(null)은 선을 끊는다 */
function TrafficChart({ chart }: { chart: TrafficData | null }) {
  const pts = chart?.points ?? []
  const base = chart?.baselineGbps ?? null
  const max = Math.max(1e-6, base ?? 0, ...pts.map((p) => p.gbps ?? 0)) * 1.25
  const y = (v: number) => 112 - (v / max) * 96
  const x = (i: number) => (pts.length > 1 ? (i / (pts.length - 1)) * 310 : 0)
  const runs: string[] = []
  let cur = ''
  pts.forEach((p, i) => {
    if (p.gbps == null) {
      if (cur) runs.push(cur)
      cur = ''
      return
    }
    cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.gbps).toFixed(1)}`
  })
  if (cur) runs.push(cur)
  return (
    <div className="flex h-[140px] w-[266px] shrink-0 items-center rounded-lg bg-neutral-800 px-4 py-3">
      <svg viewBox="0 0 310 116" className="h-full w-full" role="img" aria-label={`트래픽 추이 그래프 ${chart?.range ?? ''}`}>
        <defs>
          <linearGradient id="sw-traffic-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-admin-4da3ff)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--color-admin-4da3ff)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {base != null && (
          <>
            <path d={`M0 ${y(base)}H310`} stroke="var(--color-neutral-300)" strokeWidth="0.7" strokeDasharray="3 3" />
            <text x="0" y={Math.max(12, y(base) - 6)} fill="var(--color-admin-8fb0d0)" fontSize="12" fontFamily="Roboto">
              평소 {gbps(base)}
            </text>
          </>
        )}
        {runs.map((d) => (
          <g key={d}>
            <path d={`${d}V116H${d.slice(1, d.indexOf(' '))}Z`} fill="url(#sw-traffic-fill)" />
            <path d={d} fill="none" stroke="var(--color-admin-4da3ff)" strokeWidth="1.5" />
          </g>
        ))}
        {!runs.length && (
          <text x="155" y="62" textAnchor="middle" fill="var(--color-admin-8fb0d0)" fontSize="14" fontFamily="Roboto">
            {NONE}
          </text>
        )}
      </svg>
    </div>
  )
}

/** 오른쪽 글 한 줄 — 방화벽 '차단 건수' 줄과 같은 글씨 (14 Neutral-200 + 값 15 흰색) */
function Stat({ label, value, color = 'var(--color-intensity-1)' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 text-[14px] leading-4 whitespace-nowrap text-neutral-200">
      {label}{' '}
      <strong className="text-[15px] font-medium" style={{ color }}>
        {value}
      </strong>
    </div>
  )
}

function SwitchSummary() {
  const [period, setPeriod] = useState<Range>('24h')
  const host = useHost(2)
  const sum = switchSummary.use('poll')
  const chart = switchTraffic(period).use('poll')
  const events = switchEvents.use('poll')
  const info = detail(host ?? '').use(host ? 'poll' : 'off')
  const errs = sum?.errorPorts ?? []
  const last = events[0]
  return (
    <SummaryFrame seq={2} label="스위칭 허브 요약" title="2. 스위칭 허브 (L2 Switch)" updated={hms(sum?.collectedAt)}>
      {() => (
        <>
          <Row label="가동">
            <span className="min-w-0 flex-[1_0_0] text-b3 text-white">{uptimeLine(sum?.uptimeDays, sum?.restartedAt, sum?.rttMs)}</span>
            <VerdictState verdict={info?.verdict} />
          </Row>

          {/* 트래픽 — 방화벽 차단 줄 자리. 오른쪽은 기간 버튼 + 지금 트래픽 · 브로드캐스트 상태 · 응답 */}
          <Row label="트래픽" top>
            <TrafficChart chart={chart} />
            <div className="flex flex-col items-start gap-2">
              <Periods period={period} onChange={setPeriod} />
              <Stat label="트래픽" value={gbps(sum?.trafficGbps)} />
              <Stat label="상태" value={sum ? (sum.broadcastHigh ? '주의' : '정상') : NONE} color={sum ? (sum.broadcastHigh ? LIGHT.WARN : LIGHT.OK) : undefined} />
              <Stat label="응답" value={sum?.rttMs == null ? NONE : `${sum.rttMs}ms`} />
            </div>
          </Row>

          {/* 포트 — 방화벽 정책 줄 자리. 에러 포트가 있으면 수와 오른쪽 '확인 필요' 노랑, 불빛 없음 (캡처) */}
          <Row label="포트">
            <span className="min-w-0 flex-[1_0_0] text-b3 text-white">
              {sum ? (
                <>
                  {sum.portsTotal}포트 중 {sum.portsUp} Up · 에러 포트 <span className={errs.length ? 'text-[color:var(--color-accent-yellow)]' : ''}>{errs.length ? `${errs.length} (${errs.join(', ')})` : '0'}</span>
                </>
              ) : (
                NONE
              )}
            </span>
            <span className="shrink-0 text-right text-b5" style={{ color: !sum ? 'var(--color-neutral-100)' : errs.length ? 'var(--color-accent-yellow)' : LIGHT.OK }}>
              {!sum ? NONE : errs.length ? '확인 필요' : '정상'}
            </span>
          </Row>

          <Recent time={last ? mdhm(last.at) : null} more={events.length - 1}>
            {last?.summary ?? NONE}
          </Recent>

          <Resources>
            <ResourceGauges resources={info?.resources} />
          </Resources>
        </>
      )}
    </SummaryFrame>
  )
}

/** 스위칭 허브 상세 — 왼쪽 요약 상자(560) + 오른쪽(위 전면 · 포트 구성, 아래 후면 · 전원·냉각, 사이 12 — 방화벽과 같음), 사이 12 */
export const SwitchDetail = memo(function SwitchDetail() {
  return (
    <div aria-label="스위칭 허브 상세" className="flex h-[672px] w-[1360px] shrink-0 gap-3">
      <SwitchSummary />
      <div className="flex min-w-0 flex-[1_0_0] flex-col gap-3">
        <SwitchFront />
        <SwitchRear />
      </div>
    </div>
  )
})
