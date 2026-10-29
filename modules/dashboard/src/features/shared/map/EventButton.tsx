import { EventPanel } from './event-panel/EventPanel'
import type { EventListItem } from '@/api/event'

interface Props {
  /** 현재 활성 이벤트 (state hub: DashboardPage) */
  activeEvent: EventListItem | null
  /** 이벤트 row 선택 시 (지도 flyTo + 마커 표출용) — MapView 가 받음 */
  onActivateEvent: (e: EventListItem | null) => void
  /** 패널 open 상태 — DashboardPage 가 hub (FlyToCoordinator 가 center offset 결정 시 참조) */
  isOpen: boolean
  /** 이벤트 패널 높이 (default 840) — 지도 높이에 맞춤. */
  panelHeight?: number
  onOpenChange: (open: boolean) => void
}

// 부드러운 minimize / restore 효과 (맥북 dock 최소화 비슷)
// — opacity + transform: scale, transform-origin: 좌상단 (button 위치)
// — 둘 다 DOM 에 두고 pointer-events 로 click 제어
export function EventButton({
  activeEvent,
  onActivateEvent,
  isOpen,
  panelHeight,
  onOpenChange,
}: Props) {

  const tween =
    'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'

  return (
    <>
      {/* EventPanel wrapper — 항상 DOM, isOpen 에 따라 visible 전환 (좌상단 minimize 효과)
          absolute left-0 top-0 로 명확히 위치, button 아래 stack */}
      <div
        className="absolute left-0 top-0"
        style={{
          zIndex: 1000,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'scale(1)' : 'scale(0.3)',
          transformOrigin: 'top left',
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: tween,
        }}
      >
        <EventPanel
          height={panelHeight}
          onClose={() => onOpenChange(false)}
          activeEvent={activeEvent}
          onActivateEvent={onActivateEvent}
        />
      </div>

      {/* 이벤트 button — wrapper 보다 위 stack, isOpen 시 fade + scale down */}
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="absolute left-5 top-5 inline-flex items-center gap-[10px] overflow-hidden text-ellipsis whitespace-nowrap rounded-[12px] bg-[#002247] px-6 py-3 text-b1 text-white shadow-[0_4px_16px_0_rgba(0,0,0,0.12)] hover:bg-[#003060]"
        style={{
          zIndex: 1001,
          opacity: isOpen ? 0 : 1,
          transform: isOpen ? 'scale(0.6)' : 'scale(1)',
          transformOrigin: 'top left',
          pointerEvents: isOpen ? 'none' : 'auto',
          transition: tween,
        }}
      >
        이벤트
      </button>
    </>
  )
}
