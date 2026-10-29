// 자산대장 탭 — 머리 공지 줄 오른쪽에 검색어 칸 · 보기 버튼(관리·계약 / 기술 사양), 본문은 대장 표. 디자인 값을 받는 대로 하나씩 채운다 (사용자 10-23).
//   표 값은 server /servers (관리·계약) · /server-specs (기술 사양), 탭 열 때 한 번 받음. 못 받은 칸은 '확인 필요', 서버에 없는 칸은 '-' (사용자 10-23)
import { memo, useRef } from 'react'
import { ScrollBar } from '@/shared/ui/ScrollBar'
import type { Ledger, Spec } from './api'
import { ledger, specs } from './data'
import { admin, ASSET_VIEWS, type AssetView } from './state'
import { NONE } from './view'

const onKeyword = (keyword: string) => admin.set({ keyword })

/** 검색어 칸 — 270 폭, 여백 8 (피그마 4 → 사용자 10-23 '검색 영역 padding 8'), 돋보기·글 사이 8 (피그마 gap 4 는 묶음 값 — 사용자 10-23 '아이콘하고 8'), 끝까지 둥글게, 테두리 2 Neutral-450(var(--color-neutral-450)), 바탕 흰 10% (사용자 10-23 피그마).
 *  돋보기 17 (흰 선 · 50%), 글씨 Roboto 400 16 · 안내 글 var(--color-tab-idle), 길면 '…' */
export const AssetSearch = memo(function AssetSearch() {
  const keyword = admin.use((s) => s.keyword)
  return (
    <label className="flex w-[270px] shrink-0 items-center gap-2 rounded-full border-2 border-[var(--color-neutral-450)] bg-white/10 p-2">
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none" className="shrink-0" aria-hidden>
        <g opacity="0.5">
          <path d="M12.6001 7.69961C12.6001 10.4058 10.4063 12.5996 7.7001 12.5996C4.9939 12.5996 2.8001 10.4058 2.8001 7.69961C2.8001 4.99341 4.9939 2.79961 7.7001 2.79961C10.4063 2.79961 12.6001 4.99341 12.6001 7.69961Z" strokeWidth="1.4" stroke="white" />
          <path d="M14.0002 13.9992L11.2002 11.1992" strokeWidth="1.54" strokeLinecap="round" stroke="white" />
        </g>
      </svg>
      <input
        value={keyword}
        onChange={(e) => onKeyword(e.target.value)}
        placeholder="검색어 입력"
        aria-label="자산 검색"
        className="min-w-0 flex-[1_0_0] truncate border-0 bg-transparent font-['Roboto',sans-serif] text-[16px] leading-normal font-normal text-white outline-none placeholder:text-[color:var(--color-tab-idle)]"
      />
    </label>
  )
})

/** 보기 버튼 — 바깥: 여백 4 · 사이 4 · 끝까지 둥글게 · 테두리 2 var(--color-neutral-450) · 바탕 Neutral-700(var(--color-neutral-700)).
 *  버튼 하나 150 폭 · 위아래 8, 글씨 Roboto 500 18 · 길면 '…'. 고른 것: 둥글게 · 테두리 1 var(--color-admin-rgba-66-184-255-6) · 바탕 var(--color-neutral-450) · 흰 글씨, 안 고른 것: var(--color-tab-idle) 글씨
 *  (사용자 10-23 피그마). 안 고른 것도 투명 테두리 1 을 둬서 고를 때 크기가 안 바뀜 */
export const AssetViewToggle = memo(function AssetViewToggle() {
  const view = admin.use((s) => s.view)
  return (
    <div role="group" aria-label="자산대장 보기" className="flex shrink-0 items-center gap-1 rounded-full border-2 border-[var(--color-neutral-450)] bg-[var(--color-neutral-700)] p-1">
      {ASSET_VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          aria-pressed={view === v.id}
          onClick={() => admin.set({ view: v.id })}
          className={`flex w-[150px] cursor-pointer items-center justify-center rounded-full border py-2 font-['Roboto',sans-serif] text-[18px] leading-normal font-medium ${
            view === v.id ? 'border-[var(--color-admin-rgba-66-184-255-0-6)] bg-[var(--color-neutral-450)] text-white' : 'border-transparent text-[color:var(--color-tab-idle)]'
          }`}
        >
          <span className="truncate">{v.label}</span>
        </button>
      ))}
    </div>
  )
})

