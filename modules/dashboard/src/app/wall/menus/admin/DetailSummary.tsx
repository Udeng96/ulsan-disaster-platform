// 장비 상세 왼쪽 요약 상자 공통 틀 — 방화벽(1번)에서 만든 모양을 스위칭 허브(2번)도 그대로 쓴다 (사용자 10-22: 디자인 같게, 값만 바꿈).
//   제목 헤더 · 줄(Row) · 오른쪽 상태 · 기간 버튼 · 자원 원형 · 자산 대장 막대(+팝업)
//   값은 server 모듈 (8-관리자.md 4장) — 서버가 안 주는 칸은 '-' (사용자 10-23)
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Resource, Verdict } from './api'
import { AssetPopup } from './FirewallPopups'
import { admin } from './state'
import { LABEL, LIGHT, NONE } from './view'

/** 줄 하나 — 위아래 여백 8, 제목(70 폭)과 내용 사이 20. 제목·내용 B3, 제목 Neutral-200 · 내용 흰색. 줄 아래 옛 화면과 같은 1 선 (사용자 10-22, 선은 캡처).
 *  가운데 줄은 윗줄 선과 내 선 사이 한가운데에 글이 오게 위 여백 8 을 아래로 옮김 (상자 사이 16 이 위에 더해져 글이 처져 보임, 사용자 10-22). 줄 높이는 그대로.
 *  줄 사이가 24 인 상자(wide)는 아래 여백 20 — 24 로 하면 상자 높이 672 를 9 넘어서 4 줄임 (글은 한가운데보다 2 아래).
 *  피그마처럼 줄 여백 없이 사이 24 만 두면 글이 너무 작아 보여 되돌림 (사용자 10-22) */
export function Row({ label, top, children }: { label: string; top?: boolean; children: ReactNode }) {
  const wide = useContext(Wide)
  return (
    <div className={`flex gap-5 self-stretch border-b border-[var(--color-neutral-450)] ${top ? 'items-start py-2' : `items-center ${wide ? 'pb-5' : 'pb-4'}`}`}>
      <span className="w-[70px] shrink-0 text-b3 text-neutral-200">{label}</span>
      {children}
    </div>
  )
}

/** 오른쪽 끝 상태 — 불빛(10) + 글씨(B5, 오른쪽 정렬), 정상 초록 (사용자 10-22). 불빛과 글씨 사이는 캡처에서 6 */
export function State({ label = '정상', color = 'var(--color-accent-green)' }: { label?: string; color?: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-right text-b5" style={{ color }}>
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

/** 판정 → 오른쪽 끝 상태 (못 받았으면 '-') */
export function VerdictState({ verdict }: { verdict: Verdict | null | undefined }) {
  if (!verdict) return <span className="shrink-0 text-right text-b5 text-neutral-200">{NONE}</span>
  return <State label={LABEL[verdict]} color={LIGHT[verdict]} />
}

/** 판정 → 글씨만 (불빛 없는 칸, 캡처) */
export function VerdictText({ verdict, label }: { verdict: Verdict | null | undefined; label?: string }) {
  return (
    <span className="shrink-0 text-right text-b5" style={{ color: verdict ? LIGHT[verdict] : 'var(--color-neutral-100)' }}>
      {verdict ? (label ?? LABEL[verdict]) : NONE}
    </span>
  )
}

/** 24h · 7일 버튼 — 옛 화면 버튼 그대로 (여백 4·12, 둥글게, 고르면 흰 테두리 + 파란 그라데이션) */
export function Periods({ period, onChange }: { period: '24h' | '7d'; onChange: (p: '24h' | '7d') => void }) {
  return (
    <div className="flex items-center gap-2" aria-label="조회 기간">
      {(['24h', '7d'] as const).map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={period === p}
          onClick={() => onChange(p)}
          className={`flex cursor-pointer items-center justify-center rounded-full border px-3 py-1 text-[12px] leading-[14px] font-medium whitespace-nowrap text-white ${
            period === p ? 'border-white bg-[linear-gradient(180deg,#42B8FF_10%,#0D8AE0_90%)]' : 'border-transparent bg-neutral-400 hover:border-primary'
          }`}
        >
          {p === '24h' ? '24h' : '7일'}
        </button>
      ))}
    </div>
  )
}

