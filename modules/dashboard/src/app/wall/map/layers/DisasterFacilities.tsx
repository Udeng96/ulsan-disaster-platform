// 재난 예·경보 메뉴 마커 — 자동음성은 방송장비, 전광판은 재해문자전광판 (지도 새로 만들기 4단계).
//   패널에서 고른 것은 원 둘레 두 겹으로 강조, 마커를 누르면 패널에서 고르기·풀기.
//   전광판만 이름표(plain, 원 위). 레이어 메뉴의 방송장비·전광판은 LayerFacilities.
import { useMemo } from 'react'
import { LAYER_FALLBACK } from '@/shared/styles/palette'
import { dash, MENU } from '../../dashboard/state'
import { idsOf } from '../../menus/disaster/logic'
import { disaster, lists, toggleFacility } from '../../menus/disaster/state'
import { useLayerColorMap } from '../../menus/layer/colors'
import { mapState } from '../state'
import { PointLayer, type MapPoint } from '../points/PointLayer'

export function DisasterFacilities() {
  const map = mapState.use((s) => s.map)
  const on = dash.use((s) => s.menu === MENU.disaster)
  const mode = disaster.use((s) => s.mode)
  const voiceChecked = disaster.use((s) => s.voiceChecked)
  const signChecked = disaster.use((s) => s.signChecked)
  const broadcast = lists.use((s) => s.broadcast)
  const signboard = lists.use((s) => s.signboard)
  const colors = useLayerColorMap()

  const voice = mode === 'voice'
  const code = voice ? 'BROADCAST' : 'SIGNBOARD'
  const color = colors[code] ?? LAYER_FALLBACK[code]
  const rows = voice ? broadcast : signboard
  const points = useMemo<MapPoint[]>(() => {
    if (!on) return []
    const out: MapPoint[] = []
    for (const r of rows) if (Number.isFinite(r.lat) && Number.isFinite(r.lng)) out.push({ id: r.id, name: r.name, lat: r.lat, lng: r.lng, color })
    return out
  }, [on, rows, color])
  const emphasized = useMemo(() => new Set(voice ? idsOf(voiceChecked, 'fac') : idsOf(signChecked, 'sign')), [voice, voiceChecked, signChecked])

  if (!map) return null
  return <PointLayer map={map} points={points} showLabels={!voice} emphasizedIds={emphasized} onSelect={(id) => toggleFacility(mode, id)} />
}
