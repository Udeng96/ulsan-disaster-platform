// 지도 왼쪽 위 '이벤트' 버튼 + 이벤트 패널 (492 폭, 높이는 지도에 맞춤 — 급경사지 672, 나머지 840).
//   닫아도 패널은 그려 둔 채 숨긴다 (펼친 줄·조건이 그대로 남는 옛 화면과 같게).
//   열고 닫을 때는 왼쪽 위(버튼 자리)를 기준으로 작아지며·커지며 흐려진다 (옛 화면과 같은 0.35초).
//   크기(scale)·투명도만 바꿔서 배치를 다시 계산하지 않고, 목록도 다시 그리지 않는다.
import { memo } from 'react'
import { cn, Toast } from '@/shared/ui'
import { dash } from '../../dashboard/state'
import { EventList } from './EventList'
import { SearchForm } from './SearchForm'
import { events } from './state'

// 패널에서 목록 말고 나머지 (조건 + 머리 + 여백) — 840 패널의 목록이 516
const CHROME = 324

const open = () => dash.set({ eventPanelOpen: true })
const close = () => dash.set({ eventPanelOpen: false, activeEvent: null })
const clearToast = () => events.set({ toast: null })

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M9.70825 13L3.70825 7L9.70825 1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EventToast() {
  const toast = events.use((s) => s.toast)
  return <Toast key={toast?.seq ?? 0} message={toast?.message ?? null} onDismiss={clearToast} />
}

export const EventPanel = memo(function EventPanel({ height }: { height: number }) {
  const isOpen = dash.use((s) => s.eventPanelOpen)
  return (
    <>
      <div className={cn('absolute top-0 left-0 z-[1000] flex origin-top-left transition-pop', !isOpen && 'invisible scale-30 opacity-0')} aria-hidden={!isOpen}>
        <div className="flex w-[492px] flex-col items-start gap-4 rounded-2xl border-r border-neutral-450 bg-neutral-800 p-5" style={{ height }}>
          <SearchForm />
          <EventList listHeight={height - CHROME} />
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="이벤트 패널 닫기"
          className="flex h-[62px] w-7 items-center justify-center self-center rounded-r-lg border-y border-r border-neutral-450 bg-neutral-800 text-neutral-200 hover:border-primary-dark hover:bg-neutral-500 hover:text-primary-light"
        >
          <ChevronLeft />
        </button>
      </div>
      <button
        type="button"
        onClick={open}
        aria-hidden={isOpen}
        className={cn(
          'absolute top-5 left-5 z-[1001] inline-flex origin-top-left items-center gap-2.5 overflow-hidden rounded-xl bg-neutral-700 px-6 py-3 text-b1 text-ellipsis whitespace-nowrap text-white shadow-event-button transition-pop hover:bg-neutral-500',
          isOpen && 'invisible scale-60 opacity-0',
        )}
      >
        이벤트
      </button>
      <EventToast />
    </>
  )
})
