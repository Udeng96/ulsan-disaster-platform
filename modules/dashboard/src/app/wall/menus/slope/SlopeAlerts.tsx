// 급경사지 조기경보·통계 — CCTV 자리의 왼쪽 패널 (580×672).
//   위: 발령 필요 (지역 카드, 가로로 넘김) / 아래: 발령 이력 (세로로 넘김).
//   /slope/api/alarms/pending, /history 를 1분마다. 이력은 오른쪽 통계에서 고른 기간만 (서버에 기간 조건이 없어 화면에서 거름).
//   발령 필요에는 해제 필요도 섞여 온다 → 빼고 발령 필요만 (10-21 결정 B).
//   이력 한 줄은 한 지구가 한 단계에 머문 구간 → 마우스를 올리면 원인 계측기, 아직 끝나지 않았으면 시각 옆 '진행 중' (10-21 결정 A).
import { memo, useMemo, useRef } from 'react'
import type { SlopeRiskLevel } from '@/features/menus/steep-slope/data'
import { RISK_TEXT, RISK_TO_VARIANT, riskOf } from '@/features/menus/steep-slope/variants'
import { usePolling } from '@/shared/hooks'
import { cn, ScrollBar } from '@/shared/ui'
import { fetchAlarmHistory, fetchAlarmPending, type AlarmHistory, type AlarmPending } from './api'
import { stamp } from './chart'
import { RISK_BG } from './colors'
import { POLL_MS } from './data'
import { RISK_RANK } from './sensors'
import { slope } from './state'

const NO_PENDING: readonly AlarmPending[] = []
const NO_HISTORY: readonly AlarmHistory[] = []

/** 해제 필요 — 원인 계측기가 없고 단계가 내려가는 쪽 */
const isRelease = (a: AlarmPending) => a.cause === null && RISK_RANK[riskOf(a.level)] < RISK_RANK[riskOf(a.fromLevel)]

/** 이력 줄 시각 — 'MM-DD HH:mm' (줄이 좁다) */
const stampShort = (at: string | null) => (at ? `${at.slice(5, 10)} ${at.slice(11, 16)}` : '-')

function Badge({ risk }: { risk: SlopeRiskLevel }) {
  return (
    <span className={cn('flex items-center justify-center rounded-[100px] px-3 py-1.5 font-sans text-[14px] leading-4 font-medium whitespace-nowrap text-neutral-900', RISK_BG[RISK_TO_VARIANT[risk]])}>
      <span className="relative top-px">{RISK_TEXT[risk]}</span>
    </span>
  )
}

function Arrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M15.8013 10.0009L4.19727 10.0009M11.2606 14.8359L12.7741 13.2243L15.8013 10.0009L12.7741 6.7776L11.2606 5.16594" className="stroke-white" strokeWidth="1.934" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const title = 'flex items-center gap-2 self-stretch font-sans text-[22px] leading-[26px] font-semibold text-white'
const empty = 'flex min-h-10 flex-[1_0_0] items-center justify-center self-stretch font-sans text-[16px] font-medium text-white/45'
// 옛 화면과 같은 글꼴 순서 (→ 같은 기호가 다른 글꼴로 그려지지 않게)
const text = "font-['Roboto',sans-serif] text-[16px] leading-5 font-medium text-white"
const hideBar = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

function CardRow({ label, children, tip }: { label: string; children: React.ReactNode; tip?: string }) {
  return (
    // 배지가 든 줄과 글자만 있는 줄의 높이를 맞춘다 (배지 28)
    <div className="flex min-h-7 items-center gap-3 self-stretch">
      <span className="w-16 shrink-0 font-sans text-[16px] leading-5 font-medium text-neutral-200">{label}</span>
      {/* 발령 시간처럼 긴 값이 잘리지 않게 최소 폭만 */}
      <span className={cn('flex min-w-[130px] shrink-0 items-center', text)} title={tip}>
        {children}
      </span>
    </div>
  )
}

