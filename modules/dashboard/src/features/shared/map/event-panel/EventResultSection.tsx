import { useState } from 'react'
import { eventKey, eventTypeColor } from '@/api/event'
import type { EventListItem } from '@/api/event'

// 펼쳐보기 button 아이콘 (24×24, chevron-down)
function ExpandIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <g opacity="0.9">
        <rect
          y="0.00012207"
          width="24"
          height="24"
          rx="12"
          fill="white"
          fillOpacity="0.08"
        />
        <rect
          x="0.5"
          y="0.500122"
          width="23"
          height="23"
          rx="11.5"
          stroke="white"
          strokeOpacity="0.16"
        />
      </g>
      <path
        d="M8.5 11.0938L12 14.5938L15.5 11.0938"
        stroke="#DCE6EE"
        strokeWidth="1.3125"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 결과 리스트 item — W 450, padding 0 16, radius 10, border Neutral-500, bg Neutral-600
interface EventRowProps {
  type: string
  /** 유형 색 판정용 — disasterTypeCode 앞자리가 대분류. */
  typeCode: string | null
  location: string
  datetime: string
  /** 펼침 시 표출되는 상세 내용 (DB event.content) */
  content: string | null
  isActive?: boolean
  /** SSE 로 새로 들어온 이벤트 — 빨간 border. (활성 상태면 표출 안 함) */
  isNew?: boolean
  onActivate?: () => void
}

