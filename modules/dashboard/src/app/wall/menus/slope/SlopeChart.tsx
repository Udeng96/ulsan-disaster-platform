// 급경사지 계측 상세 — 오른쪽 차트 패널 (580×672). 머리(지역·센서·상태·관측시간) → 기간 → 차트 → 최근 5칸 값.
//   GET /slope/api/observations/{id}/chart?range= — 센서·기간이 바뀔 때. 실시간만 1분마다 다시 받는다
//   (5분 칸·15분 이동합은 서버가 계산해서 화면에서 이어 붙일 수 없다).
//   기간설정은 달력으로 고른 날짜를 &from=&to= 로 보낸다 — 칸 단위는 기간 길이로 (수정사항 15번, slope 서버 지원 전).
//   수정 14 — 고른 줄의 센서가 여럿이면 처음엔 전체(센서마다 선, 경사계는 X/Y 버튼, 아래 5칸 줄 없음).
//   제목을 누르면 센서를 고른다. 경사·함수 센서 하나는 X·Y 선 + 함수비 막대.
//   서버는 센서 하나씩만 주므로 전체는 센서 수만큼 나눠 받는다.
import ReactECharts from 'echarts-for-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchObservationChart, type ChartRange, type ChartSeries, type ObservationChart } from './api'
import { RISK_TEXT, RISK_TO_VARIANT } from '@/features/menus/steep-slope/variants'
import { cn } from '@/shared/ui'
import { chartOption, customBucket, fitSlots, PERIOD_RANGE, PERIODS, stamp, tickLabel, type CustomPeriod } from './chart'
import { RISK_BG } from './colors'
import { DateRangePicker } from './DateRangePicker'
import { ymd } from './dates'
import { Caret, SensorDropdown } from './SensorDropdown'
import { pickGroupSensor, slope, type SelectedSensor, type SensorGroup, type TiltAxis } from './state'

const RECENT = 5
const POLL_MS = 60_000
const AXES: { id: TiltAxis; label: string; unitType: string }[] = [
  { id: 'x', label: 'X축', unitType: 'U081' },
  { id: 'y', label: 'Y축', unitType: 'U082' },
]

/** 센서 번호 순 ('경사-3' 의 3) */
const byNumber = <T extends { label: string }>(list: readonly T[]) => [...list].sort((a, b) => Number(a.label.split('-').at(-1)) - Number(b.label.split('-').at(-1)))

/** 차트가 보여 주는 것 — 고른 묶음·센서·기간 */
interface View {
  group: SensorGroup | null
  sensor: SelectedSensor | null
  many: boolean
  range: ChartRange
  from: string | undefined
  to: string | undefined
}

/** 응답 — 어느 센서·기간의 것인지 같이 둔다. 못 받은 센서는 null.
 *  새 응답이 올 때까지는 옛 차트·제목을 그대로 둔다 (비웠다가 다시 그리면 두 번 번쩍인다) */
type Loaded = { key: string; charts: (ObservationChart | null)[]; view: View }

const pillClass = (on: boolean) =>
  cn(
    'flex items-center justify-center rounded-[100px] border px-3.5 py-2 font-sans text-[15px] leading-4 font-medium text-white',
    on ? 'border-white bg-[linear-gradient(180deg,var(--color-primary-light)_10%,var(--color-primary-dark)_90%)]' : 'border-transparent bg-neutral-450',
  )