/** 표 칸 — 폭은 피그마 그대로 (합 2436 이라 상자 1884 를 넘어 가로 스크롤, 캡처도 아래 스크롤바). 연번만 가운데 (사용자 10-23 피그마).
 *  연번 · 명칭 · 호스트명은 왼쪽에 고정, IP 부터만 가로로 움직임 (사용자 10-23) — 고정 칸은 바탕을 칠해 밑으로 지나가는 칸을 가림 */
type Column = { label: string; w: string; fix?: string }

const PINNED: Column[] = [
  { label: '연번', w: 'w-[42px] justify-center', fix: 'sticky left-0 z-[1]' },
  { label: '명칭', w: 'w-[146px]', fix: 'sticky left-[42px] z-[1]' },
]

const CONTRACT_COLUMNS: Column[] = [
  ...PINNED,
  { label: '호스트명', w: 'w-[270px]', fix: 'sticky left-[188px] z-[1]' },
  { label: 'IP', w: 'w-[128px]' },
  { label: '망 이름', w: 'w-[94px]' },
  { label: '관리 주체', w: 'w-[124px]' },
  { label: '모델명', w: 'w-[292px]' },
  { label: '물품식별번호', w: 'w-[166px]' },
  { label: 'S/N', w: 'w-[262px]' },
  { label: '도입일', w: 'w-[72px]' },
  { label: '유지보수 업체', w: 'w-[240px]' },
  { label: '유지보수 연락처', w: 'w-[240px]' },
  { label: '비고', w: 'w-[360px]' },
]

/** 기술 사양 보기 칸 — 틀은 관리·계약과 같고 칸만 다름, 호스트명 150 (사용자 10-23 피그마).
 */
const SPEC_COLUMNS: Column[] = [
  ...PINNED,
  { label: '호스트명', w: 'w-[150px]', fix: 'sticky left-[188px] z-[1]' },
  { label: 'IP', w: 'w-[128px]' },
  { label: 'OS', w: 'w-[138px]' },
  { label: '커널/펌웨어', w: 'w-[314px]' },
  { label: 'CPU (실측)', w: 'w-[246px]' },
  { label: 'CPU (규격서)', w: 'w-[250px]' },
  { label: '소켓×코어/스레드', w: 'w-[120px]' },
  { label: 'RAM (실측)', w: 'w-[332px]' },
  { label: 'RAM (규격서)', w: 'w-[130px]' },
  { label: '저장장치 (논리)', w: 'w-[230px]' },
  { label: '저장장치 (물리)', w: 'w-[300px]' },
  { label: 'RAID', w: 'w-[320px]' },
  { label: 'NIC 구성', w: 'w-[260px]' },
  { label: '전원', w: 'w-[360px]' },
  { label: '핵심 앱·서비스', w: 'w-[260px]' },
  { label: '백업 대상·주기', w: 'w-[140px]' },
  { label: '비고', w: 'w-[320px]' },
]

/** 표 머리 — 바탕 Neutral-700(var(--color-neutral-700)), 칸마다 여백 8 · 사이 8, 글씨 Roboto 600 14 흰색 (사용자 10-23 피그마) */
function HeaderRow({ columns }: { columns: Column[] }) {
  return (
    <div role="row" className="flex shrink-0 items-center self-stretch bg-[var(--color-neutral-700)]">
      {columns.map((c) => (
        <span
          key={c.label}
          role="columnheader"
          className={`flex shrink-0 items-center gap-2 bg-[var(--color-neutral-700)] p-2 font-['Roboto',sans-serif] text-[14px] leading-normal font-semibold whitespace-nowrap text-white ${c.w} ${c.fix ?? ''}`}
        >
          {c.label}
        </span>
      ))}
    </div>
  )
}

const C = '확인 필요'

/** 칸 — 글만 있으면 보통 칸, real: 실측 확정(초록), bad: 조치 필요(빨강) */
type Cell = string | { t: string; tone: 'real' | 'bad' }
/** warn: 조치 필요 줄 (줄 바탕이 붉음, 캡처) — 서버에 조치 필요 표시가 없어 지금은 안 씀 (8-관리자.md) */
type Row = { warn?: boolean; cells: Cell[] }

/** 값 칸 — 못 받은 칸(null)은 '확인 필요' 노랑 (디자인 범례 '확인 필요 · 미기입'). 실측 칸은 초록 */
const val = (v: string | null | undefined): Cell => (v == null || v === '' ? C : v)
const real = (v: string | null | undefined): Cell => (v == null || v === '' ? C : { t: v, tone: 'real' })