function EventRow({
  type,
  typeCode,
  location,
  datetime,
  content,
  isActive,
  isNew,
  onActivate,
}: EventRowProps) {
  const [expanded, setExpanded] = useState(false)

  const base = expanded ? 'event-result-row-expanded' : 'event-result-row'
  // 활성(파란 border) 이 신규(빨간 border) 보다 우선 — 클릭하면 신규 표시가 사라진 것처럼 보임.
  const className = isActive
    ? `${base} is-active`
    : isNew
      ? `${base} is-new`
      : base

  return (
    <div className={className} onClick={onActivate}>
      {/* cells row — 가로 정렬 (펼친 상태에서도 첫 줄로 유지, 펼친 상태 시 하단 divider) */}
      <div
        className="flex w-full items-center"
        style={
          expanded
            ? { borderBottom: '1px solid rgba(255, 255, 255, 0.10)' }
            : undefined
        }
      >
        {/* 이벤트 유형 — W 120, padding 16 4 16 0, col, items-start, gap 10, shrink 0 */}
        <div
          className="flex shrink-0 flex-col items-start"
          style={{
            width: '120px',
            padding: '16px 4px 16px 0',
            gap: '10px',
          }}
        >
          {/* 대분류별 색 (긴급구조 적 / 사회재난 주황 / 자연재난 초록 …) */}
          <span
            className="text-b5"
            style={{ color: eventTypeColor(typeCode), fontWeight: 600 }}
          >
            {type}
          </span>
        </div>

        {/* 위치 주소 — W 126, padding 16 4 16 0, col, items-start, gap 10, shrink 0 */}
        <div
          className="flex shrink-0 flex-col items-start"
          style={{
            width: '126px',
            padding: '16px 4px 16px 0',
            gap: '10px',
          }}
        >
          <span className="text-b5" style={{ color: '#FFF' }}>
            {location}
          </span>
        </div>

        {/* 날짜 — B5 white */}
        <span className="text-b5" style={{ color: '#FFF', flex: '1 0 0' }}>
          {datetime}
        </span>

        {/* 펼쳐보기 button — 24×24, 클릭 시 toggle, 펼친 상태 시 180° 회전 */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((v) => !v)
          }}
          className="flex shrink-0 items-center justify-center"
          style={{
            width: '24px',
            height: '24px',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
          aria-label={expanded ? '접기' : '펼쳐보기'}
        >
          <ExpandIcon />
        </button>
      </div>

      {/* 펼친 상태 — detail content (col, items-start, gap 6, self-stretch) */}
      {expanded && (
        <div
          className="flex flex-col items-start self-stretch"
          style={{ gap: '6px' }}
        >
          {/* 제목 — "상세 내용" (items-center, gap 7) */}
          <div className="flex items-center" style={{ gap: '7px' }}>
            {/* dot — 3×3 Primary-light */}
            <span
              style={{
                width: '3px',
                height: '3px',
                background: '#42B8FF',
                flexShrink: 0,
              }}
            />
            <span className="text-b5" style={{ color: '#B8C8D6' }}>
              상세 내용
            </span>
          </div>

          {/* 내용 박스 — H 54, items-center, self-stretch, radius 6, border + bg,
              padding 6 4 6 14, 넘치면 스크롤 */}
          <div
            className="scrollbar-custom flex items-start self-stretch"
            style={{
              maxHeight: '132px',
              padding: '6px 4px 6px 14px',
              borderRadius: '6px',
              border: '1px solid rgba(20, 20, 20, 0.20)',
              background: 'rgba(20, 20, 20, 0.40)',
              overflowY: 'auto',
            }}
          >
            <p
              style={{
                color: '#FFF',
                fontFamily: 'Roboto',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '22px',
                margin: 0,
                // summary 는 '○ 신고일시 : …' 이 줄바꿈으로 이어진 문자열.
                whiteSpace: 'pre-line',
              }}
            >
              {content ?? '상세 내용이 없습니다.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// reportedAt (ISO datetime) → "YY-MM-DD HH:MM:SS" 표출
function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

// Date → "YYYY-MM-DD HH:MM:SS" (Update 라벨용 — 4 자리 연도)
function formatFullDateTime(d: Date): string {
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

// 주소에서 동 이름 추출 — 백엔드 region 필드 별도, address 에는 "가상시설0565 ..." 형태.
// 일단 region 컬럼 직접 매핑 위해 EventListItem 가 address 만 갖고 있어서 그대로 표출.
function shortLocation(address: string | null): string {
  if (!address) return ''
  // "가상시설0565 가상시설0480 312" → "가상시설0480 312"
  const parts = address.split(/\s+/)
  return parts.slice(2).join(' ') || address
}

interface EventResultSectionProps {
  events: EventListItem[]
  /** 마지막 조회 시각 — Update 라벨에 표출 */
  lastUpdated: Date
  /** 현재 활성 이벤트 — row 의 is-active 표출은 이 값으로 derive (single source of truth) */
  activeEvent: EventListItem | null
  /** 목록 영역 높이 (default 516) — 패널이 짧아지는 화면에서 줄인다. */
  listHeight?: number
  /** SSE 로 새로 들어온 이벤트 id — 빨간 border 표출. */
  newEventIds?: ReadonlySet<string>
  /** row 활성화 시 (지도 flyTo + 마커 표출 위해 부모/MapView 에 알림) */
  onActivateEvent: (e: EventListItem | null) => void
}

// 이벤트 조회 결과 영역
// — 결과 헤더 (W 450 × H 38, padding 5/6/15/6, gap 8)
// — 테이블 헤더 (이벤트 유형 / 지역(위치) / 발생 일시)
// — 결과 리스트 (각 row + 펼침) — events 는 부모 (EventPanel) 가 fetch 후 전달
export function EventResultSection({
  events,
  lastUpdated,
  activeEvent,
  listHeight = 516,
  newEventIds,
  onActivateEvent,
}: EventResultSectionProps) {
  // 활성 row index — activeEvent 로부터 derive
  const activeIdx = activeEvent
    ? events.findIndex((e) => eventKey(e) === eventKey(activeEvent))
    : -1

  // row 클릭 → 같은 row 면 해제, 다른 row 면 그 event 활성화
  const handleActivate = (idx: number) => {
    if (idx === activeIdx) {
      onActivateEvent(null)
    } else {
      onActivateEvent(events[idx])
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: '12px' }}>
      {/* 결과 헤더 — W 450 × H 38, padding 5/6/15/6, items-center, gap 8, 하단 divider */}
      <div
        className="flex items-center"
        style={{
          width: '450px',
          height: '38px',
          padding: '5px 6px 15px 6px',
          gap: '8px',
          borderBottom: '1px solid #003060',
        }}
      >
        {/* 조회결과 영역 — H 18, gap 6, items-center, flex 1 0 0 */}
        <div
          className="flex items-center"
          style={{
            height: '18px',
            gap: '6px',
            flex: '1 0 0',
          }}
        >
          <span className="text-b5" style={{ color: '#7F97AF' }}>
            조회 결과
          </span>
          <span className="text-b5" style={{ color: '#F4F8FB' }}>
            [{events.length}건]
          </span>
        </div>

        {/* 업데이트 날짜 영역 — Roboto 12 / 500 / 14, Neutral-200 */}
        <div
          style={{
            color: '#B8C8D6',
            fontFamily: 'Roboto',
            fontSize: '12px',
            fontWeight: 500,
            lineHeight: '14px',
          }}
        >
          Update : {formatFullDateTime(lastUpdated)}
        </div>
      </div>

      {/* 리스트 wrapper — 기본 H 552 (목록 516 + header 36), 패널 높이에 따라 축소 */}
      <div
        className="flex flex-col"
        style={{
          height: `${listHeight + 36}px`,
          alignItems: 'flex-start',
          gap: '4px',
        }}
      >
        {/* 리스트 header — W 460, padding 0 37 0 20, items-center */}
        <div
          className="flex items-center"
          style={{
            width: '460px',
            padding: '0 37px 0 20px',
          }}
        >
          {/* 이벤트 유형 — W 120, padding 8 8 8 0, col, items-start, gap 10, shrink 0 */}
          <div
            className="flex shrink-0 flex-col items-start"
            style={{
              width: '120px',
              padding: '8px 8px 8px 0',
              gap: '10px',
            }}
          >
            <span className="text-b5" style={{ color: '#B8C8D6' }}>
              이벤트 유형
            </span>
          </div>

          {/* 지역 위치 — W 128, padding 8 8 8 0, col, items-start, gap 10, shrink 0 */}
          <div
            className="flex shrink-0 flex-col items-start"
            style={{
              width: '128px',
              padding: '8px 8px 8px 0',
              gap: '10px',
            }}
          >
            <span className="text-b5" style={{ color: '#B8C8D6' }}>
              지역(위치)
            </span>
          </div>

          {/* 발생 일시 — W 148, padding 8 8 8 0, col, items-start, gap 10, shrink 0 */}
          <div
            className="flex shrink-0 flex-col items-start"
            style={{
              width: '148px',
              padding: '8px 8px 8px 0',
              gap: '10px',
            }}
          >
            <span className="text-b5" style={{ color: '#B8C8D6' }}>
              발생 일시
            </span>
          </div>
        </div>

        {/* 리스트 body — W 460 (= row 450 + gap 4 + scrollbar 6),
            H 516, items-start, gap 4, shrink-0, overflow-y 스크롤 */}
        <div
          className="scrollbar-custom flex shrink-0 flex-col"
          style={{
            width: '460px',
            height: `${listHeight}px`,
            alignItems: 'flex-start',
            gap: '4px',
            overflowY: 'auto',
          }}
        >
          {/* 백엔드 이벤트 — searchEvents() 결과. row 클릭 시 지도 flyTo + 마커 표출 */}
          {events.length === 0 ? (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                color: 'rgba(255, 255, 255, 0.45)',
                fontFamily: 'Roboto',
                fontSize: '16px',
                fontWeight: 500,
              }}
            >
              데이터 없음
            </div>
          ) : (
            events.map((e, i) => (
              <EventRow
                key={eventKey(e)}
                type={e.disasterTypeName}
                typeCode={e.disasterTypeCode}
                location={shortLocation(e.regionName)}
                datetime={formatDateTime(e.occurDtm)}
                // 상세 — 제목 + summary(신고내역 등). summary 가 없으면 제목만.
                content={e.summary ? `${e.title}\n${e.summary}` : e.title}
                isActive={activeIdx === i}
                isNew={newEventIds?.has(eventKey(e))}
                onActivate={() => handleActivate(i)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
