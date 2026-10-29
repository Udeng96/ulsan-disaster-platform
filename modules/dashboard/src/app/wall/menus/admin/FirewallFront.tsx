// 방화벽 상세 오른쪽 위 — 전면 · 포트 구성. 값은 사용자 10-22, 표 내용은 피그마(2265:73806).
//   전면 그림은 옛 화면(features/menus/admin/AdminFrontPorts) 그림을 그대로 쓴다 (사용자 10-22)
//   표는 3묶음이 가로로 이어지고 넘치면 가로 스크롤 — 스크롤바는 공통 ScrollBar
import { memo, useRef } from 'react'
import { FrontRackDrawing } from '@/features/menus/admin/AdminFrontPorts'
import { ScrollBar } from '@/shared/ui/ScrollBar'
import { firewallPorts } from './data'
import { firewallRows } from './liveRows'

/** 상태 색 — 정상(초록) · 미사용(회색) · 미결선 주의(노랑) (사용자 10-22) · 대기(파랑, 데이터베이스 후면 캡처 10-23) */
const TONE = { ok: 'var(--color-accent-green)', idle: 'var(--color-admin-5a708a)', warn: 'var(--color-accent-yellow)', info: 'var(--color-admin-4da3ff)' } as const

export type PortRow = {
  name: string
  /** 장착 내용 — 장착돼 쓰는 것은 흰색, 아니면 회색 (사용자 10-22) */
  mount: string
  used?: boolean
  state: string
  tone: keyof typeof TONE
  usage?: string
}

/** 표 3묶음 — 줄 순서·내용은 피그마. 포트 줄은 /firewall/ports 값으로 덮는다 (liveRows) */
const GROUPS: PortRow[][] = [
  [
    { name: 'LED PWR', mount: '전원 정상', used: true, state: '점등', tone: 'ok' },
    { name: 'LED HDD', mount: '로그 SSD 기록 활동', used: true, state: '깜빡임', tone: 'ok' },
    { name: 'RST 핀홀', mount: '리셋', state: '미사용', tone: 'idle' },
    { name: 'USB1', mount: '정비용', state: '비어 있음', tone: 'idle' },
    { name: 'USB2', mount: '정비용', state: '비어 있음', tone: 'idle' },
    { name: 'CONSOLE', mount: '시리얼 콘솔', state: '미결선', tone: 'idle' },
    { name: '0/MGMT', mount: '관리 전용 이더넷', used: true, state: '미결선', tone: 'warn' },
  ],
  [
    { name: 'HA1', mount: '이중화 동기', state: '미결선', tone: 'idle' },
    { name: 'HA2', mount: '이중화 동기', state: '미결선', tone: 'idle' },
    { name: 'UTP1', mount: '결선 (노랑 케이블)', used: true, state: '결선', tone: 'ok', usage: '측정 전' },
    { name: 'UTP2', mount: '—', state: '미결선', tone: 'idle' },
    { name: 'UTP3', mount: '—', state: '미결선', tone: 'idle' },
    { name: 'UTP4', mount: '—', state: '미결선', tone: 'idle' },
    { name: 'UTP5', mount: '—', state: '미결선', tone: 'idle' },
  ],
  [
    { name: 'UTP6', mount: '—', state: '미결선', tone: 'idle' },
    { name: 'UTP7', mount: '—', state: '미결선', tone: 'idle' },
    { name: 'UTP8', mount: '—', state: '미결선', tone: 'idle' },
    { name: 'SFP1', mount: '—', state: '빈 슬롯', tone: 'idle' },
    { name: 'SFP2', mount: '→ 2 (통신) 스위칭 허브', used: true, state: '결선', tone: 'ok', usage: '측정 전' },
    { name: 'SFP3', mount: '—', state: '빈 슬롯', tone: 'idle' },
    { name: 'SFP4', mount: '—', state: '빈 슬롯', tone: 'idle' },
  ],
]

/** 칸 너비 — 항목 54 · 장착 내용 98 · 상태 60 (사용자 10-22). 사용/용량은 값이 없어 상태와 같은 60 */
const COL = ['w-[54px]', 'w-[98px]', 'w-[60px]', 'w-[60px]'] as const

/** 한 줄 — 여백 6, 칸 사이 10, 글씨 B6 (사용자 10-22).
 *  compact: 스위칭 허브처럼 줄이 많을 때 — 위아래 여백 4 · 줄 높이 15 로 한 줄 23 (+선 1 = 디자인 줄 간격 24, 사용자 10-22) */
