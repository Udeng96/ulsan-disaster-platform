// 1번 방화벽 상세 — 리스트에서 방화벽을 누르면 운영 현황 자리에 나온다 (사용자 10-22).
//   모양은 사용자 10-22·디자인 캡처, 값은 server /firewall/* · /servers/{host} (8-관리자.md 5장, 사용자 10-23). 서버가 안 주는 칸은 '-'.
//   요약 상자 틀은 DetailSummary (스위칭 허브와 같이 씀). 차단 그래프·자원 원형은 옛 화면(features/menus/admin/AdminFirewallPanel) 것
import { memo, useState } from 'react'
import type { BlockChart as BlockChartData, Range } from './api'
import { detail, firewallBlocks, firewallEvents, firewallSummary, useHost } from './data'
import { Periods, Recent, ResourceGauges, Resources, Row, SummaryFrame, VerdictState } from './DetailSummary'
import { FirewallFront } from './FirewallFront'
import { FirewallRear } from './FirewallRear'
import { BlockTypes } from './FirewallPopups'
import { hms, LIGHT, md, mdhm, NONE, uptimeLine } from './view'

/** 차단 추이 그래프 — 옛 화면 시안 모양(경계·주의·평소 점선, 파란 추이 선)에 서버 값 (/firewall/blocks, 8-관리자.md 5장).
 *  세 선은 두 버튼 모두 하루 기준 (24h 는 시간 건수 × 24). 평소 기록이 없으면(0) 선 셋이 바닥에 겹친다 */
function BlockChart({ chart }: { chart: BlockChartData | null }) {
  const pts = chart?.points ?? []
  const max = Math.max(1, chart?.fail ?? 0, ...pts.map((p) => p.value)) * 1.1
  const y = (v: number) => 112 - (v / max) * 100
  const x = (i: number) => (pts.length > 1 ? (i / (pts.length - 1)) * 310 : 0)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join('')
  const n = (v: number | undefined) => (v == null ? NONE : Math.round(v).toLocaleString())
  return (
    <div className="flex h-[140px] w-[266px] shrink-0 items-center rounded-lg bg-neutral-800 px-4 py-3">
      <svg viewBox="0 0 310 116" className="h-full w-full" role="img" aria-label={`차단 추이 그래프 ${chart?.range ?? ''}`}>
        {chart && (
          <g fontSize="12" fontFamily="Roboto" strokeWidth="0.7">
            <path d={`M0 ${y(chart.fail)}H310`} stroke="var(--color-accent-red)" strokeDasharray="3 3" />
            <path d={`M0 ${y(chart.warn)}H310`} stroke="var(--color-accent-yellow)" strokeDasharray="3 3" />
            <path d={`M0 ${y(chart.baseline)}H310`} stroke="var(--color-accent-green)" strokeDasharray="3 3" />
            <text x="0" y="12" fill="var(--color-accent-red)">
              경계 {n(chart.fail)}
            </text>
            <text x="80" y="12" fill="var(--color-accent-yellow)">
              주의 {n(chart.warn)}
            </text>
            <text x="160" y="12" fill="var(--color-accent-green)">
              평소 {n(chart.baseline)}
            </text>
          </g>
        )}
        {line && <path d={line} fill="none" stroke="var(--color-admin-4da3ff)" strokeWidth="1.5" />}
        {!chart && (
          <text x="155" y="62" textAnchor="middle" fill="var(--color-admin-8fb0d0)" fontSize="14" fontFamily="Roboto">
            {NONE}
          </text>
        )}
      </svg>
    </div>
  )
}

/** 판정 글 → 색 (summary.blockedVerdict 는 글로 옴) */
const toneOf = (v: string | null | undefined) => (v === 'WARN' || v === 'FAIL' || v === 'OK' ? LIGHT[v] : 'var(--color-intensity-1)')

