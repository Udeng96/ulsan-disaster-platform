// 이벤트 조회 결과 — 건수·조회 시각 + 목록 (줄을 누르면 지도가 그 이벤트로, ⌄ 로 상세 내용).
import { memo, useState } from 'react'
import { cn } from '@/shared/ui'
import { dash } from '../../dashboard/state'
import type { OwlEvent } from './api'
import { eventKey, eventTypeColor, fullTime, rowTime, shortLocation } from './logic'
import { clickRow, events } from './state'

function ExpandIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <g opacity="0.9">
        <rect y="0.00012207" width="24" height="24" rx="12" className="fill-white" fillOpacity="0.08" />
        <rect x="0.5" y="0.500122" width="23" height="23" rx="11.5" className="stroke-white" strokeOpacity="0.16" />
      </g>
      <path d="M8.5 11.0938L12 14.5938L15.5 11.0938" className="stroke-neutral-100" strokeWidth="1.3125" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const cell = 'flex shrink-0 flex-col items-start gap-2.5 py-4 pr-1'

const Row = memo(function Row({ event, active, isNew }: { event: OwlEvent; active: boolean; isNew: boolean }) {
  const [open, setOpen] = useState(false)
  // 상세 — 제목 + 요약(신고내역 등)
  const content = [event.title, event.summary].filter(Boolean).join('\n')
  return (
    <div
      aria-current={active || undefined}
      onClick={() => clickRow(event)}
      className={cn(
        'flex w-[450px] rounded-[10px] border px-4',
        open ? 'flex-col items-start justify-center gap-1.5 pb-2' : 'items-center',
        // 고름(파랑)이 신규(빨강)보다 먼저. 두께는 1px 테두리 + 안쪽 그림자 2px (줄이 흔들리지 않게)
        active
          ? 'border-primary-light bg-neutral-600 shadow-[inset_0_0_0_2px_var(--color-primary-light)] hover:bg-neutral-450'
          : isNew
            ? 'border-accent-red bg-neutral-600 shadow-[inset_0_0_0_2px_var(--color-accent-red)] hover:bg-neutral-450'
            : 'border-neutral-500 bg-neutral-600 hover:border-neutral-450 hover:bg-neutral-450',
      )}
    >
      <div className={cn('flex w-full items-center', open && 'border-b border-white/10')}>
        <div className={cn(cell, 'w-[120px]')}>
          {/* 대분류별 색 (긴급구조 빨강 · 사회재난 주황 · 자연재난 초록 …) */}
          {/* 긴 유형 이름은 한 줄에서 '…'로 자른다 — 줄 높이가 늘지 않게 (수정사항 20번) */}
          <span className="w-full truncate text-b5 font-semibold" style={{ color: eventTypeColor(event.disasterTypeCode) }}>
            {event.disasterTypeName}
          </span>
        </div>
        <div className={cn(cell, 'w-[126px]')}>
          <span className="text-b5 text-white">{shortLocation(event.regionName)}</span>
        </div>
        <span className="flex-[1_0_0] text-b5 text-white">{rowTime(event.occurDtm)}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setOpen((v) => !v)
          }}
          aria-label={open ? '접기' : '펼쳐보기'}
          className={cn('flex size-6 shrink-0 items-center justify-center transition-turn', open && 'rotate-180')}
        >
          <ExpandIcon />
        </button>
      </div>
      {open && (
        <div className="flex flex-col items-start gap-1.5 self-stretch">
          <div className="flex items-center gap-[7px]">
            <span className="size-[3px] shrink-0 bg-primary-light" />
            <span className="text-b5 text-neutral-200">상세 내용</span>
          </div>
          <div className="flex max-h-[132px] items-start self-stretch overflow-y-auto rounded-[6px] border border-event-detail-line bg-event-detail py-1.5 pr-1 pl-3.5 scroll-slim">
            {/* 요약은 '○ 신고일시 : …' 가 줄바꿈으로 이어진 글 */}
            <p className="m-0 font-sans text-[14px] leading-[22px] font-medium whitespace-pre-line text-white">{content || '상세 내용이 없습니다.'}</p>
          </div>
        </div>
      )}
    </div>
  )
})

const head = 'flex shrink-0 flex-col items-start gap-2.5 py-2 pr-2'

function Rows() {
  const list = events.use((s) => s.list)
  const newKeys = events.use((s) => s.newKeys)
  const active = dash.use((s) => (s.activeEvent ? eventKey(s.activeEvent) : null))
  if (!list.length) return <div className="flex h-full w-full items-center justify-center font-sans text-[16px] font-medium text-white/45">데이터 없음</div>
  return list.map((e) => {
    const key = eventKey(e)
    return <Row key={key} event={e} active={key === active} isNew={newKeys.has(key)} />
  })
}

function Summary() {
  const count = events.use((s) => s.list.length)
  const at = events.use((s) => s.lastUpdated)
  return (
    <div className="flex h-[38px] w-[450px] items-center gap-2 border-b border-neutral-500 px-1.5 pt-[5px] pb-[15px]">
      <div className="flex h-[18px] flex-[1_0_0] items-center gap-1.5">
        <span className="text-b5 text-neutral-300">조회 결과</span>
        <span className="text-b5 text-neutral-50">[{count}건]</span>
      </div>
      <div className="font-sans text-[12px] leading-[14px] font-medium text-neutral-200">Update : {fullTime(at)}</div>
    </div>
  )
}

export const EventList = memo(function EventList({ listHeight }: { listHeight: number }) {
  return (
    <div className="flex flex-col gap-3">
      <Summary />
      <div className="flex flex-col items-start gap-1" style={{ height: listHeight + 36 }}>
        <div className="flex w-[460px] items-center pr-[37px] pl-5">
          <div className={cn(head, 'w-[120px]')}>
            <span className="text-b5 text-neutral-200">이벤트 유형</span>
          </div>
          <div className={cn(head, 'w-[128px]')}>
            <span className="text-b5 text-neutral-200">지역(위치)</span>
          </div>
          <div className={cn(head, 'w-[148px]')}>
            <span className="text-b5 text-neutral-200">발생 일시</span>
          </div>
        </div>
        <div aria-label="이벤트 목록" className="flex w-[460px] shrink-0 flex-col items-start gap-1 overflow-y-auto scroll-slim" style={{ height: listHeight }}>
          <Rows />
        </div>
      </div>
    </div>
  )
})