const LINE = 'flex items-center gap-2.5 px-1.5 text-[12px] font-medium whitespace-nowrap'
const PAD = { normal: 'py-1.5 leading-[14px]', compact: 'py-1 leading-[15px]', dense: 'py-1 leading-[13px]', roomy: 'py-1.5 leading-[13px]' } as const

/** 머리 글 — 기본은 전면 표. 스위칭 허브 후면은 포트 · 연결 상대 · 상태 · 트래픽 */
const HEADERS = ['항목', '장착 내용', '상태', '사용/용량']

/** fit: 데이터베이스처럼 묶음 셋이 상자 폭을 나눠 갖고 긴 글자는 '…' 로 줄임 (사용자 10-23 캡처).
 *    장착 내용 칸이 남는 폭을 다 갖고, 나머지 칸은 cols 너비. 줄은 21 (+선 1 = 캡처 줄 간격 22).
 *  roomy: fit 인데 자리가 남을 때 (9번 내부 반반) — 디자인 스펙 그대로 여백 6 사방 · 글씨 줄 13 (사용자 10-23) */
export function Group({ rows, compact, fit, roomy, headers = HEADERS, cols = COL }: { rows: PortRow[]; compact?: boolean; fit?: boolean; roomy?: boolean; headers?: string[]; cols?: readonly string[] }) {
  const line = `${LINE} ${PAD[roomy ? 'roomy' : fit ? 'dense' : compact ? 'compact' : 'normal']}`
  const w = (i: number) => (fit && i === 1 ? 'min-w-0 flex-[1_0_0]' : `${cols[i]} shrink-0`)
  return (
    <div role="table" className={`flex flex-col ${fit ? 'min-w-0 flex-[1_0_0]' : 'shrink-0'}`}>
      {/* 머리 — var(--color-admin-8fb0d0). 아래 선은 옛 표와 같은 var(--color-neutral-450) */}
      <div role="row" className={`${line} border-b border-[var(--color-neutral-450)] text-[color:var(--color-admin-8fb0d0)]`}>
        {headers.map((h, i) => (
          <span key={h} role="columnheader" className={`${w(i)} truncate`}>
            {h}
          </span>
        ))}
      </div>
      {rows.map((r) => (
        // 내용 줄 — 아래 1 점선 var(--color-neutral-450), 맨 아래 줄은 없음 (사용자 10-22)
        <div key={r.name} role="row" className={`${line} border-b border-dashed border-[var(--color-neutral-450)] last:border-b-0`}>
          <span role="rowheader" title={r.name} className={`${w(0)} truncate text-[color:var(--color-admin-4da3ff)]`}>
            {r.name}
          </span>
          <span role="cell" title={r.mount} className={`${w(1)} truncate ${r.used ? 'text-white' : 'text-[color:var(--color-admin-5a708a)]'}`}>
            {r.mount}
          </span>
          {/* 상태 — 점 8 + 글씨, 같은 색. 점과 글씨 사이 4 (캡처) */}
          <span role="cell" title={r.state} className={`${w(2)} flex items-center gap-1`} style={{ color: TONE[r.tone] }}>
            <span className="size-2 shrink-0 rounded-full" style={{ background: TONE[r.tone] }} />
            <span className="truncate">{r.state}</span>
          </span>
          <span role="cell" title={r.usage} className={`${w(3)} truncate text-[color:var(--color-admin-5a708a)]`}>
            {r.usage ?? '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

/** 전면 · 포트 구성 상자 — 여백 20, 줄 사이 4, 둥글기 16, Neutral-600, 제목 B1 흰색 (사용자 10-22) */
export const FirewallFront = memo(function FirewallFront() {
  const tableRef = useRef<HTMLDivElement>(null)
  const groups = firewallRows(GROUPS, firewallPorts.use('poll'))
  return (
    <section aria-label="전면 포트 구성" className="flex min-h-0 flex-col items-start gap-1 self-stretch rounded-2xl bg-neutral-600 p-5 font-['Roboto',sans-serif]">
      <h3 className="text-b1 text-white">전면 - 포트 구성</h3>
      {/* 옛 화면 그림 — 가운데, 위아래 4 (후면과 같게, 사용자 10-22). 칸 높이 80 → 79 (아래 1 겹침) — 표 점선으로 늘어난 높이를 맞춤 (사용자 10-22) */}
      <div className="-mb-px flex justify-center self-stretch">
        <FrontRackDrawing />
      </div>
      <div ref={tableRef} className="flex gap-2.5 self-stretch overflow-x-auto [scrollbar-width:none]">
        {groups.map((g) => (
          <Group key={g[0].name} rows={g} />
        ))}
      </div>
      <ScrollBar target={tableRef} axis="x" />
    </section>
  )
})
