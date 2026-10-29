import { type ReactElement } from 'react'
import { edgeAttr, edgeStyle, type MapEdge } from './edge'

export type ToolId = 'distance' | 'area' | 'net' | 'reset'
export type TileType = 'normal' | 'satellite' | 'terrain'

const TEXT_BASE = {
  fontFamily: 'Roboto, system-ui, sans-serif',
  fontWeight: 500,
  lineHeight: 1,
  letterSpacing: '0.22px',
} as const

// 타일 그룹 (일반/위성/지형도) 라벨 — 버튼 content 36×18 에 맞춘 크기.
//   기존 15px 은 '지형도' 가 56px 버튼 안에서 두 줄로 깨져 14px 로 축소 + nowrap.
const TILE_TEXT_STYLE = {
  ...TEXT_BASE,
  fontSize: '14px',
  lineHeight: '18px',
  whiteSpace: 'nowrap',
} as const
// 기능 그룹 (거리/면적/투망/초기화) 라벨 — 아이콘과 함께 들어가 한 단계 작게.
const TOOL_TEXT_STYLE = { ...TEXT_BASE, fontSize: '13px' } as const

// 세로 그룹 (zoom 등) 의 첫/끝 corner radius.
function getCornerRadius(idx: number, total: number) {
  if (idx === 0) return '10px 10px 0 0'
  if (idx === total - 1) return '0 0 10px 10px'
  return '0'
}

// ---- Icons (fill/stroke = currentColor, button color CSS 와 동기) ----

function DistanceIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <rect
        x="1.25"
        y="13.6252"
        width="17.5"
        height="8.75"
        rx="1.5"
        transform="rotate(-45 1.25 13.6252)"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M13.9781 7.96882C14.271 8.26171 14.7459 8.26171 15.0388 7.96882C15.3317 7.67592 15.3317 7.20105 15.0388 6.90816L14.5084 7.43849L13.9781 7.96882ZM10.9729 3.90295L10.4426 4.43328L13.9781 7.96882L14.5084 7.43849L15.0388 6.90816L11.5032 3.37262L10.9729 3.90295Z"
        fill="currentColor"
      />
      <path
        d="M10.4429 11.504C10.7358 11.7969 11.2107 11.7969 11.5036 11.504C11.7965 11.2111 11.7965 10.7362 11.5036 10.4433L10.9733 10.9736L10.4429 11.504ZM7.43774 7.43811L6.90741 7.96844L10.4429 11.504L10.9733 10.9736L11.5036 10.4433L7.96807 6.90778L7.43774 7.43811Z"
        fill="currentColor"
      />
      <path
        d="M6.90657 15.0397C7.19946 15.3326 7.67434 15.3326 7.96723 15.0397C8.26012 14.7468 8.26012 14.272 7.96723 13.9791L7.4369 14.5094L6.90657 15.0397ZM3.90137 10.9739L3.37104 11.5042L6.90657 15.0397L7.4369 14.5094L7.96723 13.9791L4.4317 10.4435L3.90137 10.9739Z"
        fill="currentColor"
      />
      <path
        d="M9.64722 6.11243L11.415 7.88019"
        stroke="currentColor"
        strokeOpacity="0.75"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.11206 9.64819L7.87983 11.416"
        stroke="currentColor"
        strokeOpacity="0.75"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AreaIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <rect
        x="4.17153"
        y="15.8286"
        width="11.6571"
        height="11.6571"
        transform="rotate(-90 4.17153 15.8286)"
        stroke="currentColor"
        strokeOpacity="0.66"
        strokeWidth="1.2"
      />
      <circle cx="15.8928" cy="4.10714" r="1.60714" fill="currentColor" />
      <circle cx="4.10714" cy="4.10714" r="1.60714" fill="currentColor" />
      <circle cx="4.10714" cy="15.8929" r="1.60714" fill="currentColor" />
      <circle cx="15.8928" cy="15.8929" r="1.60714" fill="currentColor" />
    </svg>
  )
}

function NetIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="20"
      viewBox="0 0 22 20"
      fill="none"
    >
      <circle cx="17.0273" cy="9.65527" r="1.5" fill="currentColor" />
      <circle cx="4.02734" cy="9.65527" r="1.5" fill="currentColor" />
      <circle
        cx="13.7756"
        cy="4.02616"
        r="1.5"
        transform="rotate(-60 13.7756 4.02616)"
        fill="currentColor"
      />
      <circle
        cx="7.2756"
        cy="15.284"
        r="1.5"
        transform="rotate(-60 7.2756 15.284)"
        fill="currentColor"
      />
      <circle
        cx="7.2756"
        cy="4.02616"
        r="1.5"
        transform="rotate(-120 7.2756 4.02616)"
        fill="currentColor"
      />
      <circle
        cx="13.7756"
        cy="15.284"
        r="1.5"
        transform="rotate(-120 13.7756 15.284)"
        fill="currentColor"
      />
      <circle cx="10.5273" cy="9.65527" r="2.5" stroke="currentColor" />
      <path
        opacity="0.75"
        d="M8.61523 11.9658C8.87135 12.178 9.16407 12.3456 9.48145 12.4639L7.20996 16.4004L6.34473 15.9004L8.61523 11.9658ZM14.71 15.9004L13.8447 16.4004L11.5723 12.4639C11.8897 12.3457 12.1823 12.178 12.4385 11.9658L14.71 15.9004ZM18.0273 9.1543V10.1543H13.4854C13.5125 9.99197 13.5273 9.82533 13.5273 9.65527C13.5273 9.48464 13.5127 9.31715 13.4854 9.1543H18.0273ZM7.56934 9.1543C7.54197 9.31715 7.52734 9.48464 7.52734 9.65527C7.52736 9.82533 7.54214 9.99197 7.56934 10.1543H3.02734V9.1543H7.56934ZM9.48145 6.8457C9.16431 6.96382 8.87122 7.13085 8.61523 7.34277L6.34473 3.41016L7.20996 2.91016L9.48145 6.8457ZM14.71 3.41016L12.4385 7.34277C12.1821 7.13062 11.889 6.96278 11.5713 6.84473L13.8447 2.91016L14.71 3.41016Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        opacity="0.75"
        d="M1.99976 18H17.9998"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        opacity="0.75"
        d="M8.17847 6.63647L13.9739 12.4319"
        stroke="currentColor"
        strokeWidth="1.13333"
      />
      <rect
        x="11.2693"
        y="2.80139"
        width="8.70188"
        height="13.0731"
        rx="1.43333"
        transform="rotate(45 11.2693 2.80139)"
        stroke="currentColor"
        strokeWidth="1.13333"
      />
    </svg>
  )
}

function ZoomInIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M16.0002 10.8556H10.8574V15.9984H9.1431V10.8556H4.00024V9.14127H9.1431V3.99841H10.8574V9.14127H16.0002V10.8556Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ZoomOutIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path d="M16 11H4V9H16V11Z" fill="currentColor" />
    </svg>
  )
}

const TOOLS: { id: ToolId; label: string; Icon: () => ReactElement }[] = [
  { id: 'distance', label: '거리', Icon: DistanceIcon },
  { id: 'area', label: '면적', Icon: AreaIcon },
  { id: 'net', label: '투망', Icon: NetIcon },
  { id: 'reset', label: '초기화', Icon: ResetIcon },
]

// 기능 그룹 (거리/면적/투망/초기화) — zoom 그룹 위 표출. ⚠️ 현재 시각 토글만, 기능 미연동.
const SHOW_TOOLS_GROUP = true

const ZOOM_TOOLS: { id: string; Icon: () => ReactElement }[] = [
  { id: 'zoom-in', Icon: ZoomInIcon },
  { id: 'zoom-out', Icon: ZoomOutIcon },
]

// 타일 그룹 — 일반 / 위성 / 지형도. 가로 배치, 줌 그룹 왼쪽 (top-aligned).
const TILE_TOOLS: { id: TileType; label: string }[] = [
  { id: 'normal', label: '일반' },
  { id: 'satellite', label: '위성' },
  { id: 'terrain', label: '지형도' },
]