function FirewallSummary() {
  const [period, setPeriod] = useState<Range>('24h')
  const host = useHost(1)
  const sum = firewallSummary.use('poll')
  const chart = firewallBlocks(period).use('poll')
  const events = firewallEvents.use('poll')
  const info = detail(host ?? '').use(host ? 'poll' : 'off')
  // 차단 건수 — 24h 는 summary 값, 7일은 그래프 점 건수 합 (8-관리자.md 질문 9)
  const blocked = period === '24h' ? sum?.blockedLast24h : chart?.points.reduce((a, p) => a + p.count, 0)
  const ratio = sum?.blockedRatio
  const last = events[0]
  return (
    <SummaryFrame seq={1} label="방화벽 요약" title="1. 방화벽 (Firewall)" updated={hms(sum?.collectedAt)}>
      {(popup, toggle) => (
        <>
          <Row label="가동">
            <span className="min-w-0 flex-[1_0_0] text-b3 text-white">{uptimeLine(sum?.uptimeDays, sum?.restartedAt, sum?.rttMs)}</span>
            <VerdictState verdict={info?.verdict} />
          </Row>

          <Row label="차단" top>
            {/* 그래프 칸 — 유형별 내역을 열면 그 위를 덮는다 */}
            <div className="relative shrink-0">
              <BlockChart chart={chart} />
              {popup === 'types' && <BlockTypes />}
            </div>
            {/* 오른쪽 — 기간 버튼 · 차단 건수 · 평소 대비 · 유형별 내역 (옛 화면 글씨 크기). 서버 배수는 '이전 기간'이 아니라 '평소(지난 7일 하루 평균)' 대비 */}
            <div className="flex flex-col items-start gap-2">
              <Periods period={period} onChange={setPeriod} />
              <div className="flex items-center gap-2 text-[14px] leading-4 whitespace-nowrap text-neutral-200">
                차단 건수 <strong className="text-[15px] font-medium text-white">{blocked == null ? NONE : `${blocked.toLocaleString()}건`}</strong>
              </div>
              <div className="flex items-center gap-2 text-[14px] leading-4 whitespace-nowrap text-neutral-200">
                평소 대비{' '}
                <strong className="text-[15px] font-medium" style={{ color: toneOf(sum?.blockedVerdict) }}>
                  {ratio == null ? NONE : `${ratio.toFixed(1)}배${ratio > 1 ? ' ↑' : ''}`}
                </strong>
              </div>
              <button type="button" aria-expanded={popup === 'types'} onClick={() => toggle('types')} className="flex cursor-pointer items-center gap-1 text-[14px] leading-4 text-white underline">
                유형별 내역
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M6 11L9.5 7.5L6 4" stroke="white" strokeWidth="1.3125" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </Row>

          {/* 정책 — 버전·바꾼 사람은 서버에 없음 → 「정책 N개 (허용 N)」(server 결정 10-15) · 최종 변경 시각. 오른쪽 유지(초록)/변경(노랑) */}
          <Row label="정책">
            <span className="min-w-0 flex-[1_0_0] text-b3 text-white">
              {sum ? `정책 ${sum.policyCount}개 (허용 ${sum.allowCount}) · 최종 변경 ${md(sum.policyChangedAt)}` : NONE}
            </span>
            <span className="shrink-0 text-right text-b5" style={{ color: sum?.policyStatus === '변경' ? LIGHT.WARN : LIGHT.OK }}>
              {sum?.policyStatus ?? NONE}
            </span>
          </Row>

          {/* 최근 활동 — 가장 최근 한 줄. 외 N건은 받은 줄(최대 20) 안에서 센다 */}
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

/** 방화벽 상세 — 왼쪽 요약 상자(560) + 오른쪽(위 전면 · 포트 구성, 아래 후면 · 전원), 사이 12 */
export const FirewallDetail = memo(function FirewallDetail() {
  return (
    <div aria-label="방화벽 상세" className="flex h-[672px] w-[1360px] shrink-0 gap-3">
      <FirewallSummary />
      <div className="flex min-w-0 flex-[1_0_0] flex-col gap-3">
        <FirewallFront />
        <FirewallRear />
      </div>
    </div>
  )
})
