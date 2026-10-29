// 3~13번 서버 요약 상자 — 줄 모양은 데이터베이스 디자인(줄 사이 24), 값은 server /servers/{host} (8-관리자.md 6장, 사용자 10-23).
//   가동 · 자원 · 연결 · 최근 활동 · 처리량. 서버가 안 주는 칸은 '-', 못 잰 칸은 '실측 대기' 회색 (사용자 10-23)
import type { ReactNode } from 'react'
import type { Resource, ServerDetail } from './api'
import { detail, useHost } from './data'
import { ResourceGauges, Resources, Row, SummaryFrame, VerdictState, VerdictText } from './DetailSummary'
import { hms, NONE } from './view'

/** 줄 가운데 글 — 값이 없으면 회색 대체 글. 길면 두 줄까지 (데이터베이스 연결 상태 캡처가 두 줄) */
function Text({ value, empty = '실측 대기' }: { value: string | null | undefined; empty?: string }) {
  return <span className={`line-clamp-2 min-w-0 flex-[1_0_0] text-b3 ${value ? 'text-white' : 'text-neutral-300'}`}>{value ?? empty}</span>
}

/** 원형 아래 알약 — 서버엔 없는 글이라 판정에서 고름: 행정망(간접)은 '측정 제외', 주의·장애 칸이 있으면 '주의 관찰', 잰 칸이 있으면 '정상 범위' (캡처 글) */
function noteOf(d: ServerDetail | null): string | undefined {
  if (!d) return undefined
  if (d.measureMode === 'INDIRECT') return '측정 제외'
  const rs: Resource[] = d.resources
  if (rs.some((r) => r.verdict === 'WARN' || r.verdict === 'FAIL')) return '주의 관찰'
  return rs.some((r) => r.pct != null) ? '정상 범위' : undefined
}

export function HostSummary({ seq, label, title, connLabel = '연결 상대' }: { seq: number; label: string; title: string; connLabel?: string }): ReactNode {
  const host = useHost(seq)
  const d = detail(host ?? '').use(host ? 'poll' : 'off')
  const indirect = d?.measureMode === 'INDIRECT'
  return (
    <SummaryFrame seq={seq} label={label} title={title} updated={hms(d?.collectedAt)} wide>
      {() => (
        <>
          <Row label="가동">
            <Text value={d?.uptimeText} empty={indirect ? '측정 불가 (행정망)' : '실측 대기'} />
            <VerdictState verdict={d?.verdict} />
          </Row>

          <Resources note={noteOf(d)} dash={false}>
            <ResourceGauges resources={d?.resources} />
          </Resources>

          <Row label={connLabel}>
            <Text value={d?.connectionText} />
            <VerdictText verdict={d?.connectionVerdict} />
          </Row>

          <Row label="최근 활동">
            <Text value={d?.lastActivityText} />
            <VerdictText verdict={d?.lastActivityVerdict} />
          </Row>

          <Row label="처리량">
            <Text value={d?.throughputText} />
            <span className="shrink-0 text-right text-b5 text-neutral-200">{NONE}</span>
          </Row>
        </>
      )}
    </SummaryFrame>
  )
}
