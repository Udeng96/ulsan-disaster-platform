// 급경사지 계측 상세 — CCTV 자리의 지역별 계측값 패널 (500×672).
//   지역 3곳마다 강우량 / 경사·함수 / 낙석검지 한 줄씩. 줄에는 가장 위험한 센서 값을 보여 준다.
//   줄을 누르면 오른쪽 차트가 그 종류 센서를 보여 준다 — 여럿이면 전체, 센서 고르기는 차트 안 (수정 14).
//   처음 열면 첫 줄을 고른다.
//   값은 /slope/api/areas (계측 상세에서만 1분마다). 토양함수계 값은 경사계 값 안에 같이 온다.
import { memo, useEffect, useMemo, useRef } from 'react'
import { AREAS, type Area, type SlopeRiskLevel } from '@/features/menus/steep-slope/data'
import { RISK_TEXT, RISK_TO_VARIANT, riskOf } from '@/features/menus/steep-slope/variants'
import { cn } from '@/shared/ui'
import type { ObservationValue, SlopeInstrument } from './api'
import { RISK_BG } from './colors'
import { slopeAreas } from './data'
import { byRisk } from './sensors'
import { refreshGroup, selectGroup, slope, type SelectedSensor, type SensorGroup } from './state'

/** 값 — 없으면 '-'. 낙석 횟수는 정수, 나머지는 소수 1자리 */
function fmt(v: ObservationValue | undefined): string {
  if (!v || v.value === null) return '-'
  return `${v.value.toFixed(v.unitType === 'U210' ? 0 : 1)}${v.unit}`
}

/** 차트로 넘길 센서 — 차트 조회 키는 관측항목 id */
function sensorOf(area: Area, label: string, inst: SlopeInstrument, primary: ObservationValue | undefined, moisture?: ObservationValue): SelectedSensor {
  return {
    observationItemId: primary?.observationItemId ?? null,
    moistureItemId: moisture?.observationItemId ?? null,
    area,
    label,
    value: primary?.value ?? null,
    unit: primary?.unit ?? '',
    risk: riskOf(inst.level),
    spotNo: inst.spotNo,
    address: inst.address,
    installedAt: inst.installedAt,
    lat: inst.lat,
    lng: inst.lng,
  }
}

type RowKey = 'rain' | 'tilt' | 'rock'

interface Row {
  key: RowKey
  /** 대표(가장 위험한) 센서 이름 */
  label: string
  value: string
  risk: SlopeRiskLevel
  group: SensorGroup
}

/** 묶음이 바뀌었는지 (값·단계·좌표) — 같으면 차트에 다시 알리지 않는다 */
const sigOf = (g: SensorGroup) => g.sensors.map((x) => `${x.label}|${x.risk}|${x.value}|${x.lat},${x.lng}`).join(';')

const SensorRow = memo(function SensorRow({ row, active, onSelect }: { row: Row; active: boolean; onSelect: (row: Row) => void }) {
  return (
    <div
      role="button"
      aria-pressed={active}
      onClick={() => onSelect(row)}
      className={cn('flex items-center justify-between self-stretch rounded-xl border px-5 py-2.5', active ? 'border-primary bg-primary-dark' : 'border-transparent bg-white/10 hover:border-primary')}
    >
      <span className="flex items-center gap-2 font-sans text-[16px] leading-5 font-medium text-white">
        {/* 한글이 위로 떠서 오른쪽 배지 글자보다 높아 보여 글자만 1px 내림 */}
        <span className="relative top-px leading-none">{row.label}</span>
      </span>
      <span className="flex items-center gap-5">
        <span className="flex items-center justify-end gap-2 font-sans text-[16px] leading-5 font-medium text-white">{row.value}</span>
        <span className={cn('flex items-center justify-center rounded-[100px] px-3 py-1.5 font-sans text-[14px] leading-4 font-medium text-neutral-900', RISK_BG[RISK_TO_VARIANT[row.risk]])}>
          <span className="relative top-px">{RISK_TEXT[row.risk]}</span>
        </span>
      </span>
    </div>
  )
})

const pickRow = (row: Row) => selectGroup(row.group)

function AreaBox({ area, rows, selectedKey }: { area: Area; rows: Row[]; selectedKey: string | null }) {
  return (
    <div className="flex flex-col items-start gap-2 self-stretch">
      <div className="flex items-center justify-center self-stretch rounded-xl px-5 py-3 font-sans text-[18px] leading-5 font-bold text-white">{area}</div>
      <div className="flex flex-col items-start gap-2 self-stretch">
        {rows.map((r) => (
          <SensorRow key={r.key} row={r} active={selectedKey === r.group.key} onSelect={pickRow} />
        ))}
      </div>
    </div>
  )
}

