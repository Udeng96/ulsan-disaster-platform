// 방화벽 상세 팝업 2개 — 값은 관리자 스레드가 예제 HTML 에서 정리한 CSS 그대로 (admin-work/popup-css/팝업-CSS.md, 사용자 10-22).
//   유형별 내역: 차단 그래프 칸 위를 꽉 덮는다 (부모 relative). 자산 대장: 요약 상자 안 제목 줄 아래부터 여는 막대 위까지 (부모 relative)
//   값은 server — 유형별은 /firewall/block-types (시큐아이 정의서 전까지 IPv4·IPv6·위협 3종), 자산은 /servers/{host} 의 ledger·spec.
//   서버에 칸이 없는 것(장애 신고처·기한 3종)은 '-' (사용자 10-23)
import { Fragment } from 'react'
import type { Ledger, Spec } from './api'
import { detail, firewallBlockTypes, useHost } from './data'
import { NONE } from './view'

/** 유형별 내역 덮개 — 바탕 var(--color-admin-rgba-13-31-60-97), 테두리 1 var(--color-admin-rgba-100-160-230-4), 둥글기 12, 여백 4·12, 줄은 위아래 고르게 */
export function BlockTypes() {
  const types = firewallBlockTypes.use('poll')
  return (
    <div role="dialog" aria-label="유형별 내역" className="absolute inset-0 z-[4] flex animate-fw-fade flex-col justify-around rounded-xl border border-[var(--color-admin-rgba-100-160-230-0-4)] bg-[var(--color-admin-rgba-13-31-60-0-97)] px-3 py-1">
      {types.length === 0 && <span className="text-center text-[14px] text-neutral-200">{NONE}</span>}
      {types.map((t) => (
        // 줄 — 사이 10, 아래 점선 흰 8%. 이름 14 var(--color-neutral-100) (넘치면 말줄임), N건 15·700 흰색 + 차단 빨강
        <div key={t.tag} className="flex items-center gap-2.5 border-b border-dashed border-white/[0.08]">
          <span className="min-w-0 flex-1 truncate text-[14px] whitespace-nowrap text-neutral-100">{t.label}</span>
          <span className="font-['Roboto',monospace] text-[15px] font-bold whitespace-nowrap text-white">
            {t.count}건 <span className="text-[color:var(--color-accent-red)]">차단</span>
          </span>
        </div>
      ))}
    </div>
  )
}

/** 오늘부터 남은 날 — D-34 · D-DAY · D+N 경과. 지남 빨강, 30일 이내 노랑, 그 외 var(--color-neutral-100) (예제) */
function dday(date: string, today = new Date()) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const [y, m, d] = date.split('-').map(Number)
  const left = Math.round((new Date(y, m - 1, d).getTime() - t) / 86_400_000)
  const text = left > 0 ? `D-${left}` : left === 0 ? 'D-DAY' : `D+${-left} 경과`
  const color = left < 0 ? 'var(--color-accent-red)' : left <= 30 ? 'var(--color-admin-ffc53d)' : 'var(--color-neutral-100)'
  return { text, color }
}

type AssetRow = { label: string; value: string | null; until?: string }

/** 4묶음 × 4줄 (예제 줄 구성). 값이 null 이면 '확인 필요' (서버가 아직 모르는 값), '-' 는 서버에 칸이 없는 값 */
function assetGroups(l: Ledger | null | undefined, p: Spec | null | undefined): { title: string; rows: AssetRow[] }[] {
  const join = (...v: (string | null | undefined)[]) => v.filter(Boolean).join(' · ') || null
  return [
    {
      title: '기본 정보',
      rows: [
        { label: '호스트명', value: l?.hostConfirmed ? l.host : null },
        { label: 'IP', value: l?.ip ?? null },
        { label: '모델', value: l?.model ?? null },
        { label: '랙 위치·세트', value: l?.setName ?? NONE },
      ],
    },
    {
      title: '관리·연락',
      rows: [
        { label: '관리 주체', value: l?.manager ?? null },
        { label: '장애 신고처', value: NONE },
        { label: '유지보수 업체', value: l?.vendor ?? null },
        { label: '유지보수 연락처', value: l?.vendorTel ?? null },
      ],
    },
    {
      title: '기한',
      rows: [
        { label: '하자보증 만료', value: NONE },
        { label: '계약 종료일', value: NONE },
        { label: '보안인증 만료', value: NONE },
        { label: '망·소유', value: l?.networkName ?? null },
      ],
    },
    {
      title: '사양',
      rows: [
        { label: 'OS', value: p?.os ?? null },
        { label: 'CPU', value: p?.cpuMeasured ?? p?.cpuSpec ?? null },
        { label: '메모리', value: p?.ramMeasured ?? p?.ramSpec ?? null },
        { label: '저장장치·전원', value: join(p?.storagePhysical, p?.power) },
      ],
    },
  ]
}

