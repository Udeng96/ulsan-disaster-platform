// 레이어 메뉴 시설 마커 — 체크한 레이어의 시설을 한 번에 지도 엔진으로 그린다 (지도 새로 만들기 4단계).
//   무더위쉼터·계측기(경사계·낙석·강우량)·급경사지 위험지역·관리지역·방송장비·전광판·대기질.
//   이름표는 레이어마다 라벨보기를 따로 따르고, 모양은 boxed (옛 화면과 같음).
//   배수펌프장은 수가 적어 HTML 로 둔다 (5번), CCTV 는 CctvLayer.
import { useMemo } from 'react'
import { LAYER_FALLBACK } from '@/shared/styles/palette'
import { dash, MENU } from '../../dashboard/state'
import { lists } from '../../menus/disaster/state'
import { airStations, shelters, useLayerColorMap } from '../../menus/layer/colors'
import { managedAreas, slopeAreas } from '../../menus/slope/data'
import { mapState } from '../state'
import { PointLayer, type MapPoint } from '../points/PointLayer'

type Row = { name: string; lat: number | null; lng: number | null }

/** 계측기 종류 → 레이어 code (옛 화면 순서) */
const INSTRUMENTS = [
  ['INCLINOMETER', 'SLOPE_INCLINOMETER'],
  ['ROCKFALL_DETECTOR', 'SLOPE_ROCKFALL'],
  ['RAIN_GAUGE', 'SLOPE_RAIN_GAUGE'],
] as const

export function LayerFacilities() {
  const map = mapState.use((s) => s.map)
  const inLayer = dash.use((s) => s.menu === MENU.layer)
  const checked = dash.use((s) => s.layerChecked)
  const labelOn = dash.use((s) => s.layerLabelOn)
  const colors = useLayerColorMap()
  const shelterList = shelters.use()
  const air = airStations.use()
  const managed = managedAreas.use()
  const areas = slopeAreas.use()
  const broadcast = lists.use((s) => s.broadcast)
  const signboard = lists.use((s) => s.signboard)

  const points = useMemo(() => {
    if (!inLayer) return []
    const out: MapPoint[] = []
    const add = (code: string, rows: readonly Row[]) => {
      if (checked[code] !== true) return
      const color = colors[code] ?? LAYER_FALLBACK[code]
      for (const r of rows)
        if (r.lat !== null && r.lng !== null && Number.isFinite(r.lat) && Number.isFinite(r.lng)) out.push({ id: out.length, name: r.name, lat: r.lat, lng: r.lng, color, label: labelOn[code] === true })
    }
    // 옛 화면 그리는 순서 — 뒤에 온 것이 위
    add('SHELTER', shelterList)
    const instruments = areas.flatMap((a) => a.instruments)
    for (const [category, code] of INSTRUMENTS) add(code, instruments.filter((i) => i.category === category).map((i) => ({ name: i.displayName, lat: i.lat, lng: i.lng })))
    add('SLOPE_AREA', areas)
    add('SLOPE_MANAGED_AREA', managed)
    add('BROADCAST', broadcast)
    add('SIGNBOARD', signboard)
    add('AIR_QUALITY', air)
    return out
  }, [inLayer, checked, labelOn, colors, shelterList, air, managed, areas, broadcast, signboard])

  if (!map) return null
  return <PointLayer map={map} points={points} labelStyle="boxed" />
}
