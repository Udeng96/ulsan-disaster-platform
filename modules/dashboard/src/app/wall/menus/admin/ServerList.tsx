// 서버 리스트 — 랙 오른쪽 세로 칸(280×672). 줄 13개를 위아래로 고르게 벌린다 (값은 사용자 10-22, 이름·불빛 색은 피그마)
import { memo } from 'react'
import { Index } from './AdminRack'
import { overview } from './data'
import { admin } from './state'
import { LABEL, LIGHT } from './view'

/** 상세 화면이 있는 장비 — 디자인 나오는 대로 늘린다 (지금은 1번 방화벽) */
const DETAIL = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])

/** 이름은 디자인 글 그대로 (13번은 서버 짧은 이름 '(전파) 상황전파' 보다 긺). 불빛은 server /overview 카드 판정 (사용자 10-23) */
const SERVERS: { name: string }[] = [
  { name: '(보안) 방화벽' },
  { name: '(통신) 스위칭 허브' },
  { name: '(저장) 데이터베이스' },
  { name: '(운영) 솔루션' },
  { name: '(운영) 대시보드' },
  { name: '(운영) IoT' },
  { name: '(운영) GIS' },
  { name: '(연계) CCTV' },
  { name: '(연계) 내부' },
  { name: '(연계) 내부망' },
  { name: '(연계) 외부망' },
  { name: '(연계) 외부' },
  { name: '(전파) 상황전파메신저' },
]

export const ServerList = memo(function ServerList() {
  const etc = admin.use((a) => a.tab === 'etc')
  const device = admin.use((a) => (a.tab === 'etc' ? null : a.device))
  const hover = admin.use((a) => a.hover)
  const cards = overview.use('poll')?.cards
  return (
    <section aria-label="서버 리스트" className="flex h-[672px] w-[280px] shrink-0 flex-col items-start justify-between">
      {SERVERS.map((s, i) => {
        const v = cards?.find((c) => c.seq === i + 1)?.verdict ?? 'UNKNOWN'
        return (
          // 한 줄 — 여백 12·20, 둥글기 8, 테두리 var(--color-admin-233e63), 배경 var(--color-admin-rgba-0-26-56-6)
          // 누르면 오른쪽이 그 장비 상세로 바뀌고, 한 번 더 누르면 운영 현황으로 돌아간다
          // 고른 줄 — 바탕 var(--color-admin-rgb-18-58-107) · 테두리 1 var(--color-admin-4da3ff) · 빛 0 0 12 var(--color-admin-rgba-77-163-255-4) (예제 CSS), 마우스 올림 — 테두리만 var(--color-admin-4da3ff). 같은 번호 랙 칸과 함께 (admin.hover, 사용자 10-23)
          <button
            key={s.name}
            type="button"
            disabled={!DETAIL.has(i + 1)}
            aria-pressed={device === i + 1}
            onMouseEnter={() => admin.set({ hover: i + 1 })}
            onMouseLeave={() => admin.set({ hover: null })}
            onClick={() => !etc && admin.set((a) => ({ device: a.device === i + 1 ? null : i + 1 }))}
            className={`flex items-center justify-between self-stretch rounded-lg border px-5 py-3 text-left enabled:cursor-pointer ${
              device === i + 1 ? 'border-[var(--color-admin-4da3ff)] bg-[var(--color-admin-rgb-18-58-107)] shadow-[0_0_12px_var(--color-admin-rgba-77-163-255-0-4)]' : hover === i + 1 ? 'border-[var(--color-admin-4da3ff)] bg-[var(--color-admin-rgba-0-26-56-0-6)]' : 'border-[var(--color-admin-233e63)] bg-[var(--color-admin-rgba-0-26-56-0-6)]'
            }`}
          >
            {/* 번호 원 + 이름(192 폭, Roboto 16·500·줄 높이 20, 흰색), 사이 10 (피그마) */}
            <div className="flex items-center gap-2.5">
              <Index no={i + 1} />
              <div className="flex w-[192px] items-center gap-2">
                <p className="min-w-px flex-[1_0_0] font-['Roboto',sans-serif] text-[16px] leading-5 font-medium text-white">{s.name}</p>
              </div>
            </div>
            {/* 불빛 10×10, 같은 색으로 4 번짐 (피그마) */}
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: LIGHT[v], filter: `drop-shadow(0 0 4px ${LIGHT[v]})` }} aria-label={LABEL[v]} />
          </button>
        )
      })}
    </section>
  )
})
