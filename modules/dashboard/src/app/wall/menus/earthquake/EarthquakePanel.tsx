// 지진가속도 메뉴 패널 (480 폭) — 수신 중단 배지 → 측정 지점 그림 → 채널 줄 (차트 + 진도 막대).
//   채널 목록은 /earthquake/api/instruments (조회 전·실패 때만 옛 상수 4개).
//   실시간 값은 SSE — 줄마다 자기 관측소 값만 구독한다.
import ReactECharts from 'echarts-for-react'
import { memo, useMemo } from 'react'
import { CHANNELS, fmtTime, WINDOW_MS } from '@/features/menus/earthquake/channels'
import { cn } from '@/shared/ui'
import { instrumentLabel, instrumentList } from './api'
import { chartOption, intensityOf, type Point } from './chart'
import { useSourceConnected, useStationSeries, useStreamNow } from './stream'

/** 진도 막대 — 위에서부터 IX → I */
const LEVELS = [
  { label: 'IX', bg: 'bg-intensity-9' },
  { label: 'VIII', bg: 'bg-intensity-8' },
  { label: 'VII', bg: 'bg-intensity-7' },
  { label: 'VI', bg: 'bg-intensity-6' },
  { label: 'V', bg: 'bg-intensity-5' },
  { label: 'IV', bg: 'bg-intensity-4' },
  { label: 'III', bg: 'bg-intensity-3' },
  { label: 'II', bg: 'bg-intensity-2' },
  { label: 'I', bg: 'bg-intensity-1' },
]

/** 값이 없을 때 그리는 0.0 선 (최근 60초 양 끝) */
const flat = (now: number): Point[] => [
  [now - WINDOW_MS, 0],
  [now, 0],
]

const line = 'border-t border-neutral-450'
const small = 'font-sans text-[9px] leading-3 font-normal text-neutral-200'
const sCore = "font-['S-Core_Dream'] font-extralight text-neutral-100"

const ChannelRow = memo(function ChannelRow({ code, location }: { code: string; location: string }) {
  const series = useStationSeries(code)
  const now = useStreamNow()
  // 받은 값이 없으면 0.0 으로 평평하게 그리고, 이름 밑에 '상태 확인 필요' (10-21 사용자 — 가운데 '수신 대기 중' 글은 오류처럼 보여 뺌)
  const waiting = series.length === 0
  const option = useMemo(() => chartOption(waiting ? flat(now) : series, now), [waiting, series, now])
  // 차트 머리와 진도 칸 모두 마지막 값 (같은 시각을 보인다). 진도는 그 값으로 계산
  const last = series.at(-1)
  const time = last ? fmtTime(new Date(last[0])) : '--:--:--'
  const value = last?.[1] ?? 0
  const level = intensityOf(value)
  // 막대는 IX 까지라 X 이상이면 맨 위 칸
  const lit = level === 'X' ? 'IX' : level

  return (
    // 남은 높이를 줄 수로 나눈다 — 수신 중단 배지가 뜨면 그만큼 줄어야 해서 고정 높이로 두지 않는다
    <div role="group" aria-label={code} className="flex min-h-0 flex-[1_0_0] items-center self-stretch border-t border-eq-divider">
      <div className={`flex w-24 flex-col items-center justify-center gap-0.5 self-stretch border-l border-neutral-450 bg-neutral-700 ${line}`}>
        <span className="text-center text-b3 text-neutral-100">{code}</span>
        <span className="text-center text-b3 text-neutral-100">{location}</span>
        {waiting && <span className="text-center font-sans text-[10px] leading-3 font-medium text-accent-red">상태 확인 필요</span>}
      </div>

      <div className="flex w-96 items-center self-stretch bg-neutral-800">
        <div className={`flex flex-[1_0_0] flex-col items-center justify-center gap-0.5 self-stretch border-l border-neutral-450 ${line}`}>
          <div className="flex w-[300px] flex-col gap-0.5 py-1 pr-2.5">
            <div className="flex justify-end text-right font-sans text-[10px] leading-3 font-normal text-neutral-50">
              S: {time} / D: {time} / 1 sec
            </div>
            <div className="h-[100px] w-full">
              <ReactECharts option={option} style={{ height: '100px', width: '100%' }} lazyUpdate />
            </div>
          </div>
        </div>

        <div className={`flex w-20 shrink-0 items-center justify-center gap-1 self-stretch py-3.5 ${line}`}>
          <div className="flex w-11 shrink-0 flex-col items-start self-stretch">
            <div className="flex flex-[1_0_0] items-center justify-center gap-2.5 self-stretch bg-eq-level p-2.5">
              <span className={`text-right text-[14px] leading-2.5 ${sCore}`}>{level}</span>
            </div>
            <div className="flex flex-col items-end justify-center gap-0.5 self-stretch border border-neutral-450 bg-neutral-700 p-1">
              <span className={`text-right ${small}`}>{value.toFixed(4)}</span>
              <span className={`text-right ${small}`}>{time}</span>
            </div>
          </div>
          <div className="flex flex-[1_0_0] flex-col self-stretch">
            {LEVELS.map((l) => (
              // 지금 진도 칸만 밝게, 나머지는 흐리게 (10-21 사용자 A)
              <div key={l.label} aria-current={l.label === lit || undefined} className={cn('flex items-center gap-0.5 self-stretch', l.label !== lit && 'opacity-25')}>
                <div className={`h-3 w-2 ${l.bg}`} />
                <span className={`text-right text-[8px] leading-2.5 ${sCore}`}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

export function EarthquakePanel() {
  const connected = useSourceConnected()
  const instruments = instrumentList.use()
  // 서버가 주는 계측기 그대로 (SSE 의 관측소 코드와 같은 출처라 어긋나지 않는다)
  const channels = useMemo(
    () => (instruments.length > 0 ? instruments.map((i) => ({ code: i.stationCode, location: instrumentLabel(i) })) : CHANNELS),
    [instruments],
  )
  return (
    <div className="flex size-full flex-col">
      {/* SSE 는 살아 있어도 업체 연결이 끊길 수 있다 — 차트가 멈춘 것만으로는 '조용함'과 '끊김'을 구분 못 해 글로 알린다 */}
      {!connected && (
        <div role="status" className="flex shrink-0 items-center gap-1.5 self-stretch bg-accent-red/15 px-3 py-1.5 font-sans text-[12px] leading-[14px] font-medium text-accent-red">
          계측 데이터 수신 중단
        </div>
      )}
      <img src="/images/img_earthquake-data-ss_480x240.png" alt="지진가속도 측정 지점" width={480} height={240} className="shrink-0" />
      <div className="flex min-h-0 flex-1 flex-col">
        {channels.map((c) => (
          <ChannelRow key={c.code} code={c.code} location={c.location} />
        ))}
      </div>
    </div>
  )
}
