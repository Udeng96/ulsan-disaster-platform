// 급경사지 머리 — 메뉴 버튼 아래 서브탭 + 요약 바 (세 서브탭 공통, 높이 168).
//   요약 바 왼쪽은 관리지역 등급별 개수, 오른쪽은 상시계측 지역 탭(상태 배지).
//   지역 배지는 총괄·조기경보에선 가벼운 요약(1분)을, 계측 상세에선 이미 1분마다 받는 계측값을 쓴다.
import { memo, useMemo } from 'react'
import { AREAS, type Area } from '@/features/menus/steep-slope/data'
import { cn, SubTabs } from '@/shared/ui'
import type { SlopeArea } from './api'
import { areaLevel } from './colors'
import { areaSummary, managedAreas, slopeAreas } from './data'
import { focusSlope, slope, SLOPE_TABS, type SlopeTab } from './state'


const title = 'font-sans text-[18px] leading-5 font-medium text-slope-label'
const value = 'font-sans text-[18px] leading-5 font-extrabold text-white'

function Grade({ label, count }: { label: string; count: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={title}>{label}</span>
      <span className={value}>{count}</span>
    </span>
  )
}

/** 지역 탭 — 같은 지역을 다시 누르면 해제(지도 이동 없음), 아니면 그 지역으로 지도 이동 */
function pickArea(area: Area, locations: readonly SlopeArea[]) {
  if (slope.get().area === area) {
    slope.set({ area: null, focus: null })
    return
  }
  slope.set({ area })
  const t = locations.find((a) => a.name === area)
  if (t && t.lat !== null && t.lng !== null) focusSlope({ name: t.name, lat: t.lat, lng: t.lng })
}

function SummaryBar() {
  const measure = slope.use((s) => s.tab === 'measure')
  const selected = slope.use((s) => s.area)
  const managed = managedAreas.use()
  const summary = areaSummary.use(measure ? 'off' : 'poll')
  const areas = slopeAreas.use()
  const byGrade = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const a of managed) if (a.grade) acc[a.grade] = (acc[a.grade] ?? 0) + 1
    return acc
  }, [managed])

  return (
    <div className="flex h-[72px] w-[1888px] items-center justify-between rounded-xl border-2 border-neutral-450 bg-neutral-700 py-2.5 pr-5 pl-6">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <span className={title}>급경사지</span>
          <span className={value}>총 {managed.length} 개소</span>
        </div>
        <div className="flex items-center gap-5">
          <span className={title}>· 일반관리대상</span>
          {['A', 'B', 'C'].map((g) => (
            <Grade key={g} label={`${g}등급`} count={byGrade[g] ?? 0} />
          ))}
        </div>
        <div className="flex items-center gap-5">
          <span className={title}>· 붕괴위험지역</span>
          {['D', 'E'].map((g) => (
            <Grade key={g} label={`${g}등급`} count={byGrade[g] ?? 0} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-7">
        <span className="font-sans text-[22px] leading-[26px] font-semibold text-primary">상시계측관리체계 시스템</span>
        <div className="flex items-center gap-2.5">
          {AREAS.map((area) => {
            // 순서는 AREAS 고정 — 응답 순서와 상관없이 이름으로 맞춘다
            const src = measure ? areas.find((a) => a.name === area) : summary.find((s) => s.name === area)
            const level = areaLevel(src?.level)
            const on = selected === area
            return (
              <button
                key={area}
                type="button"
                aria-pressed={on}
                onClick={() => pickArea(area, areas)}
                className={cn('flex h-[46px] w-[161px] items-center justify-between rounded-[100px] px-2.5 py-1.5', on ? 'bg-area-tab-on' : 'bg-area-tab hover:bg-neutral-450 hover:bg-none')}
              >
                {/* 이름 칸 83 고정 — 이름 길이가 달라도 배지 자리가 같다. 한글이 위로 떠 보여 1px 내림 */}
                <span className="relative top-px w-[83px] shrink-0 text-center font-sans text-[18px] leading-5 font-medium text-white">{area}</span>
                <span className={cn('flex h-7 w-[50px] shrink-0 items-center justify-center rounded-[100px] px-3 py-1.5 text-center font-sans text-[14px] leading-4 font-medium whitespace-nowrap text-neutral-900', level.bg)}>
                  <span className="relative top-px">{level.text}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const onTab = (tab: SlopeTab) => slope.set({ tab })

/** closing: 메뉴를 떠나는 중 — 내용이 먼저 사라지고 자리가 닫힌다 (tokens.css animate-slope-*).
 *  swap: 관리자에서 옴 — 관리자 머리 줄 자리를 그대로 이어 받아 열지 않고, 내용만 바로 내려온다 (사용자 10-23) */
export const SlopeHeader = memo(function SlopeHeader({ closing = false, swap = false }: { closing?: boolean; swap?: boolean }) {
  const tab = slope.use((s) => s.tab)
  return (
    <div className={cn('h-[168px] shrink-0 overflow-hidden', closing ? 'animate-slope-close' : !swap && 'animate-slope-open')}>
      <div className={cn('flex flex-col items-center gap-3 pb-3', closing ? 'animate-slope-out' : swap ? 'animate-admin-body-in' : 'animate-slope-in')}>
        <SubTabs tabs={SLOPE_TABS} active={tab} onChange={onTab} />
        <SummaryBar />
      </div>
    </div>
  )
})
