// 급경사지 메뉴 상태 — 서브탭·고른 지역·지도 강조·계측 상세 센서·조기경보 기간.
//   메뉴를 벗어나면 처음으로 돌린다 (SlopeSync).
import { useEffect } from 'react'
import type { Area, SlopeRiskLevel } from '@/features/menus/steep-slope/data'
import { createStore } from '@/shared/store'
import { dash, MENU } from '../../dashboard/state'
import type { ChartPeriod } from './chart'

export type SlopeTab = 'overview' | 'measure' | 'alert'
export const SLOPE_TABS = [
  { id: 'overview', label: '총괄·관제' },
  { id: 'measure', label: '계측 상세' },
  { id: 'alert', label: '조기경보·통계' },
] as const

/** 계측 상세에서 고른 센서 — 차트·지도 팝업이 같이 본다 */
export interface SelectedSensor {
  /** 차트 조회 키 (관측항목 id). 값이 없는 센서면 null */
  observationItemId: number | null
  /** 같은 계측기의 함수비 관측항목 (경사·함수만) — 센서 하나를 볼 때 막대로 같이 */
  moistureItemId: number | null
  area: string
  /** 경사·함수-1 등 */
  label: string
  value: number | null
  unit: string
  risk: SlopeRiskLevel
  /** 국가지점번호 */
  spotNo: string | null
  address: string | null
  installedAt: string | null
  lat: number | null
  lng: number | null
}

/** 계측 상세에서 고른 줄 — 그 지역의 같은 종류 센서 묶음 (수정 14). 센서가 여럿이면 차트는 처음에 전체 */
export interface SensorGroup {
  /** '지역:종류' (rain·tilt·rock) */
  key: string
  area: string
  /** 강우량·경사·함수·경사·낙석검지 */
  name: string
  /** 경사계면 X·Y 축이 있다 */
  axes: boolean
  /** 위험한 순 (같은 단계는 번호 순) — 첫 센서가 왼쪽 줄의 대표 */
  sensors: SelectedSensor[]
  /** 지역 가운데 — 전체일 때 지도가 그곳으로 */
  lat: number | null
  lng: number | null
}

/** 전체 차트에서 볼 경사계 축 */
export type TiltAxis = 'x' | 'y'

/** 지도가 날아가 강조할 곳 (seq: 같은 곳을 다시 골라도 다시 날아가게) */
export interface SlopeFocus {
  name: string
  lng: number
  lat: number
  seq: number
  /** 총괄·관제 목록에서 고른 관리지역 */
  managedAreaId?: number
  /** 계측 상세에서 고른 계측기 — 지도 옆 정보 팝업 */
  sensor?: SelectedSensor
}

export interface SlopeState {
  tab: SlopeTab
  /** 상시계측 지역 탭 (가상시설0680·가상시설0432·가상시설0553) */
  area: Area | null
  focus: SlopeFocus | null
  group: SensorGroup | null
  /** 묶음 중 고른 센서 — null 이면 전체 (센서가 하나뿐인 묶음은 늘 그 센서) */
  sensor: SelectedSensor | null
  axis: TiltAxis
  period: ChartPeriod
  /** 조기경보 통계 기간 — 지도 발령 버블과 같이 씀 */
  alarmRange: { from: string; to: string } | null
  /** 지도에서 누른 계측기 — 센서 목록이 그 줄을 고른다 (seq: 같은 것을 다시 눌러도 다시) */
  pick: { instrumentId: number; seq: number } | null
}

export const slope = createStore<SlopeState>({ tab: 'overview', area: null, focus: null, group: null, sensor: null, axis: 'x', period: '실시간', alarmRange: null, pick: null })

/** 지도를 그곳으로 (seq 올림) */
export function focusSlope(f: Omit<SlopeFocus, 'seq'> | null) {
  slope.set((s) => ({ focus: f && { ...f, seq: (s.focus?.seq ?? 0) + 1 } }))
}

/** 지도를 그 센서로 (정보 창), 센서가 없으면 그 지역으로 (정보 창 없음) */
function focusSensor(group: SensorGroup, sensor: SelectedSensor | null) {
  if (sensor) {
    if (sensor.lat !== null && sensor.lng !== null) focusSlope({ name: sensor.label, lat: sensor.lat, lng: sensor.lng, sensor })
  } else if (group.lat !== null && group.lng !== null) focusSlope({ name: group.area, lat: group.lat, lng: group.lng })
}

/** 왼쪽 줄(또는 지도의 계측기)을 고름 — 기간은 실시간으로. 센서가 여럿이면 전체, 하나면 그 센서. sensor 를 주면 그 센서 */
export function selectGroup(group: SensorGroup, sensor?: SelectedSensor) {
  const picked = sensor ?? (group.sensors.length === 1 ? group.sensors[0] : null)
  slope.set({ group, sensor: picked, period: '실시간', axis: 'x' })
  focusSensor(group, picked)
}

/** 차트에서 센서를 고름 (null = 전체) — 기간은 그대로 */
export function pickGroupSensor(sensor: SelectedSensor | null) {
  const { group } = slope.get()
  if (!group) return
  slope.set({ sensor })
  focusSensor(group, sensor)
}

/** 값이 새로 옴 — 고른 것은 그대로 두고 단계·값만 새것으로 (지도는 다시 날지 않는다) */
export function refreshGroup(group: SensorGroup) {
  const { sensor } = slope.get()
  const same = sensor && group.sensors.find((x) => x.label === sensor.label)
  slope.set({ group, sensor: same ?? sensor })
}

/** 지도 계측기 마커를 누름 — 목록 줄을 누른 것과 같게 (수정 12) */
export function pickInstrument(instrumentId: number) {
  slope.set((s) => ({ pick: { instrumentId, seq: (s.pick?.seq ?? 0) + 1 } }))
}

/** 급경사지 메뉴를 벗어나면 서브탭·선택을 처음으로 */
export function SlopeSync() {
  const menu = dash.use((s) => s.menu)
  useEffect(() => {
    if (menu !== MENU.slope) slope.reset()
  }, [menu])
  return null
}
