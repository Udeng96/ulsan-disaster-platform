import { COLORS } from '@/styles/designTokens'
import { useCallback, useEffect, useState } from 'react'
import { EventSearchForm } from './EventSearchForm'
import { EventResultSection } from './EventResultSection'
import {
  searchEvents,
  type EventListItem,
  type EventSearchParams,
  eventKey,
  isToday,
} from '@/api/event'
import { useOwlEventStream } from '@/api/owlEventStream'

// 패널 높이 중 목록 외 영역 (검색 폼 + 헤더 + padding/gap) — 840 패널의 목록 516 기준.
const PANEL_CHROME_HEIGHT = 324

interface Props {
  onClose: () => void
  /** 패널 높이 (default 840). 지도가 짧은 화면(급경사지 672)에선 그만큼 줄인다. */
  height?: number
  /** 현재 활성 이벤트 — row is-active 표출 + 검색 시 해제 처리용 */
  activeEvent: EventListItem | null
  onActivateEvent: (e: EventListItem | null) => void
}

function ChevronLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <g clipPath="url(#clip0_343_5108)">
        <path
          d="M9.70825 13L3.70825 7L9.70825 1"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_343_5108">
          <rect
            width="14"
            height="14"
            fill="white"
            transform="translate(6.11959e-07 14) rotate(-90)"
          />
        </clipPath>
      </defs>
    </svg>
  )
}

export function EventPanel({
  onClose,
  activeEvent,
  onActivateEvent,
  height = 840,
}: Props) {
  const [events, setEvents] = useState<EventListItem[]>([])
  // 마지막 조회 시각 — 페이지 진입 (mount) 시 초기 설정 + 조회 클릭 시마다 갱신.
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date())
  // SSE 로 새로 들어온 이벤트 id — row 에 빨간 border 표출. 클릭(활성화) 시 해제.
  // 신규(미확인) 이벤트 키 — msgId+msgSn (서버가 id 를 안 주는 경우가 있다).
  const [newEventIds, setNewEventIds] = useState<ReadonlySet<string>>(new Set())

  // 검색 실행 — EventSearchForm 의 onSearch 콜백. searchEvents 결과로 목록 갱신.
  const runSearch = (params: EventSearchParams) => {
    onActivateEvent(null)
    setLastUpdated(new Date())
    setNewEventIds(new Set()) // 재조회 시 신규 표시 해제
    searchEvents(params)
      // 금일 발생 건만 표출.
      .then((rows) => setEvents(rows.filter(isToday)))
      .catch((err) => {
        console.warn('[event] 조회 실패', err)
        setEvents([])
      })
  }

  // 패널 진입 시 전체 조건으로 최초 1회 자동 조회 (조회 버튼 없이도 목록 표출).
  useEffect(() => {
    searchEvents({ typeIds: [], subTypeIds: [], regionIds: [] })
      // 금일 발생 건만 표출.
      .then((rows) => setEvents(rows.filter(isToday)))
      .catch((err) => console.warn('[event] 초기 조회 실패', err))
  }, [])

  // SSE 실시간 수신 — 새 이벤트를 목록 맨 위에 추가 (같은 id 는 최신으로 교체).
  const handleStreamEvent = useCallback((incoming: EventListItem) => {
    if (!isToday(incoming)) return // 금일 건만 목록에 올린다.
    const key = eventKey(incoming)
    setEvents((prev) => [
      incoming,
      ...prev.filter((e) => eventKey(e) !== key),
    ])
    setNewEventIds((prev) => new Set(prev).add(key))
  }, [])
  useOwlEventStream(handleStreamEvent)

  return (
    <div className="absolute left-0 top-0 flex" style={{ zIndex: 1000 }}>
      {/* Panel — 492 × 840, padding 20, gap 16, bg Neutral-800, border-right 1px */}
      <div
        className="flex flex-col items-start"
        style={{
          width: '492px',
          height: `${height}px`,
          padding: '20px',
          gap: '16px',
          borderRadius: '16px',
          borderRight: `1px solid ${COLORS.neutral450}`,
          background: '#001A38',
        }}
      >
        <EventSearchForm onSearch={runSearch} />
        <EventResultSection
          events={events}
          listHeight={height - PANEL_CHROME_HEIGHT}
          lastUpdated={lastUpdated}
          activeEvent={activeEvent}
          newEventIds={newEventIds}
          onActivateEvent={(e) => {
            // 클릭한 이벤트는 확인한 것으로 보고 신규(빨간 border) 해제.
            if (e) {
              setNewEventIds((prev) => {
                const key = eventKey(e)
                if (!prev.has(key)) return prev
                const next = new Set(prev)
                next.delete(key)
                return next
              })
            }
            onActivateEvent(e)
          }}
        />
      </div>

      {/* 우측 close button — panel 외부, vertical 중앙 */}
      <button
        type="button"
        onClick={onClose}
        className="event-panel-close self-center"
        aria-label="이벤트 패널 닫기"
      >
        <ChevronLeftIcon />
      </button>
    </div>
  )
}
