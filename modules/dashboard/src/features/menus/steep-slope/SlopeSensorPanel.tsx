// 급경사지 계측 상세 — 지역별 센서값 패널 (500×672).
//   지역 3곳(가상시설0680 / 가상시설0432 / 가상시설0553) 각각 헤더 + 항목 박스.
//   항목: 강우량 (RAIN_GAUGE) / 경사·함수 (INCLINOMETER) / 낙석검지 (ROCKFALL_DETECTOR)
//   경사·함수 / 낙석검지는 caret 클릭 시 센서 목록 드롭다운 (아래 공간 없으면 위로).
//
// 데이터: /slope/api/areas (1분 폴링). 토양함수계는 별도 계측기가 아니라
//   경사계의 values 안에 함수비로 함께 온다 — 이름으로 짝지을 필요가 없다.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { SlopeInstrument, ObservationValue } from '@/api/slope'
import { AREAS, type Area, type SlopeRiskLevel } from './data'
import { RISK_BADGE_COLOR, RISK_TEXT, riskOf } from './variants'
import { useSlopeAreas } from './useSlopeAreas'
import type { SelectedSensor } from './SlopeChartPanel'

/** 값 표기 — 없으면 '-'. */
function fmt(v: ObservationValue | undefined): string {
  if (!v || v.value === null) return '-'
  // 낙석 감지 횟수는 정수, 나머지는 소수 1자리.
  const digits = v.unitType === 'U210' ? 0 : 1
  return `${v.value.toFixed(digits)}${v.unit}`
}

/** 차트 패널로 넘길 센서 정보 — 차트 조회 키는 관측항목 id. */
function sensorOf(
  area: Area,
  label: string,
  inst: SlopeInstrument,
  primary: ObservationValue | undefined,
): SelectedSensor {
  return {
    observationItemId: primary?.observationItemId ?? null,
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

interface Row {
  key: string
  label: string
  value: string
  /** 우측 차트 패널로 넘길 센서 정보. */
  sensor: SelectedSensor
  /** 상태 — 계측기별 임계값 기준이 아직 없어 지역 상태를 그대로 쓴다. */
  risk: SlopeRiskLevel
  /** 센서 목록 (2개 이상일 때만 드롭다운). */
  options?: string[]
  /** 센서 목록 각각의 상태 — 드롭다운 점 색. */
  optionRisks?: SlopeRiskLevel[]
  /** 선택된 센서 index. */
  selected?: number
  onSelect?: (i: number) => void
}

function CaretIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M8.5 11.0938L12 14.5938L15.5 11.0938"
        stroke="#DCE6EE"
        strokeWidth="1.3125"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function StatusDot({ color }: { color: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="5" fill={color} />
    </svg>
  )
}

// thumb 고정 높이 (시안).
const THUMB_HEIGHT = 40

function SensorDropdown({
  row,
  onClose,
}: {
  row: Row
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  // thumb 위치 (track 상단 기준 px) — 목록 스크롤과 동기화.
  const [thumbTop, setThumbTop] = useState(0)
  // 목록이 넘칠 때만 thumb 표출.
  const [scrollable, setScrollable] = useState(false)
  // 아래 공간이 모자라면 위로 펼친다.
  const [up, setUp] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    const anchor = el?.parentElement
    // 패널 하단까지 남은 공간과 드롭다운 실제 높이를 같은 좌표계(=화면 scale 반영)에서 비교.
    const panel = anchor?.closest('.slope-sensor-panel')
    if (!el || !anchor || !panel) return
    const room = panel.getBoundingClientRect().bottom -
      anchor.getBoundingClientRect().bottom
    setUp(room < el.getBoundingClientRect().height)
    const list = listRef.current
    if (list) setScrollable(list.scrollHeight > list.clientHeight + 1)
  }, [])

  // 목록 스크롤 → thumb 위치.
  const syncThumb = () => {
    const list = listRef.current
    const track = trackRef.current
    if (!list || !track) return
    const max = list.scrollHeight - list.clientHeight
    if (max <= 0) return setThumbTop(0)
    const travel = track.clientHeight - THUMB_HEIGHT
    setThumbTop((list.scrollTop / max) * travel)
  }

  // thumb 드래그 → 목록 스크롤.
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const list = listRef.current
    const track = trackRef.current
    if (!list || !track) return
    const startY = e.clientY
    const startTop = thumbTop
    const scale = track.getBoundingClientRect().height / track.clientHeight
    const travel = track.clientHeight - THUMB_HEIGHT
    const max = list.scrollHeight - list.clientHeight
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(
        Math.max(startTop + (ev.clientY - startY) / scale, 0),
        travel,
      )
      list.scrollTop = (next / travel) * max
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div
      ref={ref}
      className="sensor-dropdown"
      style={up ? { bottom: '100%', left: 0 } : { top: '100%', left: 0 }}
    >
      <div className="sensor-dropdown-list" ref={listRef} onScroll={syncThumb}>
        {row.options?.map((name, i) => (
          <button
            key={name}
            type="button"
            className="sensor-dropdown-item"
            onClick={() => {
              row.onSelect?.(i)
              onClose()
            }}
          >
            <StatusDot color={RISK_BADGE_COLOR[row.optionRisks?.[i] ?? row.risk]} />
            {name}
          </button>
        ))}
      </div>
      <div className="sensor-dropdown-scroll" ref={trackRef}>
        {scrollable && (
          <div
            className="sensor-dropdown-thumb"
            style={{ marginTop: `${thumbTop}px` }}
            onMouseDown={startDrag}
          />
        )}
      </div>
    </div>
  )
}