interface MapControlsProps {
  /** zoom-in 버튼 클릭 시 호출 */
  onZoomIn?: () => void
  /** zoom-out 버튼 클릭 시 호출 */
  onZoomOut?: () => void
  /** 현재 활성 타일 (일반/위성/지형도) — 상위에서 lift 한 state. */
  tileType?: TileType
  /** 타일 변경 시 호출 — 타일 URL 교체 */
  onTileTypeChange?: (next: TileType) => void
  /** 지도 영역이 좁아진(우측 crop) 만큼 오른쪽으로 밀어 visible 우측에 고정. */
  rightInset?: number
  /** 새 화면 전용 — 자리 고정 + translate 이동 (edge.ts) */
  edge?: MapEdge
  /** 현재 활성 기능 툴 — 상위(MapBaseML) 소유. 지도 가림/이벤트 활성 시 외부에서 해제 가능. */
  activeTool?: ToolId | null
  /** 활성 기능 툴(거리/면적/투망) 변경 — 지도 커서/인터랙션 전환용. null = 해제. */
  onToolChange?: (tool: ToolId | null) => void
  /** 클릭 불가 처리할 툴 (예: 이벤트 투망 중이면 'net') — 흐리게 + 토글 안 됨. */
  disabledTools?: readonly ToolId[]
  /** 초기화 버튼 — 현재 측정/선택 지우기 (활성 툴은 유지). */
  onReset?: () => void
}

export function MapControls({
  onZoomIn,
  onZoomOut,
  tileType = 'normal',
  onTileTypeChange,
  rightInset = 0,
  edge,
  activeTool = null,
  onToolChange,
  disabledTools = [],
  onReset,
}: MapControlsProps) {

  return (
    <div
      className="absolute top-5 flex items-start gap-3"
      {...edgeAttr(edge)}
      style={{
        zIndex: 1000,
        // 지도 폭 transition(3단계: 0.7s 뒤 0.4s) 과 동기화 —
        // 높이만 변하는 1단계에서는 버튼이 움직이지 않는다.
        ...edgeStyle(rightInset, edge, 'right 0.4s cubic-bezier(0.33, 1, 0.68, 1) var(--map-shift-delay, 0s)'),
      }}
    >
      {/* 타일 그룹 (가로) — 줌 그룹 왼쪽, top-aligned.
          한 버튼만 활성 (radio). 바깥 컨테이너 안에 버튼이 gap 2 로 들어간다. */}
      <div className="map-tile-group">
        {TILE_TOOLS.map((tool) => {
          const isActive = tileType === tool.id
          return (
            <button
              key={tool.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onTileTypeChange?.(tool.id)}
              className={`map-tile-btn ${isActive ? 'is-active' : ''}`}
            >
              <span style={TILE_TEXT_STYLE}>{tool.label}</span>
            </button>
          )
        })}
      </div>

      {/* 오른쪽 — 세로 그룹 (tools + zoom) */}
      <div className="flex flex-col gap-3">
        {/* 기능 그룹 (거리/면적/투망/초기화) — SHOW_TOOLS_GROUP 으로 일시 숨김 가능 */}
        {SHOW_TOOLS_GROUP && (
          <div className="flex flex-col">
            {TOOLS.map((tool, idx) => {
              // 초기화는 toggle 아닌 action — is-active 적용 X, 클릭 시 reset
              const isReset = tool.id === 'reset'
              const isActive = !isReset && activeTool === tool.id
              const isDisabled = disabledTools.includes(tool.id)
              return (
                <button
                  key={tool.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (isReset) {
                      // 지도 전체 초기화 — 선택 모드 해제 + 측정/커서 해제 + 카메라 복귀.
                      onToolChange?.(null)
                      onReset?.()
                      return
                    }
                    onToolChange?.(activeTool === tool.id ? null : tool.id)
                  }}
                  className={`map-btn ${isActive ? 'is-active' : ''}`}
                  style={{
                    borderRadius: getCornerRadius(idx, TOOLS.length),
                    ...(isDisabled
                      ? { opacity: 0.4, cursor: 'not-allowed' }
                      : null),
                  }}
                >
                  <tool.Icon />
                  <span style={TOOL_TEXT_STYLE}>{tool.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Zoom 그룹 (아이콘만) — id 로 zoom-in / zoom-out 분기해 props 콜백 호출 */}
        <div className="flex flex-col">
          {ZOOM_TOOLS.map((tool, idx) => (
            <button
              key={tool.id}
              type="button"
              className="map-btn"
              onClick={tool.id === 'zoom-in' ? onZoomIn : onZoomOut}
              style={{
                borderRadius: getCornerRadius(idx, ZOOM_TOOLS.length),
              }}
            >
              <tool.Icon />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