/** 관리·계약 줄 — /servers (자산 엑셀). 호스트명은 확정된 것만 (1·2·10·11번은 아직 '확인 필요') */
const contractRow = (l: Ledger): Row => ({
  cells: [String(l.seq), l.name, l.hostConfirmed ? l.host : C, val(l.ip), val(l.networkName), val(l.manager), val(l.model), val(l.itemId), val(l.serialNo), val(l.introDate), val(l.vendor), val(l.vendorTel), val(l.note)],
})

/** 기술 사양 줄 — /server-specs. 실측 칸(CPU·RAM·저장장치 논리)은 초록 */
const specRow = (s: Spec): Row => ({
  cells: [
    String(s.seq), s.name, val(s.host), val(s.ip), val(s.os), val(s.kernel), real(s.cpuMeasured), val(s.cpuSpec), val(s.socketsCores), real(s.ramMeasured), val(s.ramSpec),
    real(s.storageLogical), val(s.storagePhysical), val(s.raid), val(s.nic), val(s.power), val(s.apps), val(s.backup), val(s.note),
  ],
})

/** 검색 — 칸 글 어디에든 들어 있으면 (대소문자 무시) */
const matches = (r: Row, q: string) => !q || r.cells.some((c) => text(c).toLowerCase().includes(q))

const COLUMNS = { contract: CONTRACT_COLUMNS, spec: SPEC_COLUMNS } satisfies Record<AssetView, Column[]>

/** 표 줄 — 높이 40 (아래 선 1 var(--color-admin-182a46) 포함), 바탕 var(--color-admin-0a1224) · 조치 필요 줄 var(--color-admin-191626), 글씨 Roboto 400 14 흰색, 칸 여백 8.
 *  '확인 필요' 칸은 바탕 var(--color-admin-372e03) · 글씨 var(--color-admin-f2c549). 넘치는 글은 캡처처럼 잘림 (마우스 올리면 전체). 색·높이는 캡처에서 뽑음 (사용자 10-23).
 */
const text = (c: Cell) => (typeof c === 'string' ? c : c.t)

/** 칸 색 — 확인 필요 노랑, 해당 없음(—) 회청 var(--color-admin-8fb0d0) (범례), 실측 확정 바탕 var(--color-admin-182e19) · 글씨 var(--color-admin-86e171), 조치 필요 바탕 var(--color-admin-330f13) · 글씨 var(--color-accent-red) (색은 캡처에서 뽑음, 초록·빨강 글씨는 캡처처럼 조금 굵게 500) */
function tone(c: Cell, bg: string) {
  if (c === C) return 'bg-[var(--color-admin-372e03)] font-normal text-[color:var(--color-admin-f2c549)]'
  if (c === '—') return `${bg} font-normal text-[color:var(--color-admin-8fb0d0)]`
  if (typeof c === 'string') return `${bg} font-normal text-white`
  return c.tone === 'real' ? 'bg-[var(--color-admin-182e19)] font-medium text-[color:var(--color-admin-86e171)]' : 'bg-[var(--color-admin-330f13)] font-medium text-[color:var(--color-accent-red)]'
}

function BodyRow({ columns, warn, cells }: Row & { columns: Column[] }) {
  const bg = warn ? 'bg-[var(--color-admin-191626)]' : 'bg-[var(--color-admin-0a1224)]'
  return (
    <div role="row" className="flex h-10 shrink-0 items-stretch self-stretch border-b border-[var(--color-admin-182a46)]">
      {columns.map((c, i) => (
        <span
          key={c.label}
          role="cell"
          title={text(cells[i])}
          className={`flex shrink-0 items-center overflow-hidden p-2 font-['Roboto',sans-serif] text-[14px] leading-normal whitespace-nowrap ${c.w} ${c.fix ?? ''} ${
            tone(cells[i], bg)
          }`}
        >
          {text(cells[i])}
        </span>
      ))}
    </div>
  )
}

/** 범례 — 칸마다 여백 8 · 둥글기 8 · Roboto 400 12 (사용자 10-23 피그마).
 *  확인 필요 노랑 15% · var(--color-accent-yellow), 해당 없음 var(--color-admin-8fb0d0), 실측 확정 초록 15% var(--color-accent-green), 조치 필요 hsl(345,71%,18%) · var(--color-accent-red), 완료 흰색.
 *  범례 사이 8 · 오른쪽 기준 글씨(12 · var(--color-admin-8fb0d0)) 는 캡처 보고 맞춤 */
