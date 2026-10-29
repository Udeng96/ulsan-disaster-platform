// 방화벽 상세 오른쪽 아래 — 후면 · 전원. 제목 머리는 전면 · 포트 구성과 같고, 4 아래에 옛 화면 후면 그림, 그 아래 표 2개 (사용자 10-22).
//   표 글씨는 전면과 같다 (B6, 항목 var(--color-admin-4da3ff) · 내용 흰색/없으면 var(--color-admin-5a708a) · 상태 점 8). 줄은 디자인 캡처, 값은 server
import { memo } from 'react'
import { RearRackDrawing } from '@/features/menus/admin/AdminRearPower'
import type { FirewallSummary, PartRow } from './api'
import { firewallSummary, parts, useHost } from './data'
import { NONE } from './view'

const TONE = { ok: 'var(--color-accent-green)', idle: 'var(--color-admin-5a708a)', warn: 'var(--color-accent-yellow)' } as const

type RearRow = { name: string; link: string; state: string; tone: keyof typeof TONE; traffic: string }

/** 줄 — PSU 는 /servers/{host}/parts 뒷면(수기 엑셀: 연결 전원) + summary.psuStatus, 전원 스위치는 summary.powerSwitch,
 *  팬은 summary.fanRpm (돌면 '회전', 트래픽 칸에 rpm). 못 받은 칸은 '-' (사용자 10-23). 450W 는 규격서 */
function rows(sum: FirewallSummary | null, rear: readonly PartRow[] | undefined) {
  const psu = (name: string): RearRow => {
    const p = rear?.find((r) => r.item === name)
    const state = p?.state ?? sum?.psuStatus ?? NONE
    return { name, link: p?.content ?? 'PDU 미확인', state, tone: state === NONE ? 'idle' : 'ok', traffic: '— / 450W' }
  }
  const fan = (i: number): RearRow => {
    const rpm = sum?.fanRpm?.[i]
    return { name: `팬${i + 1}`, link: '전면 흡기 → 후면 배기', state: rpm == null ? NONE : rpm > 0 ? '회전' : '정지', tone: rpm == null ? 'idle' : rpm > 0 ? 'ok' : 'warn', traffic: rpm == null ? NONE : `${rpm.toLocaleString()}rpm` }
  }
  const power = sum?.powerSwitch ?? NONE
  const left: RearRow[] = [psu('PSU1'), psu('PSU2'), { name: '전원 스위치', link: '—', state: power, tone: power === NONE ? 'idle' : 'ok', traffic: '—' }, fan(0)]
  const right: RearRow[] = [fan(1), fan(2), fan(3)]
  return [left, right]
}

/** 칸 — 포트 60 · 연결 상태 114 · 상태 50 · 트래픽 나머지 (사용자 10-22) */
const COL = ['w-[60px] shrink-0', 'w-[114px] shrink-0', 'w-[50px] shrink-0', 'min-w-0 flex-[1_0_0]'] as const
/** 한 줄 — 여백 6, 칸 사이 10, B6 (사용자 10-22) */
const LINE = 'flex items-center gap-2.5 self-stretch p-1.5 text-[12px] leading-[14px] font-medium whitespace-nowrap'

function Table({ rows }: { rows: RearRow[] }) {
  return (
    <div role="table" className="flex min-w-0 flex-[1_0_0] flex-col">
      {/* 머리 — var(--color-admin-8fb0d0), 아래 선은 전면 표와 같은 var(--color-neutral-450) */}
      <div role="row" className={`${LINE} border-b border-[var(--color-neutral-450)] text-[color:var(--color-admin-8fb0d0)]`}>
        {['포트', '연결 상태', '상태', '트래픽'].map((h, i) => (
          <span key={h} role="columnheader" className={COL[i]}>
            {h}
          </span>
        ))}
      </div>
      {rows.map((r) => (
        // 내용 줄 — 아래 1 점선 var(--color-neutral-450), 맨 아래 줄은 없음 (사용자 10-22)
        <div key={r.name} role="row" className={`${LINE} border-b border-dashed border-[var(--color-neutral-450)] last:border-b-0`}>
          <span role="rowheader" className={`${COL[0]} text-[color:var(--color-admin-4da3ff)]`}>
            {r.name}
          </span>
          <span role="cell" className={`${COL[1]} truncate ${r.link === '—' ? 'text-[color:var(--color-admin-5a708a)]' : 'text-white'}`}>
            {r.link}
          </span>
          {/* 상태 — 점 8 + 글씨 같은 색, 사이 4 (전면과 같음) */}
          <span role="cell" className={`${COL[2]} flex items-center gap-1`} style={{ color: TONE[r.tone] }}>
            <span className="size-2 shrink-0 rounded-full" style={{ background: TONE[r.tone] }} />
            {r.state}
          </span>
          <span role="cell" className={`${COL[3]} text-[color:var(--color-admin-5a708a)]`}>
            {r.traffic}
          </span>
        </div>
      ))}
    </div>
  )
}

export const FirewallRear = memo(function FirewallRear() {
  const host = useHost(1)
  const sum = firewallSummary.use('poll')
  const rear = parts(host ?? '').use(host ? 'poll' : 'off')?.rear
  const [left, right] = rows(sum, rear)
  return (
    <section aria-label="후면 전원" className="flex min-h-0 flex-[1_0_0] flex-col items-start gap-1 self-stretch rounded-2xl bg-neutral-600 p-5 font-['Roboto',sans-serif]">
      <h3 className="text-b1 text-white">후면 - 전원</h3>
      {/* 옛 화면 그림 — 칸 748×82 (상자 여백 20 안 꽉), 위아래 4 (사용자 10-22). 그림만 2 위로 (자리·표 위치는 그대로, 사용자 10-22) */}
      <div className="relative -top-0.5">
        <RearRackDrawing wide />
      </div>
      {/* 표 2개 나란히 — 사이 8 (캡처) */}
      <div className="flex items-start gap-2 self-stretch">
        <Table rows={left} />
        <Table rows={right} />
      </div>
    </section>
  )
})