/** 자원 원형 — 옛 화면 원형(80, 반지름 35, 위에서 시계 방향)에 오른쪽 이름·값을 붙임 (디자인 캡처).
 *  warn: 값을 아직 못 잰 칸 — 바깥에 노란 테두리 1 (var(--color-admin-f2c549)) + 가운데 '–'(캡처처럼 넓은 줄) 노랑 (GIS 데이터디스크 캡처 10-23, 색은 캡처에서 뽑음).
 *  idle: 아직 실측 전인 칸 — warn 과 같은 모양을 회색 Neutral-300 (var(--color-neutral-300)) 으로 (9~12번 연계 서버 캡처 10-23, 캡처에서 아래 '실측 대기' 글씨와 같은 색).
 *  arc: 채운 호 색 — 기본 파랑, 주의 관찰은 노랑 var(--color-admin-f2c549) (CCTV CPU·네트워크 캡처 10-23) */
export function Gauge({ label, pct, sub, warn, idle, arc = 'var(--color-admin-4da3ff)' }: { label: string; pct: number | null; sub: string; warn?: boolean; idle?: boolean; arc?: string }) {
  const text = pct === null ? (warn || idle ? '–' : '-') : `${pct}%`
  const ring = warn ? 'var(--color-admin-f2c549)' : idle ? 'var(--color-neutral-300)' : undefined
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 80 80" className="size-20 shrink-0" role="img" aria-label={`${label} ${text}`}>
        <circle cx="40" cy="40" r="35" fill="none" stroke="var(--color-neutral-450)" strokeWidth="9" />
        {pct !== null && <circle cx="40" cy="40" r="35" fill="none" stroke={arc} strokeWidth="9" pathLength="100" strokeDasharray={`${pct} ${100 - pct}`} transform="rotate(-90 40 40)" />}
        {ring && <circle cx="40" cy="40" r="39.5" fill="none" stroke={ring} strokeWidth="1" />}
        <text x="40" y="40" textAnchor="middle" dominantBaseline="central" fill={ring ?? 'var(--color-intensity-1)'} fontSize="18" fontWeight="600" fontFamily="Roboto">
          {text}
        </text>
      </svg>
      <div className="flex flex-col gap-1">
        <span className="text-b3 whitespace-nowrap text-neutral-100">{label}</span>
        <span className="text-[14px] leading-4 whitespace-nowrap text-neutral-300">{sub}</span>
      </div>
    </div>
  )
}

/** 원형 % — 소수 한 자리까지 */
const pctOf = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10)

/** server 자원 칸 → 원형. 못 잰 칸(null)은 회색 '–', 주의·장애 판정은 호 색 (서버 색 그대로) · 아래 글은 서버 detail, 없으면 '-' */
export function ResourceGauge({ r }: { r: Resource | undefined }) {
  if (!r) return <Gauge label={NONE} pct={null} sub={NONE} idle />
  const pct = pctOf(r.pct)
  const arc = r.verdict === 'WARN' || r.verdict === 'FAIL' ? LIGHT[r.verdict] : undefined
  return <Gauge label={r.label} pct={pct} sub={r.detail ?? NONE} idle={pct === null} arc={arc} />
}

/** 자원 4칸 — 서버가 준 순서대로 (모자라면 '-' 칸) */
export function ResourceGauges({ resources }: { resources: readonly Resource[] | undefined }) {
  return [0, 1, 2, 3].map((i) => <ResourceGauge key={i} r={resources?.[i]} />)
}

/** 자원 줄 — 원형 2×2, 칸 사이 가로 24 · 세로 16 (캡처), 오른쪽 끝 '-'.
 *  note: 원형 아래 작은 알약 글 (데이터베이스 '실사용률 <1% · 유휴', 캡처). 데이터베이스 캡처는 오른쪽 '-' 없음 → dash={false} */
