// 서버 운영 현황 — 서버 리스트 오른쪽 본문(1360 폭). 위에서부터 12 간격으로: 윗줄 박스 · 카드 3줄 · 범례. 값은 사용자 10-22, 빠진 값은 피그마.
//   윗줄 박스(여백 20, 둥글기 16, Neutral-600): 제목 · 정상/주의/장애 대수 · 오른쪽 끝 갱신 시각
//   값은 server /overview (30초, 8-관리자.md 3장). 서버가 안 주는 칸은 '-' (사용자 10-23)
import { Fragment, memo, type ReactNode } from 'react'
import { cn } from '@/shared/ui'
import { Index } from './AdminRack'
import type { ServerCard as ApiCard } from './api'
import { overview } from './data'
import { admin } from './state'
import { CARD, hms, LIGHT, NONE, or } from './view'

/** 상태 한 칸 — 이름(var(--color-neutral-100) Roboto 17·400) · 불빛(10, 같은 색 8 번짐) · N대(Roboto 22·600, 불빛 색), 사이 8 */
function StatusCount({ label, count, color }: { label: string; count: number | null; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-['Roboto',sans-serif] text-[17px] font-normal text-neutral-100">{label}</span>
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px 0 ${color}` }} />
      <span className="font-['Roboto',sans-serif] text-[22px] font-semibold" style={{ color }}>
        {count == null ? NONE : `${count}대`}
      </span>
    </div>
  )
}

/** 마지막 연계 전송 · ↔ 11 — 서버 글의 ↔ 를 양쪽 화살표(octicon arrow-both-16, 16)로, 사이 3 (피그마) */
function KeyLabel({ text }: { text: string | null }) {
  if (!text) return NONE
  const at = text.indexOf('↔')
  if (at < 0) return text
  return (
    <>
      {text.slice(0, at).trimEnd()}
      <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="var(--color-intensity-1)" aria-label="양방향">
        <path d="M3.72 3.72a.75.75 0 0 1 1.06 1.06L2.56 7h10.88l-2.22-2.22a.75.75 0 0 1 1.06-1.06l3.5 3.5a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 1 1-1.06-1.06l2.22-2.22H2.56l2.22 2.22a.75.75 0 1 1-1.06 1.06l-3.5-3.5a.75.75 0 0 1 0-1.06Z" />
      </svg>
      {text.slice(at + 1).trimStart()}
    </>
  )
}

/** 불빛 12 — 직접 측정은 채운 원, 간접 확인은 속 빈 원(두께 2) */
function CardLight({ color, hollow }: { color: string; hollow?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden>
      {hollow ? <circle cx="6" cy="6" r="5" fill="none" stroke={color} strokeWidth="2" /> : <circle cx="6" cy="6" r="6" fill={color} />}
    </svg>
  )
}

/** 범례 표시 12 — 직접 측정(채움) · 간접 확인(속 빈 원), var(--color-admin-8fb0d0) (사용자 10-22) */
function LegendMark({ hollow }: { hollow?: boolean }) {
  return <CardLight color="var(--color-admin-8fb0d0)" hollow={hollow} />
}

/** 서버 카드 한 칸 — 265×176, 여백 16·20, 위아래 묶음 사이 42, 둥글기 8, 테두리 1 상태 색 (사용자 10-22, 테두리 피그마) */
//   랙·리스트·카드 어디든 같은 번호에 마우스를 올리면 함께 강조 — 상태 색 테두리는 두고 바깥 파란 테두리·빛 (랙 선택과 같은 색, 사용자 10-23)
function ServerCard({ card }: { card: ApiCard }) {
  const no = card.seq
  const color = CARD[card.verdict]
  // 값·설명 색 — 큰 값 판정(keyVerdict)이 주의·장애면 그 색 (서버가 카드 판정과 따로 줌)
  const tone = card.keyVerdict === 'WARN' || card.keyVerdict === 'FAIL' ? CARD[card.keyVerdict] : null
  // 상태 옆 글 — 서버 subLine 을 ' · ' 로 나눔. 실측 대기면 서버가 같은 말을 주므로 뺀다
  const info = (card.subLine ? card.subLine.split(' · ') : [NONE]).filter((t) => t !== card.verdictLabel)
  const hover = admin.use((s) => s.hover === no)
  return (
    <div
      className={cn(
        "flex h-[176px] w-[265px] flex-col items-start gap-[42px] rounded-lg border px-5 py-4 font-['Roboto',sans-serif] transition-ui",
        hover && 'bg-[var(--color-admin-rgba-77-163-255-0-12)] shadow-[0_0_12px_var(--color-admin-rgba-77-163-255-0-4)] outline-2 outline-offset-1 outline-[var(--color-admin-4da3ff)]',
      )}
      style={{ borderColor: color }}
      onMouseEnter={() => admin.set({ hover: no })}
      onMouseLeave={() => admin.set({ hover: null })}
    >
      {/* 위 — 번호·이름 줄, 그 아래 7 띄워 상태 줄 */}
      <div className="flex flex-col items-start gap-[7px] self-stretch">
        <div className="flex items-center justify-between self-stretch">
          <div className="flex items-center gap-[11px]">
            <Index no={no} />
            <span className="text-[15.5px] leading-[18px] font-bold whitespace-nowrap text-white">{card.shortName}</span>
          </div>
          <CardLight color={color} hollow={!card.directDot} />
        </div>
        {/* 상태(13·700, 상태 색) · 자세한 내용(13·400 var(--color-admin-5a708a)), 사이 5. 가운데 점은 12·500 */}
        <div className="flex h-[15px] items-center gap-[5px] whitespace-nowrap leading-[15px]">
          <span className="text-[13px] font-bold" style={{ color }}>
            {card.verdictLabel}
          </span>
          {info.map((t, i) => (
            <Fragment key={i}>
              <span className="text-[12px] leading-[14px] font-medium text-[color:var(--color-admin-5a708a)]">·</span>
              <span className="text-[13px] text-[color:var(--color-admin-5a708a)]">{t}</span>
            </Fragment>
          ))}
        </div>
      </div>
      {/* 아래 — 부가내용(15·700 흰색), 3 띄워 본문(30·600) + 설명(14·400 var(--color-admin-8fb0d0)) 아래 맞춤, 사이 8. 주의면 본문·설명 노랑 (피그마) */}
      <div className="flex flex-col items-start gap-[3px]">
        <div className="flex items-center gap-[3px] text-[15px] leading-[18px] font-bold whitespace-nowrap text-white">
          <KeyLabel text={card.keyLabel} />
        </div>
        <div className="flex items-end gap-2 whitespace-nowrap">
          <span className="text-[30px] leading-[35px] font-semibold" style={{ color: tone ?? 'var(--color-intensity-1)' }}>
            {or(card.keyValue)}
          </span>
          <span className="text-[14px] leading-4" style={{ color: tone ?? 'var(--color-admin-8fb0d0)' }}>
            {card.keyAux ?? ''}
          </span>
        </div>
      </div>
    </div>
  )
}

/** 빈 칸 — 점선 박스 265×176, 둥글기 8, 테두리 1 점선 var(--color-admin-rgba-124-200-255-35), 글씨 가운데 14·400 var(--color-admin-8fb0d0) 줄 사이 5 (사용자 10-22) */
function EmptyCard({ lines }: { lines: string[] }) {
  return (
    <div className="flex h-[176px] w-[265px] shrink-0 flex-col items-center justify-center gap-[5px] rounded-lg border border-dashed border-[var(--color-admin-rgba-124-200-255-0-35)] font-['Roboto',sans-serif] text-[14px] whitespace-nowrap text-[color:var(--color-admin-8fb0d0)]">
      {lines.map((l) => (
        <span key={l}>{l}</span>
      ))}
    </div>
  )
}

/** 범례 한 칸 — 표시와 글씨 사이 4, 글씨 12.5·400 var(--color-admin-8fb0d0) (피그마) */
function Legend({ mark, children }: { mark?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1 font-['Roboto',sans-serif] text-[12.5px] leading-[15px] whitespace-nowrap text-[color:var(--color-admin-8fb0d0)]">
      {mark}
      {children}
    </div>
  )
}

export const ServerStatus = memo(function ServerStatus() {
  const data = overview.use('poll')
  const counts = data?.counts
  const cells = [...(data?.cards ?? []).map((c) => <ServerCard key={c.seq} card={c} />), <EmptyCard key="hint" lines={['장비 클릭 시', '상세 화면 전환']} />, <EmptyCard key="spare" lines={['예비 (14)']} />]
  return (
    <section aria-label="서버 운영 현황" className="flex w-[1360px] shrink-0 flex-col items-start gap-[15px] self-start">
      {/* 윗줄 박스 — 높이 66 (여백 20 + 제목 줄 26 + 20). 한글 대체 글꼴로 줄이 높아지지 않게 높이를 고정. 카드까지 15 (사용자 10-22) */}
      <div className="flex h-[66px] items-center justify-between self-stretch rounded-2xl bg-neutral-600 px-5">
        {/* 제목과 상태 칸 사이·상태 칸끼리 20 — 디자인 캡처에서 잰 값 */}
        <div className="flex items-center gap-5">
          <h3 className="font-['Roboto',sans-serif] text-b1 text-white">시스템 운영현황</h3>
          <StatusCount label="정상" count={counts?.ok ?? null} color={LIGHT.OK} />
          <StatusCount label="주의" count={counts?.warn ?? null} color={LIGHT.WARN} />
          <StatusCount label="장애" count={counts?.fail ?? null} color={LIGHT.FAIL} />
        </div>
        {/* 갱신 — Neutral-200, B5 */}
        <span className="font-['Roboto',sans-serif] text-b5 text-neutral-200">갱신 {hms(data?.lastSync)}</span>
      </div>
      {/* 카드 — 한 줄 5칸, 가로·세로 사이 8 (사용자 10-22), 그 아래 8 띄워 범례 (피그마) */}
      <div className="flex flex-col items-start gap-2 self-stretch">
        {[0, 5, 10].map((at) => (
          <div key={at} className="flex gap-2">
            {cells.slice(at, at + 5)}
          </div>
        ))}
        {/* 범례 — 칸 사이 22 (피그마) */}
        <div className="flex items-center gap-[22px]">
          <Legend mark={<LegendMark />}>직접 측정</Legend>
          <Legend mark={<LegendMark hollow />}>간접 확인 (행정망 — 데이터 수신 기록 기준)</Legend>
          <Legend>시각 = 마지막 활동 · 노랑 테두리 = 주의</Legend>
        </div>
      </div>
    </section>
  )
})
