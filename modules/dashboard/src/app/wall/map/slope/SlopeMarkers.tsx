// 급경사지 메뉴 마커 (지도 새로 만들기 4단계) — 옛 MapSection 의 급경사지 마커들과 같은 모양·순서.
//   상시계측 지역 3곳: 메뉴에 들어가면 바로 (이름표 위). 계측 상세에선 30px 큰 원 + 위험 단계 색, 이름표 아래
//   총괄·관제: 관리지역 (등급 색 + 등급 글자, 이름표 없음). 고른 곳은 물방울. 누르면 목록 줄을 누른 것과 같다 (수정 12)
//   계측 상세: 계측기 (경사계·낙석검지기·강우량계, 큰 원 아래). 누르면 센서 목록에서 그 계측기를 고른다 (수정 12). 고른 계측기 자리에 물방울
//   조기경보·통계: 발령 빈도 버블
//   탭 마커는 지도 오른쪽이 다 움직인 뒤 (tab 은 그때 들어온다). 정보 창은 아직 옛 MapSection.
import { useMemo } from 'react'
import { GRADE_COLOR } from '@/features/menus/steep-slope/variants'
import { LAYER_FALLBACK } from '@/shared/styles/palette'
import { dash, MENU } from '../../dashboard/state'
import { useLayerColorMap } from '../../menus/layer/colors'
import { areaLevel } from '../../menus/slope/colors'
import { managedAreas, slopeAreas } from '../../menus/slope/data'
import { useAlarmMap } from '../../menus/slope/useAlarmMap'
import { focusSlope, pickInstrument, slope, type SlopeTab } from '../../menus/slope/state'
import { mapState } from '../state'
import { PointLayer, type MapPoint } from '../points/PointLayer'
import { AlertBubbles } from './AlertBubbles'
import { SlopePin } from './SlopePin'

/** 계측기 종류 → 레이어 code (옛 화면 그리는 순서) */
const INSTRUMENTS = [
  ['INCLINOMETER', 'SLOPE_INCLINOMETER'],
  ['ROCKFALL_DETECTOR', 'SLOPE_ROCKFALL'],
  ['RAIN_GAUGE', 'SLOPE_RAIN_GAUGE'],
] as const

const has = <T extends { lat: number | null; lng: number | null }>(r: T): r is T & { lat: number; lng: number } => r.lat !== null && r.lng !== null

export function SlopeMarkers({ tab }: { tab: SlopeTab | null }) {
  const map = mapState.use((s) => s.map)
  const on = dash.use((s) => s.menu === MENU.slope)
  const focus = slope.use((s) => s.focus)
  const alarmRange = slope.use((s) => s.alarmRange)
  const colors = useLayerColorMap()
  const areas = slopeAreas.use()
  const managed = managedAreas.use()
  const alarms = useAlarmMap(alarmRange, tab === 'alert')
  const color = (code: string) => colors[code] ?? LAYER_FALLBACK[code]
  const areaColor = color('SLOPE_AREA')
  const measure = tab === 'measure'

  const areaPoints = useMemo<MapPoint[]>(
    () => (on ? areas.filter(has).map((a, i) => ({ id: i, name: a.name, lat: a.lat, lng: a.lng, color: measure ? areaLevel(a.level).hex : areaColor })) : []),
    [on, areas, measure, areaColor],
  )

  const overview = tab === 'overview'
  const picked = overview ? focus?.name : undefined
  const managedColor = color('SLOPE_MANAGED_AREA')
  const managedPoints = useMemo<MapPoint[]>(
    () =>
      overview
        ? managed
            .filter(has)
            .filter((a) => a.name !== picked)
            .map((a) => ({ id: a.id, name: a.name, lat: a.lat, lng: a.lng, color: (a.grade && GRADE_COLOR[a.grade]) || managedColor, inner: a.grade ?? undefined }))
        : [],
    [overview, managed, picked, managedColor],
  )
  const pickedArea = overview && picked ? managed.find((a) => a.name === picked) : undefined

  const instrumentPoints = useMemo<MapPoint[]>(() => {
    if (!measure) return []
    const all = areas.flatMap((a) => a.instruments).filter(has)
    const out: MapPoint[] = []
    for (const [category, code] of INSTRUMENTS) {
      const c = colors[code] ?? LAYER_FALLBACK[code]
      for (const i of all) if (i.category === category) out.push({ id: i.id, name: i.displayName, lat: i.lat, lng: i.lng, color: c })
    }
    return out
  }, [measure, areas, colors])

  const bubbles = useMemo(() => (tab === 'alert' ? alarms.filter(has).map((p) => ({ name: p.name, lat: p.lat, lng: p.lng, count: p.count })) : []), [tab, alarms])

  // 관리지역 점을 누르면 목록 줄을 누른 것처럼 (고른 곳은 점 대신 물방울이라 다시 누를 일은 없다)
  const onManaged = (id: number) => {
    const a = managed.find((m) => m.id === id)
    if (a && has(a)) focusSlope({ name: a.name, lng: a.lng, lat: a.lat, managedAreaId: a.id })
  }

  if (!map) return null
  return (
    <>
      {bubbles.length > 0 && <AlertBubbles map={map} bubbles={bubbles} />}
      {/* 지도 엔진은 나중에 붙인 레이어가 위 — 계측기 < 큰 원·지역 점 < 관리지역 (옛 화면 겹침 순서).
          지역 점 모양이 바뀌면 새로 붙으므로 관리지역도 같이 새로 붙여 위에 둔다 */}
      <PointLayer map={map} points={instrumentPoints} onSelect={pickInstrument} />
      <PointLayer key={measure ? 'area' : 'dot'} map={map} points={areaPoints} variant={measure ? 'area' : 'dot'} showLabels />
      <PointLayer key={measure ? 'm-area' : 'm-dot'} map={map} points={managedPoints} onSelect={onManaged} />
      {pickedArea && has(pickedArea) && (
        <SlopePin map={map} lng={pickedArea.lng} lat={pickedArea.lat} name={pickedArea.name} color={(pickedArea.grade && GRADE_COLOR[pickedArea.grade]) || managedColor} inner={pickedArea.grade ?? undefined} />
      )}
      {measure && focus && <SlopePin map={map} lng={focus.lng} lat={focus.lat} name={focus.name} color={areaColor} />}
    </>
  )
}
