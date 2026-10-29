// 고른 이벤트 자리 표시 — 빨간 핀 + 퍼지는 링 + '투망종료' 버튼 (지도 새로 만들기 5단계).
//   하나뿐이라 옛 화면과 같은 HTML 마커 그대로 (EventFocusMarkerML).
//   '투망종료'를 누르면 표시와 함께 왼쪽 이벤트 창도 닫는다 (수정 8).
import { useMemo } from 'react'
import { EventFocusMarkerML } from '@/features/shared/map/EventFocusMarkerML'
import { dash } from '../../dashboard/state'
import { mapState } from '../state'

const end = () => dash.set({ activeEvent: null, eventPanelOpen: false })

export function EventMarker() {
  const map = mapState.use((s) => s.map)
  const event = dash.use((s) => s.activeEvent)
  const lat = event?.lat
  const lng = event?.lng
  // 좌표가 없는 이벤트는 핀 없이 고르기만. 자리가 바뀔 때만 새로 (렌더마다 마커를 다시 만들지 않게)
  const at = useMemo(() => (lat != null && lng != null ? { lat, lng } : null), [lat, lng])
  if (!map || !at) return null
  return <EventFocusMarkerML map={map} event={at} onDeactivate={end} />
}