/** 값 — 15, 줄 높이 1.45, 좌우 4, 둥글기 4. 보통 var(--color-neutral-50) · '—' var(--color-neutral-300) · 없음 '확인 필요' 바탕 var(--color-admin-3a2e00) 글씨 var(--color-admin-ffc53d) */
function AssetValue({ value }: { value: string | null }) {
  const cls = value === null ? 'bg-[var(--color-admin-3a2e00)] text-[color:var(--color-admin-ffc53d)]' : value === '—' || value === NONE ? 'text-[color:var(--color-neutral-300)]' : 'text-[color:var(--color-neutral-50)]'
  return <span className={`min-w-0 rounded px-1 text-[15px] leading-[1.45] [overflow-wrap:anywhere] break-keep ${cls}`}>{value ?? '확인 필요'}</span>
}

/** 자산 대장 팝업 — 왼쪽·오른쪽 12, 위 58(제목 줄 아래), 아래 66(여는 막대가 보이게), 바탕 var(--color-admin-rgba-13-31-60-98), 테두리 1 var(--color-admin-rgba-100-160-230-4), 둥글기 12, 그림자, 여백 12·14, 사이 8 */
export function AssetPopup({ seq, onClose, onShowAll }: { seq: number; onClose: () => void; onShowAll: () => void }) {
  const host = useHost(seq)
  const d = detail(host ?? '').use(host ? 'once' : 'off')
  const groups = assetGroups(d?.ledger, d?.spec)
  return (
    <div
      role="dialog"
      aria-label="장비 정보 — 자산 대장"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      className="absolute top-[58px] right-3 bottom-[66px] left-3 z-[5] flex animate-fw-slide flex-col gap-2 rounded-xl border border-[var(--color-admin-rgba-100-160-230-0-4)] bg-[var(--color-admin-rgba-13-31-60-0-98)] px-3.5 py-3 shadow-[0_-8px_30px_var(--color-admin-rgba-0-0-0-0-5)]"
    >
      {/* 제목 줄 — 누르면 닫힘. 28 높이, 14·700 흰색, 아래 선 흰 10%, ▾ var(--color-admin-4da3ff) */}
      <button
        type="button"
        autoFocus
        onClick={onClose}
        className="flex h-7 shrink-0 cursor-pointer items-center gap-2 border-b border-white/10 font-['GmarketSans','Noto_Sans_KR',sans-serif] text-[14px] font-bold text-white"
      >
        장비 정보 — 자산 대장 <span className="text-[color:var(--color-admin-4da3ff)]">▾</span>
      </button>
      {/* 스크롤 칸 — 세로만, 오른쪽 6 여백, 스크롤바 6 · 손잡이 var(--color-admin-rgba-77-163-255-35) */}
      <div className="flex min-h-0 flex-auto flex-col gap-1.5 overflow-x-hidden overflow-y-auto pr-1.5 [scrollbar-color:var(--color-admin-rgba-77-163-255-0-35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--color-admin-rgba-77-163-255-0-35)]">
        {groups.map((g) => (
          <Fragment key={g.title}>
            {/* 묶음 제목 — 28 높이, 위 6, 14·700 var(--color-admin-8fb0d0), 아래 선 흰 12% */}
            <div className="mt-1.5 flex h-7 shrink-0 items-center border-b border-white/[0.12] text-[14px] font-bold text-[color:var(--color-admin-8fb0d0)]">{g.title}</div>
            {g.rows.map((r) => {
              const d = r.until ? dday(r.until) : null
              return (
                // 줄 — 최소 28, 이름 140 + 값, 사이 8, 위아래 3, 아래 선 흰 6%
                <div key={r.label} className="grid min-h-7 shrink-0 grid-cols-[140px_minmax(0,1fr)] items-center gap-2 border-b border-white/[0.06] py-[3px]">
                  <span className="text-[13px] leading-[1.4] break-keep text-[color:var(--color-admin-8fb0d0)]">{r.label}</span>
                  <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                    <AssetValue value={r.value} />
                    {d && (
                      <span className="text-[14px] font-bold whitespace-nowrap" style={{ color: d.color }}>
                        {d.text}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
      {/* 맨 아래 — 자산대장 전체 보기 (누르면 닫고 자산대장 탭으로), 13 var(--color-admin-4da3ff), 올리면 var(--color-admin-7cc8ff) */}
      <div className="mt-auto flex shrink-0 justify-end">
        <button type="button" onClick={onShowAll} className="cursor-pointer text-[13px] text-[color:var(--color-admin-4da3ff)] hover:text-[color:var(--color-admin-7cc8ff)]">
          자산대장 전체 보기 →
        </button>
      </div>
    </div>
  )
}