const LEGEND = [
  { label: '확인 필요 · 미기입', cls: 'bg-[var(--color-admin-rgba-255-214-0-0-15)] text-[color:var(--color-accent-yellow)]' },
  { label: '— 해당 없음', cls: 'text-[color:var(--color-admin-8fb0d0)]' },
  { label: '실측 확정', cls: 'bg-[var(--color-admin-rgba-69-227-108-0-15)] text-[color:var(--color-accent-green)]' },
  { label: '조치 필요', cls: 'bg-[hsl(345deg_71.1111%_17.6471%)] text-[color:var(--color-accent-red)]' },
  { label: '완료', cls: 'text-white' },
]

/** 자산대장 본문 — 공지 아래 큰 상자 1888 (세로로 쌓음, 둥글기 12, 테두리 2 var(--color-neutral-450)) 안에 (사용자 10-23 피그마):
 *  조치 필요 줄 — 높이 42 (안 내용 16 + 여백 12·12 + 아래 선 2), 여백 12·20, 사이 16, 아래 선 2 var(--color-neutral-450), 바탕 빨강 30% ·
 *  표 영역 — 남는 높이, 아래 여백 8, 사이 8 (피그마 폭 1888 은 테두리 안쪽에 맞춰 늘림) ·
 *  범례 줄 — 높이 42, 양옆 8, 양끝 정렬, 위 선 2 var(--color-neutral-450), 바탕 var(--color-admin-rgba-27-70-113-2). 안의 글·표는 값 받는 대로 */
export const AssetLedger = memo(function AssetLedger() {
  const tableRef = useRef<HTMLDivElement>(null)
  const view = admin.use((s) => s.view)
  const q = admin.use((s) => s.keyword).trim().toLowerCase()
  const list = ledger.use()
  const specList = specs.use()
  const columns = COLUMNS[view]
  const rows = (view === 'contract' ? list.map(contractRow) : specList.map(specRow)).filter((r) => matches(r, q))
  return (
    <main aria-label="자산대장" className="mx-4 mb-2 flex min-h-0 flex-[1_0_0] flex-col overflow-hidden">
      <div className="flex min-h-0 w-[1888px] flex-[1_0_0] flex-col items-start overflow-hidden rounded-xl border-2 border-[var(--color-neutral-450)]">
        <div aria-label="조치 필요" className="flex h-[42px] shrink-0 items-center gap-4 self-stretch border-b-2 border-[var(--color-neutral-450)] bg-[var(--color-admin-rgba-255-0-0-0-3)] px-5 py-3">
          <span className="flex shrink-0 items-center gap-1.5 font-['Roboto'] text-[14px] font-bold text-[color:var(--color-accent-red)]">
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
              <circle cx="4" cy="4" r="4" fill="var(--color-admin-ff0000)" />
            </svg>
            조치 필요 {NONE}
          </span>
          {/* 조치 필요 내용 — 서버에 없음 (8-관리자.md) → '-' (사용자 10-23) */}
          <span className="min-w-0 truncate font-['Roboto'] text-[13px] text-[hsl(358.8deg_100%_90.3245%)]">{NONE}</span>
        </div>
        <div className="flex min-h-0 flex-[1_0_0] flex-col items-start gap-2 self-stretch pb-2">
          {/* 표 — 넘치면 가로 스크롤, 스크롤바는 공통 ScrollBar (기본 스크롤바 숨김) */}
          <div ref={tableRef} role="table" aria-label="자산 표" className="flex min-h-0 flex-[1_0_0] flex-col self-stretch overflow-x-auto overscroll-x-none [scrollbar-width:none]">
            {/* 안쪽은 칸 합 폭 — 스크롤해도 머리 바탕이 끝까지 */}
            <div className="flex w-max min-w-full flex-col">
              <HeaderRow columns={columns} />
              {rows.map((r) => (
                <BodyRow key={text(r.cells[0])} columns={columns} {...r} />
              ))}
            </div>
          </div>
          <ScrollBar target={tableRef} axis="x" />
        </div>
        <div aria-label="범례" className="flex h-[42px] shrink-0 items-center justify-between self-stretch border-t-2 border-[var(--color-neutral-450)] bg-[var(--color-admin-rgba-27-70-113-0-2)] px-2">
          <div className="flex items-center gap-2">
            {LEGEND.map((l) => (
              <span key={l.label} className={`flex items-center gap-4 rounded-lg p-2 font-['Roboto',sans-serif] text-[12px] leading-normal font-normal ${l.cls}`}>
                {l.label}
              </span>
            ))}
          </div>
          <span className="font-['Roboto',sans-serif] text-[12px] leading-normal font-normal text-[color:var(--color-admin-8fb0d0)]">기준: 자산대장 v2.2 (2026-09-17)</span>
        </div>
      </div>
    </main>
  )
})
