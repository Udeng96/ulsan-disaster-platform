// 지도 범례 — 지도 오른쪽 아래. 메뉴마다 그 메뉴에서 그리는 마커와 같은 색으로 줄이 바뀐다.
//   상자 모양·여닫기는 옛 MapLegend 를 그대로 쓴다 (애니메이션 7번, 수정사항 26).
import type { MapEdge } from '@/features/shared/map/edge'
import { edgeAttr, edgeStyle } from '@/features/shared/map/edge'
import { BUBBLE_STEPS } from '@/features/shared/map/SlopeAlertBubbles'
import { MapLegend, type LegendItem } from '@/features/menus/layer/MapLegend'
import { GRADE_COLOR } from '@/features/menus/steep-slope/variants'
import { LAYER_FALLBACK } from '@/shared/styles/palette'
import { dash, MENU } from '../dashboard/state'
import { useLayerColorMap } from '../menus/layer/colors'
import type { SlopeTab } from '../menus/slope/state'
import { bottomCropOf } from './camera'

/** 급경사지 조기경보 — 발령 빈도 버블의 건수 구간 */
const ALERT_ITEMS: LegendItem[] = BUBBLE_STEPS.map((s, i) => ({
  key: `BUBBLE_${s.min}`,
  label: i === BUBBLE_STEPS.length - 1 ? `${s.min}건 이상` : s.min === 0 ? '0건' : `${s.min}~${BUBBLE_STEPS[i + 1].min - 1}건`,
  color: s.color,
}))
/** 급경사지 총괄·관제 — 등급 (A 정상 → E 심각) */
const GRADE_ITEMS: LegendItem[] = Object.entries(GRADE_COLOR).map(([g, color]) => ({ key: g, label: `${g}등급`, color }))

/** 레이어 code → 범례 줄 이름 */
const MENU_ITEMS: Partial<Record<number, [code: string, label: string][]>> = {
  [MENU.pump]: [['PUMP_STATION', '배수펌프장']],
  [MENU.earthquake]: [['SEISMOMETER', '지진가속도계']],
  [MENU.disaster]: [
    ['BROADCAST', '자동 음성 통보'],
    ['SIGNBOARD', '재해 문자 전광판'],
  ],
}
const MEASURE_ITEMS: [string, string][] = [
  ['SLOPE_AREA', '급경사지'],
  ['SLOPE_INCLINOMETER', '계측기'],
  ['SLOPE_ROCKFALL', '낙석감지기'],
  ['SLOPE_RAIN_GAUGE', '강우량계'],
]

interface Props {
  inset: number
  edge: MapEdge
  /** 급경사지 서브탭 — 지도 오른쪽이 다 움직인 뒤에만 (마커와 같이 뜬다) */
  slopeTab: SlopeTab | null
}

export function Legend({ inset, edge, slopeTab }: Props) {
  const menu = dash.use((s) => s.menu)
  const layerChecked = dash.use((s) => s.layerChecked)
  const colors = useLayerColorMap()
  const pick = (rows: [string, string][]): LegendItem[] =>
    rows.map(([code, label]) => ({ key: code === 'SLOPE_AREA' ? 'AREA' : code, label, color: colors[code] ?? LAYER_FALLBACK[code] }))

  // 레이어 메뉴는 켜 둔 레이어 전부 (items 없이)
  let items: LegendItem[] | undefined
  if (menu === MENU.layer) items = undefined
  else if (menu === MENU.slope) items = slopeTab === 'overview' ? GRADE_ITEMS : slopeTab === 'measure' ? pick(MEASURE_ITEMS) : slopeTab === 'alert' ? ALERT_ITEMS : []
  else items = MENU_ITEMS[menu] ? pick(MENU_ITEMS[menu]) : []
  if (items?.length === 0) return null

  return (
    <div {...edgeAttr(edge)} className="absolute z-[1000]" style={{ bottom: 20 + bottomCropOf(menu), ...edgeStyle(inset, edge, '') }}>
      <MapLegend layerChecked={layerChecked} items={items} />
    </div>
  )
}
