// 급경사지 정보 창 (지도 새로 만들기 6단계) — 옛 MapSection 과 같은 때·같은 모양 (창은 하나뿐이라 HTML 그대로).
//   계측 상세: 고른 계측기 정보. 지도가 그곳으로 다 날아간 뒤 뜬다. 닫으면 고른 것·차트는 두고 창만 (다시 고를 때까지)
//   총괄·관제: 고른 관리지역 정보. 지도가 다 날아간 뒤 뜬다. 닫으면 고른 것도 푼다
import { useState } from 'react'
import { SlopeManagedAreaPopup } from '@/features/shared/map/SlopeManagedAreaPopup'
import { SlopeSensorPopup } from '@/features/shared/map/SlopeSensorPopup'
import { dash, MAP_CANVAS_W, mapWidth } from '../../dashboard/state'
import { managedAreas } from '../../menus/slope/data'
import { slope, type SlopeFocus, type SlopeTab } from '../../menus/slope/state'
import { mapState } from '../state'

/** 지금 고른 곳으로 지도가 다 날아갔으면 그 고른 것 (아니면 null) — 날아가기는 새 지도 카메라(camera.ts) */
function useSettledFocus(): SlopeFocus | null {
  const focus = slope.use((s) => s.focus)
  const flown = mapState.use((s) => s.flownSlope)
  return focus && flown === focus ? focus : null
}

const closeArea = () => slope.set({ focus: null })

export function SlopePopups({ tab }: { tab: SlopeTab | null }) {
  const map = mapState.use((s) => s.map)
  const inset = dash.use((s) => MAP_CANVAS_W - mapWidth(s.layoutMenu, s.cctvOpen))
  const focus = useSettledFocus()
  // 닫은 계측기 창 (그 고름의 seq)
  const [closedSeq, setClosedSeq] = useState<number | null>(null)
  const managed = managedAreas.use()

  if (!map || !focus) return null
  const area = tab === 'overview' && focus.managedAreaId != null ? managed.find((a) => a.id === focus.managedAreaId) : undefined
  return (
    <>
      {tab === 'measure' && focus.sensor && closedSeq !== focus.seq && (
        <SlopeSensorPopup key={focus.seq} map={map} sensor={focus.sensor} rightInset={inset} onClose={() => setClosedSeq(focus.seq)} pinTop />
      )}
      {area && <SlopeManagedAreaPopup key={area.id} map={map} area={area} rightInset={inset} onClose={closeArea} pinTop />}
    </>
  )
}