export function SlopeSensors() {
  const areas = slopeAreas.use('poll')
  const selectedKey = slope.use((s) => s.group?.key ?? null)

  const boxes = useMemo(
    () =>
      AREAS.map((area) => {
        // 순서는 AREAS 고정 — 응답 순서와 상관없이 이름으로 맞춘다
        const src = areas.find((a) => a.name === area)
        const byCat = (c: string) => (src?.instruments ?? []).filter((i) => i.category === c)
        const group = (key: RowKey, name: string, axes: boolean, sensors: SelectedSensor[]): SensorGroup => ({ key: `${area}:${key}`, area, name, axes, sensors, lat: src?.lat ?? null, lng: src?.lng ?? null })
        const rows: Row[] = []
        const rain = byCat('RAIN_GAUGE')
        if (rain.length > 0) {
          const inst = rain[0]
          const v = inst.values[0]
          rows.push({ key: 'rain', label: '강우량', value: fmt(v), risk: riskOf(inst.level), group: group('rain', '강우량', false, [sensorOf(area, '강우량', inst, v)]) })
        }
        const tilts = byCat('INCLINOMETER')
        if (tilts.length > 0) {
          // X축 | Y축 | 함수비. 차트 대표값은 X축(U081)
          const name = tilts.some((t) => t.values.some((v) => v.unitType === 'U040')) ? '경사·함수' : '경사'
          const sensors = byRisk(tilts).map((n) => {
            const inst = tilts[n]
            return sensorOf(
              area,
              `${name}-${n + 1}`,
              inst,
              inst.values.find((v) => v.unitType === 'U081'),
              inst.values.find((v) => v.unitType === 'U040'),
            )
          })
          const top = tilts[byRisk(tilts)[0]]
          const shown = ['U081', 'U082', 'U040'].map((u) => top.values.find((v) => v.unitType === u)).filter((v) => v !== undefined)
          rows.push({ key: 'tilt', label: sensors[0].label, value: shown.map(fmt).join(' | '), risk: sensors[0].risk, group: group('tilt', name, true, sensors) })
        }
        const rocks = byCat('ROCKFALL_DETECTOR')
        if (rocks.length > 0) {
          const order = byRisk(rocks)
          const sensors = order.map((n) => sensorOf(area, `낙석검지-${n + 1}`, rocks[n], rocks[n].values[0]))
          rows.push({ key: 'rock', label: sensors[0].label, value: fmt(rocks[order[0]].values[0]), risk: sensors[0].risk, group: group('rock', '낙석검지', false, sensors) })
        }
        return { area, rows }
      }),
    [areas],
  )
  const boxesRef = useRef(boxes)
  const areasRef = useRef(areas)
  useEffect(() => {
    boxesRef.current = boxes
    areasRef.current = areas
  })

  // 지도에서 계측기 마커를 누르면 그 계측기가 든 줄을 고르고, 차트는 그 센서로 (수정 12).
  useEffect(() => {
    let seen = slope.get().pick?.seq ?? 0
    return slope.subscribe(() => {
      const pick = slope.get().pick
      if (!pick || pick.seq === seen) return
      seen = pick.seq
      for (const a of areasRef.current) {
        const inst = a.instruments.find((i) => i.id === pick.instrumentId)
        if (!inst || !(AREAS as readonly string[]).includes(a.name)) continue
        const key: RowKey | null = inst.category === 'RAIN_GAUGE' ? 'rain' : inst.category === 'INCLINOMETER' ? 'tilt' : inst.category === 'ROCKFALL_DETECTOR' ? 'rock' : null
        const row = key && boxesRef.current.find((b) => b.area === a.name)?.rows.find((r) => r.key === key)
        if (!row) return
        const n = a.instruments.filter((i) => i.category === inst.category).indexOf(inst)
        const sensor = row.group.sensors.find((x) => x.label.endsWith(`-${n + 1}`)) ?? row.group.sensors[0]
        selectGroup(row.group, key === 'rain' ? undefined : sensor)
        return
      }
    })
  }, [])

  // 처음 열면 첫 줄을 고르고 (오른쪽 차트가 비어 보이지 않게), 값이 새로 오면 고른 묶음을 새것으로 (고른 센서·전체는 그대로)
  const started = useRef(false)
  const lastSig = useRef('')
  useEffect(() => {
    const rows = boxes.flatMap((b) => b.rows)
    const cur = started.current ? slope.get().group : null
    const row = cur ? rows.find((r) => r.group.key === cur.key) : rows[0]
    if (!row) return
    const sig = sigOf(row.group)
    if (!cur) {
      started.current = true
      lastSig.current = sig
      selectGroup(row.group)
    } else if (sig !== lastSig.current) {
      lastSig.current = sig
      refreshGroup(row.group)
    }
  }, [boxes])

  return (
    <div data-sensor-panel className="flex h-[672px] w-[500px] flex-col items-start justify-center gap-4 rounded-2xl bg-neutral-600 p-5">
      {boxes.map((b) => (
        <AreaBox key={b.area} area={b.area} rows={b.rows} selectedKey={selectedKey} />
      ))}
    </div>
  )
}