export function SlopeChart() {
  const liveGroup = slope.use((s) => s.group)
  const liveSensor = slope.use((s) => s.sensor)
  const axis = slope.use((s) => s.axis)
  const period = slope.use((s) => s.period)
  // 전체 — 센서가 여럿인 줄에서 아직 하나를 안 골랐을 때
  const liveMany = !!liveGroup && liveGroup.sensors.length > 1 && liveSensor === null
  // 기간설정 — 고른 날 (끝을 아직 안 골랐으면 오늘까지)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [custom, setCustom] = useState<{
    start: Date | null
    end: Date | null
  }>({ start: null, end: null })
  const isCustom = period === '기간설정'
  const span: CustomPeriod | null = isCustom && custom.start ? { from: ymd(custom.start), to: ymd(custom.end ?? new Date()) } : null
  const liveFrom = span?.from
  const liveTo = span?.to
  const liveRange = isCustom ? (span ? customBucket(span) : 'day') : PERIOD_RANGE[period]
  // 받을 관측항목 — 전체는 센서마다, 하나는 그 센서 (+ 함수비)
  const ids = useMemo(() => {
    // 전체는 번호 순 — 값이 새로 와서 위험한 순서가 바뀌어도 다시 받지 않고, 선 색도 그대로
    if (liveMany) return byNumber(liveGroup.sensors).map((x) => x.observationItemId)
    if (!liveSensor || liveSensor.observationItemId === null) return []
    return liveSensor.moistureItemId !== null ? [liveSensor.observationItemId, liveSensor.moistureItemId] : [liveSensor.observationItemId]
  }, [liveMany, liveGroup, liveSensor])
  const idsKey = ids.join(',')
  const key = `${idsKey}|${liveRange}|${liveFrom}|${liveTo}`
  const live: View = { group: liveGroup, sensor: liveSensor, many: liveMany, range: liveRange, from: liveFrom, to: liveTo }
  const liveRef = useRef(live)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const closePicker = useCallback(() => setPickerOpen(false), [])
  const idsRef = useRef(ids)
  useEffect(() => {
    idsRef.current = ids
    liveRef.current = live
  })

  useEffect(() => {
    // 기간설정은 시작 날을 고른 뒤에만
    if (idsKey === '' || (isCustom && !liveFrom)) return
    let cancelled = false
    const k = `${idsKey}|${liveRange}|${liveFrom}|${liveTo}`
    const load = () =>
      Promise.all(
        idsRef.current.map((id) =>
          id === null
            ? null
            : fetchObservationChart(id, liveRange, liveFrom && liveTo ? { from: liveFrom, to: liveTo } : undefined).catch((err) => {
                console.warn('[slope-chart] 조회 실패', err)
                return null
              }),
        ),
      ).then((charts) => !cancelled && setLoaded({ key: k, charts, view: liveRef.current }))
    void load()
    const timer = liveRange === 'realtime' ? setInterval(() => void load(), POLL_MS) : undefined
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [idsKey, liveRange, isCustom, liveFrom, liveTo])

  // 받는 중이면 옛 차트·제목을 그대로 (받을 게 없으면 — 기간을 아직 안 골랐거나 값 없는 센서 — 바로 비운다)
  const pending = idsKey !== '' && !(isCustom && !liveFrom) && loaded !== null && loaded.key !== key
  const fresh = loaded?.key === key
  const view = pending ? loaded.view : live
  const { group, sensor, range, from, to } = view
  const many = group !== null && view.many
  const charts = fresh || pending ? loaded!.charts : null
  // 임계선·단위는 받은 것 중 첫 차트 (같은 종류 센서는 같다)
  const chart = charts?.find((c) => c !== null) ?? null
  const period2 = from && to ? { from, to } : undefined
  const { series, bars } = useMemo(() => {
    if (!charts) return { series: [] as ChartSeries[], bars: undefined }
    const now = new Date()
    if (many) {
      const unitType = group.axes ? AXES.find((a) => a.id === axis)!.unitType : null
      const lines = byNumber(group.sensors).flatMap((x, i) => {
        const c = charts[i]
        if (!c) return []
        const fitted = fitSlots(c, range, now, period2)
        const s = (unitType ? fitted.find((f) => f.unitType === unitType) : fitted[0]) ?? fitted[0]
        return s ? [{ ...s, label: x.label, bar: false }] : []
      })
      return { series: lines, bars: undefined }
    }
    const [main, moisture] = charts
    const base = main ? fitSlots(main, range, now, period2) : []
    const m = moisture ? fitSlots(moisture, range, now, period2)[0] : undefined
    return {
      series: base,
      bars: m && moisture ? { series: { ...m, label: '함수비' }, unit: moisture.unit } : undefined,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- period2 는 from·to 로 정해진다
  }, [charts, many, group, axis, range, from, to])
  const unit = chart?.unit ?? sensor?.unit ?? group?.sensors[0]?.unit ?? ''
  const option = useMemo(() => chartOption(chart, series, range, unit, { many, bars }), [chart, series, range, unit, many, bars])
  const points = series[0]?.points ?? []
  const digits = unit === '회' ? 0 : 1
  // 응답을 받은 뒤에만 '없습니다' — 받는 중에 띄우면 센서를 바꿀 때마다 깜빡인다
  const isEmpty = charts !== null && !series.some((s) => s.points.some((p) => p.value !== null))
  // 최근 5칸 — 모자라면 앞을 '-' 로
  const recent = points.slice(-RECENT)
  const slots = Array.from({ length: RECENT }, (_, i) => recent[i - (RECENT - recent.length)] ?? null)
  // 관측시간은 값이 있는 마지막 칸 (멈춘 계측기를 알아보는 단서). 전체는 센서 중 가장 늦은 것
  const observedAt = series.reduce<string | null>((m, s) => {
    const at = s.points.findLast((p) => p.value !== null)?.at ?? null
    return at !== null && (m === null || at > m) ? at : m
  }, null)
  const shown = sensor ?? group?.sensors[0] ?? null
  const title = many ? `${group.area} · ${group.name} 전체` : shown ? `${shown.area} · ${shown.label}` : '센서를 선택하세요'
  // 전체의 단계는 가장 위험한 센서 (첫 센서)
  const risk = shown?.risk
  const canPick = !!group && group.sensors.length > 1
  const options = canPick
    ? [
        { name: '전체', selected: many },
        ...group.sensors.map((x) => ({
          name: x.label,
          risk: x.risk,
          selected: x.label === sensor?.label,
        })),
      ]
    : []
  const listRef = useRef<HTMLDivElement>(null)
  // 목록 바깥을 누르면 닫힘
  useEffect(() => {
    if (!listOpen) return
    const onDown = (e: MouseEvent) => {
      if (!listRef.current?.contains(e.target as Node)) setListOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [listOpen])

  return (
    <section aria-label="계측 차트" className="flex h-[672px] w-[580px] flex-col items-start gap-3 rounded-2xl bg-neutral-600 p-5">
      <div className="flex items-center self-stretch">
        <div className="flex items-center gap-2 font-sans text-[18px] leading-5 font-bold text-white">
          {canPick ? (
            <div ref={listRef} className="relative flex">
              <button type="button" aria-label="센서 고르기" aria-expanded={listOpen} onClick={() => setListOpen((o) => !o)} className="flex items-center gap-1 rounded-lg hover:text-primary-light">
                {title}
                <Caret open={listOpen} />
              </button>
              {listOpen && (
                <SensorDropdown
                  options={options}
                  onPick={(i) => {
                    setListOpen(false)
                    pickGroupSensor(i === 0 ? null : group.sensors[i - 1])
                  }}
                />
              )}
            </div>
          ) : (
            title
          )}
          {risk && (
            <span className={cn('flex items-center justify-center rounded-[100px] px-3 py-1.5 font-sans text-[14px] leading-4 font-medium text-neutral-900', RISK_BG[RISK_TO_VARIANT[risk]])}>
              <span className="relative top-px">{RISK_TEXT[risk]}</span>
            </span>
          )}
          {shown && <span className="self-end font-sans text-[12px] leading-[14px] font-medium text-neutral-200">최근 관측시간: {stamp(observedAt)}</span>}
        </div>
      </div>

      {/* 달력(442)은 이 줄 기준 — 조기경보 통계와 같은 달력 */}
      <div role="tablist" className="relative flex items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={p === period}
            onClick={() => {
              slope.set({ period: p })
              setPickerOpen(p === '기간설정' ? !pickerOpen : false)
            }}
            className={cn(pillClass(p === period), 'w-[84px]')}
          >
            <span className="relative top-px">{p}</span>
          </button>
        ))}
        {pickerOpen && <DateRangePicker start={custom.start} end={custom.end} onChange={(start, end) => setCustom({ start, end })} onClose={closePicker} />}
      </div>

      {/* 위 여백(8)은 차트 grid.top 으로 넘겨 범례가 그 안에 들어간다 */}
      <div className="relative flex min-h-0 flex-[1_1_0] items-center justify-center gap-2 self-stretch rounded-2xl bg-neutral-800 px-3 pt-2 pb-5">
        {/* 전체 경사계 — X축·Y축을 따로 본다 (범례 왼쪽) */}
        {many && group.axes && (
          <div role="tablist" aria-label="경사 축" className="absolute top-2 left-4 z-[1] flex items-center gap-1 rounded-[100px] bg-neutral-600 p-0.5">
            {AXES.map((a) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={a.id === axis}
                onClick={() => slope.set({ axis: a.id })}
                className={cn('w-12 rounded-[100px] py-1 font-sans text-[13px] leading-4 font-medium', a.id === axis ? 'bg-primary text-white' : 'text-neutral-300 hover:text-white')}
              >
                <span className="relative top-px">{a.label}</span>
              </button>
            ))}
          </div>
        )}
        {/* 전체↔하나는 아래 5칸 줄이 생기고 없어져 칸 높이가 바뀐다 — 새로 만들어 바뀐 크기로 한 번만 그린다 (옛 크기로 그렸다 늘리면 두 번 번쩍) */}
        <ReactECharts key={many ? 'many' : 'one'} option={option} style={{ height: '100%', width: '100%' }} notMerge />
        {shown && isCustom && !from && (
          <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-1/2 font-['Pretendard',sans-serif] text-[14px] leading-none font-medium text-neutral-300">기간을 선택하세요</span>
        )}
        {shown && isEmpty && (
          <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-1/2 font-['Pretendard',sans-serif] text-[14px] leading-none font-medium text-neutral-300">수집된 계측값이 없습니다</span>
        )}
      </div>

      {/* 전체는 이 줄 없이 차트를 크게 */}
      {!many && (
        <div className="flex items-center gap-2 self-stretch">
          {slots.map((p, i) => (
            <div key={p?.at ?? `empty-${i}`} className="flex flex-[1_0_0] flex-col items-center gap-2 rounded-lg bg-neutral-450 py-2">
              <span className="font-sans text-[14px] leading-none font-medium text-neutral-300">{p ? tickLabel(p.at, range) : '-'}</span>
              <span className="font-sans text-[16px] leading-none font-medium text-white">{p === null || p.value === null ? '-' : p.value.toFixed(digits)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