export function Resources({ note, dash = true, children }: { note?: string; dash?: boolean; children: ReactNode }) {
  return (
    <Row label="자원">
      <div className="flex min-w-0 flex-[1_0_0] flex-col items-start gap-2">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 self-stretch">{children}</div>
        {note && <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-[12px] leading-[14px] font-medium text-neutral-200">{note}</span>}
      </div>
      {dash && <span className="w-[60px] shrink-0 text-center text-b3 text-[color:var(--color-admin-8fb0d0)]">-</span>}
    </Row>
  )
}

/** 최근 활동 줄 — 시간 17·400 var(--color-admin-8fb0d0), 내용 17·400 var(--color-neutral-100), 외 n건 16·700 var(--color-admin-8fb0d0) (사용자 10-22). 시간·내용 사이 8 (캡처) */
export function Recent({ time, more, children }: { time: string | null; more: number | null; children: ReactNode }) {
  return (
    <Row label="최근 활동">
      <div className="flex min-w-0 flex-[1_0_0] items-center gap-2 text-[17px] whitespace-nowrap">
        {time && <span className="text-[color:var(--color-admin-8fb0d0)]">[{time}]</span>}
        <span className="truncate text-neutral-100">{children}</span>
      </div>
      {more != null && more > 0 && <span className="shrink-0 text-[16px] font-bold text-[color:var(--color-admin-8fb0d0)]">외 {more}건</span>}
    </Row>
  )
}

/** 줄 사이 24 상자인지 — 줄이 여백·선 위치를 바꾼다 */
const Wide = createContext(false)

/** 열 수 있는 팝업 — 하나만 열린다 (그래프 칸 팝업 · 자산 대장) */
export type Popup = 'types' | 'asset' | null

/** 요약 상자 — 560×672, 여백 20, 사이 16, 둥글기 16, Neutral-600 (사용자 10-22). 제목 B1 흰색 · 갱신 B5 Neutral-200.
 *  wide: 줄 사이 24 (데이터베이스 디자인, 사용자 10-22). 장비 정보 막대는 세 화면 모두 같은 모양 (사용자 10-22)
 *  children 은 줄들 — 팝업 상태를 받아 그래프 칸 팝업을 열 수 있다 */
export function SummaryFrame({ seq, label, title, updated, wide, children }: { seq: number; label: string; title: string; updated: string; wide?: boolean; children: (popup: Popup, toggle: (p: 'types' | 'asset') => void) => ReactNode }) {
  const [popup, setPopup] = useState<Popup>(null)
  const toggle = (p: 'types' | 'asset') => setPopup((o) => (o === p ? null : p))
  return (
    <section aria-label={label} className={`relative flex h-[672px] w-[560px] shrink-0 flex-col items-start ${wide ? 'gap-6' : 'gap-4'} rounded-2xl bg-neutral-600 p-5 font-['Roboto',sans-serif]`}>
      <div className="flex items-center justify-between self-stretch">
        <h3 className="text-b1 text-white">{title}</h3>
        <span className="text-b5 text-neutral-200">갱신 {updated}</span>
      </div>

      <Wide.Provider value={!!wide}>{children(popup, toggle)}</Wide.Provider>

      {/* 장비 정보 — 522×40 var(--color-admin-0a1830), 둥글기 10, 테두리 var(--color-admin-rgba-100-160-230-28) · 올리면 var(--color-admin-4da3ff) (팝업 CSS 문서), 글씨 Inter 700 흰색 · ▴(닫힘)/▾(열림) var(--color-admin-4da3ff) (피그마 14 → 사용자 요청으로 16). 왼쪽 여백 13 (피그마).
          한글은 맥 기본 글꼴로 그려져 가운데보다 2 위로 뜬다 (사용자 캡처에서 잼, 10-22) — 위 여백 4 로 글씨를 2 내림 */}
      <button
        type="button"
        aria-expanded={popup === 'asset'}
        onClick={() => toggle('asset')}
        className="mt-auto flex h-10 w-[522px] shrink-0 cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--color-admin-rgba-100-160-230-0-28)] bg-[var(--color-admin-0a1830)] px-[13px] pt-1 font-['Inter',sans-serif] text-[16px] font-bold hover:border-[var(--color-admin-4da3ff)]"
      >
        <span className="text-white">장비 정보 — 자산 대장</span>
        <span className="text-[color:var(--color-admin-4da3ff)]">{popup === 'asset' ? '▾' : '▴'}</span>
      </button>
      {popup === 'asset' && <AssetPopup seq={seq} onClose={() => setPopup(null)} onShowAll={() => admin.set({ tab: 'asset', device: null })} />}
    </section>
  )
}
