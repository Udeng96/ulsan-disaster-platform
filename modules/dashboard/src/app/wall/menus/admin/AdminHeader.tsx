// 관리자 머리 — 메뉴 버튼 아래 서브탭 4개 + 공지 줄 (급경사지 머리와 같은 틀). 높이 162 = 탭 62 + 12 + 공지 72 + 랙까지 16 (사용자 10-22)
//   공지 줄: 서버실 랙 총 대수와 정상·주의·장애 대수 배지 — server /overview counts (카드와 같은 값, 사용자 10-23)
import { memo } from 'react'
import { cn, SubTabs } from '@/shared/ui'
import { AssetSearch, AssetViewToggle } from './AssetLedger'
import { overview } from './data'
import { admin, ADMIN_TABS, type AdminTab } from './state'
import { NONE } from './view'

const title = 'font-sans text-[18px] leading-5 font-medium text-slope-label'
const value = 'font-sans text-[18px] leading-5 font-extrabold text-white'

function Count({ label, count, bg }: { label: string; count: number | undefined; bg: string }) {
  return (
    <span className={cn('flex h-7 items-center justify-center gap-1 rounded-[100px] px-3 font-sans text-[14px] leading-4 font-medium whitespace-nowrap text-neutral-900', bg)}>
      <span className="relative top-px">
        {label} {count ?? NONE}
      </span>
    </span>
  )
}

/** 자산대장 탭이면 오른쪽 끝에 검색어 칸 · 보기 버튼 (사이 20 — 캡처에서 잼, 사용자 10-23) */
function NoticeBar({ asset }: { asset: boolean }) {
  const counts = overview.use('poll')?.counts
  return (
    <div className="flex h-[72px] w-[1888px] items-center justify-between rounded-xl border-2 border-neutral-450 bg-neutral-700 py-2.5 pr-5 pl-6">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <span className={title}>서버실 랙</span>
          <span className={value}>· 총 {counts?.total ?? NONE} 대</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Count label="정상" count={counts?.ok} bg="bg-accent-green" />
          <Count label="주의" count={counts?.warn} bg="bg-accent-yellow" />
          <Count label="장애" count={counts?.fail} bg="bg-accent-red" />
        </div>
      </div>
      {asset && (
        <div className="flex items-center gap-5">
          <AssetSearch />
          <AssetViewToggle />
        </div>
      )}
    </div>
  )
}

// 탭을 바꾸면 고른 장비·마우스 올림을 풂 — 서버 운영과 기타는 따로 동작 (사용자 10-23)
const onTab = (tab: AdminTab) => admin.set({ tab, device: null, hover: null })

/** closing: 메뉴를 떠나는 중 — 내용이 먼저 사라지고 자리가 닫힌다 (tokens.css animate-admin-* · 급경사지와 같은 방식).
 *  swap: 급경사지에서 옴 — 급경사지 머리 줄 자리를 그대로 이어 받아 열지 않는다 (본문이 두 번 밀려 내려가지 않게, 사용자 10-23) */
export const AdminHeader = memo(function AdminHeader({ closing = false, swap = false }: { closing?: boolean; swap?: boolean }) {
  const tab = admin.use((s) => s.tab)
  return (
    <div className={`h-[162px] shrink-0 overflow-hidden ${closing ? 'animate-admin-close' : swap ? '' : 'animate-admin-open'}`}>
      <div className={`flex flex-col items-center gap-3 pb-3 ${closing ? 'animate-slope-out' : 'animate-admin-in'}`}>
        {/* 탭 하나 306 · 위아래 여백 10 (사용자 10-22). 칸이 4개라 줄은 급경사지(960)보다 넓다 — 칸 사이는 급경사지와 같은 14 */}
        <SubTabs tabs={ADMIN_TABS} active={tab} onChange={onTab} className="w-[1280px]" tabClassName="py-2.5" />
        <NoticeBar asset={tab === 'asset'} />
      </div>
    </div>
  )
})