function AreaBox({
  area,
  rows,
  selectedKey,
  onSelect,
}: {
  area: Area
  rows: Row[]
  selectedKey: string | null
  onSelect: (key: string, sensor: SelectedSensor) => void
}) {
  // 열린 센서 드롭다운 (row key). 바깥 클릭 시 닫힘.
  const [openRow, setOpenRow] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!openRow) return
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpenRow(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [openRow])

  return (
    <div className="slope-sensor-box" ref={boxRef}>
      <div className="slope-sensor-box-head">{area}</div>
      <div className="slope-sensor-box-body">
        {rows.map((r) => {
          const key = `${area}:${r.key}`
          const hasOptions = (r.options?.length ?? 0) > 1
          return (
            <div
              key={r.key}
              className={`slope-sensor-item ${selectedKey === key ? 'is-active' : ''}`}
              onClick={() => {
                // 다른 항목을 고르면 열려 있던 드롭다운은 닫는다.
                setOpenRow(null)
                onSelect(key, r.sensor)
              }}
            >
              <span className="slope-sensor-item-title">
                {/* 한글 잉크가 위로 떠서 오른쪽 배지 글자보다 높아 보인다 — 텍스트만 1px 내림. */}
                <span style={{ position: 'relative', top: '1px', lineHeight: 1 }}>
                  {r.label}
                </span>
                {hasOptions && (
                  <span style={{ position: 'relative', display: 'flex' }}>
                    <button
                      type="button"
                      className={`slope-list-caret ${openRow === r.key ? 'is-open' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenRow((prev) => (prev === r.key ? null : r.key))
                      }}
                    >
                      <CaretIcon />
                    </button>
                    {openRow === r.key && (
                      <SensorDropdown row={r} onClose={() => setOpenRow(null)} />
                    )}
                  </span>
                )}
              </span>
              <span className="slope-sensor-item-right">
                <span className="slope-sensor-value">{r.value}</span>
                <span
                  className="slope-sensor-status"
                  style={{ background: RISK_BADGE_COLOR[r.risk] }}
                >
                  <span style={{ position: 'relative', top: '1px' }}>
                    {RISK_TEXT[r.risk]}
                  </span>
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface PanelProps {
  /** 항목 선택 — 우측 차트 패널이 이 센서를 표출. */
  onSelectSensor?: (sensor: SelectedSensor) => void
}

export function SlopeSensorPanel({ onSelectSensor }: PanelProps) {
  // 지역별 선택 센서 index (경사·함수 / 낙석검지).
  const [tiltIdx, setTiltIdx] = useState<Record<string, number>>({})
  const [rockIdx, setRockIdx] = useState<Record<string, number>>({})
  // 선택된 항목 — 우측 상세 패널에 띄울 센서 (지역:항목 key).
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  // 계측 상세 화면 — 여기서 1분 폴링을 돌린다.
  const areas = useSlopeAreas(true)

  const boxes = useMemo(
    () =>
      AREAS.map((area) => {
        // 화면 순서는 AREAS 고정 — 응답 순서와 무관하게 이름으로 맞춘다.
        const src = areas.find((a) => a.name === area)
        const byCat = (c: string) =>
          (src?.instruments ?? []).filter((i) => i.category === c)
        const rain = byCat('RAIN_GAUGE')
        const tilts = byCat('INCLINOMETER')
        const rocks = byCat('ROCKFALL_DETECTOR')

        const rows: Row[] = []
        if (rain.length > 0) {
          const inst = rain[0]
          const v = inst.values[0]
          rows.push({
            key: 'rain',
            label: '강우량',
            value: fmt(v),
            risk: riskOf(inst.level),
            sensor: sensorOf(area, '강우량', inst, v),
          })
        }

        if (tilts.length > 0) {
          const i = Math.min(tiltIdx[area] ?? 0, tilts.length - 1)
          const inst = tilts[i]
          // 표기는 X축 | Y축 | 함수비 순. 차트 대표값은 X축(U081).
          const tilt = inst.values.find((v) => v.unitType === 'U081')
          const tiltY = inst.values.find((v) => v.unitType === 'U082')
          const moisture = inst.values.find((v) => v.unitType === 'U040')
          const label = `${moisture ? '경사·함수' : '경사'}-${i + 1}`
          rows.push({
            key: 'tilt',
            label,
            value: [tilt, tiltY, moisture]
              .filter((v) => v !== undefined)
              .map(fmt)
              .join(' | '),
            risk: riskOf(inst.level),
            sensor: sensorOf(area, label, inst, tilt),
            options: tilts.map((_, n) => `${moisture ? '경사·함수' : '경사'}-${n + 1}`),
            optionRisks: tilts.map((t) => riskOf(t.level)),
            selected: i,
            onSelect: (n) => setTiltIdx((prev) => ({ ...prev, [area]: n })),
          })
        }

        if (rocks.length > 0) {
          const i = Math.min(rockIdx[area] ?? 0, rocks.length - 1)
          const inst = rocks[i]
          const label = `낙석검지-${i + 1}`
          rows.push({
            key: 'rock',
            label,
            value: fmt(inst.values[0]),
            risk: riskOf(inst.level),
            sensor: sensorOf(area, label, inst, inst.values[0]),
            options: rocks.map((_, n) => `낙석검지-${n + 1}`),
            optionRisks: rocks.map((r) => riskOf(r.level)),
            selected: i,
            onSelect: (n) => setRockIdx((prev) => ({ ...prev, [area]: n })),
          })
        }
        return { area, rows }
      }),
    [areas, tiltIdx, rockIdx],
  )

  // 최초 진입 시 첫 항목 자동 선택 — 우측 차트 패널이 비어 보이지 않게.
  useEffect(() => {
    if (selectedKey) return
    const first = boxes.find((b) => b.rows.length > 0)
    if (!first) return
    setSelectedKey(`${first.area}:${first.rows[0].key}`)
    onSelectSensor?.(first.rows[0].sensor)
  }, [boxes, selectedKey, onSelectSensor])

  // 선택된 행의 센서가 드롭다운으로 바뀌면 차트/지도 마커도 즉시 갱신.
  const lastSentRef = useRef<string>('')
  useEffect(() => {
    if (!selectedKey) return
    const [area, rowKey] = selectedKey.split(':')
    const row = boxes.find((b) => b.area === area)?.rows.find((r) => r.key === rowKey)
    if (!row) return
    const sig = `${selectedKey}|${row.sensor.label}|${row.sensor.lat},${row.sensor.lng}`
    if (sig === lastSentRef.current) return
    lastSentRef.current = sig
    onSelectSensor?.(row.sensor)
  }, [boxes, selectedKey, onSelectSensor])

  return (
    <div className="slope-sensor-panel">
      {boxes.map((b) => (
        <AreaBox
          key={b.area}
          area={b.area}
          rows={b.rows}
          selectedKey={selectedKey}
          onSelect={(key, sensor) => {
            setSelectedKey(key)
            onSelectSensor?.(sensor)
          }}
        />
      ))}
    </div>
  )
}