export const SlopeAlerts = memo(function SlopeAlerts() {
  const range = slope.use((s) => s.alarmRange)
  // 한쪽이 실패해도 다른 쪽은 보인다 (실패하면 지난 값)
  const pendingAll = usePolling(fetchAlarmPending, { intervalMs: POLL_MS }).data ?? NO_PENDING
  const pending = useMemo(() => pendingAll.filter((a) => !isRelease(a)), [pendingAll])
  const all = usePolling(fetchAlarmHistory, { intervalMs: POLL_MS }).data ?? NO_HISTORY
  const history = useMemo(
    () =>
      range
        ? all.filter((h) => {
            const day = h.issuedAt?.slice(0, 10)
            return !!day && day >= range.from && day <= range.to
          })
        : all,
    [all, range],
  )
  const cardsRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex h-[672px] w-[580px] flex-col items-start gap-3">
      <section aria-label="발령 필요" className="flex h-[294px] w-[580px] flex-col items-start gap-3 rounded-2xl bg-neutral-600 p-5">
        <div className="flex flex-col items-center gap-2 self-stretch">
          <div className={title}>
            발령 필요
            <span className="text-center text-[18px] leading-5 font-medium text-primary-light">{pending.length}건</span>
          </div>
        </div>
        <div ref={cardsRef} className={cn('flex min-h-0 flex-[1_0_0] items-stretch gap-3 self-stretch overflow-x-auto', hideBar)}>
          {pending.length === 0 && <div className={empty}>발령이 필요한 지역이 없습니다</div>}
          {pending.map((a) => (
            <div key={a.areaName} className="flex shrink-0 flex-col items-start gap-4 rounded-2xl bg-neutral-450 p-4">
              <div className="self-stretch font-sans text-[22px] leading-[26px] font-semibold text-white">{a.areaName}</div>
              <div className="flex flex-col items-start gap-1">
                <CardRow label="현재 상태">
                  <Badge risk={riskOf(a.level)} />
                </CardRow>
                {/* 직전 단계가 있을 때만 '경계 → 심각' (배지 아님) */}
                <CardRow label="상태 변경">{a.fromLevel ? `${a.fromLevel} → ${a.level ?? '-'}` : '-'}</CardRow>
                <CardRow label="발령 시간">{stamp(a.occurredAt)}</CardRow>
                {/* 서버가 수치를 싣지 않아 계측기 이름 */}
                <CardRow label="발생 원인" tip={a.cause ?? ''}>
                  {a.cause ?? '-'}
                </CardRow>
              </div>
            </div>
          ))}
        </div>
        <ScrollBar target={cardsRef} axis="x" />
      </section>

      <section aria-label="발령 이력" className="flex flex-[1_0_0] flex-col items-start gap-3 self-stretch rounded-2xl bg-neutral-600 py-5 pr-3 pl-5">
        <div className="flex items-center gap-2 self-stretch">
          <span className={title}>발령 이력</span>
          <span className="text-right font-sans text-[18px] leading-5 font-medium text-white">총 {history.length}건</span>
        </div>
        <div className="flex min-h-0 flex-[1_0_0] items-stretch gap-2 self-stretch">
          <div ref={listRef} className={cn('flex flex-[1_0_0] flex-col items-start gap-2 overflow-y-auto', hideBar)}>
            {history.length === 0 && <div className={empty}>발령 이력이 없습니다</div>}
            {history.map((h) => (
              // id 가 없어 지역 + 발령 시각으로 구분
              <div key={`${h.areaName}-${h.issuedAt}`} title={h.causes ?? ''} className="flex items-center gap-2 self-stretch rounded-xl bg-white/10 px-5 py-2.5">
                <div className="flex flex-[1_0_0] items-center gap-3">
                  <span className="flex w-36 shrink-0 items-center gap-1">
                    <Badge risk={riskOf(h.fromLevel)} />
                    <Arrow />
                    <Badge risk={riskOf(h.level)} />
                  </span>
                  <span className={cn('flex flex-[1_0_0] items-center gap-2', text)}>{h.areaName}</span>
                </div>
                <span className={cn('flex h-4 w-[100px] shrink-0 flex-col justify-center', text)}>{h.issuer ?? '-'}</span>
                {/* 'MM-DD HH:mm' 한 줄 폭 (80 이면 시:분이 다음 줄로). 끝나지 않은 구간은 옆에 '진행 중' */}
                <span className={cn('flex h-4 shrink-0 items-center gap-2 whitespace-nowrap', text)}>
                  <span className="w-24">{stampShort(h.issuedAt)}</span>
                  {h.endedAt === null && <span className="text-[14px] text-primary-light">진행 중</span>}
                </span>
              </div>
            ))}
          </div>
          <ScrollBar target={listRef} axis="y" />
        </div>
      </section>
    </div>
  )
})
