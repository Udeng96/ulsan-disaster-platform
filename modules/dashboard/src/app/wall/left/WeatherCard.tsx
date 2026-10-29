// 날씨 카드 — 좌측 패널 맨 위 (464×336). 시각 칸만 1초마다 다시 그린다.
import { memo } from 'react'
import type { WeatherObservation, WeatherPrediction, WeatherSummary } from './api'
import { DustIcon, FineDustIcon, HumidityIcon, OzoneIcon, RainfallIcon, WindIcon } from '@/icons/weather/Indicators'
import { WeatherIcon } from '@/icons/weather/WeatherIcon'
import { useNow } from '@/shared/hooks'
import { Marquee } from '@/shared/ui'
import { fmtHHMM, fmtKoDate, fmtKoTime } from '@/shared/utils/date'
import { formatRainfall, formatTempHum, formatWarnings, formatWind, gradeLabel, skyLabel } from './format'

const glass = 'rounded-xl border border-line-glass bg-white/10'

function DateTime() {
  const now = new Date(useNow())
  const { meridiem, time } = fmtKoTime(now)
  return (
    <div className="flex h-[58px] w-48 flex-col items-start gap-1.5 text-neutral-50 text-stroke">
      <span className="text-b2">{fmtKoDate(now)}</span>
      <div className="flex items-baseline gap-4">
        <span className="font-sans text-[31px] leading-[34px] font-semibold">{meridiem}</span>
        <span className="font-sans text-[34px] leading-[34px] font-bold tracking-[1.7px]">{time}</span>
      </div>
    </div>
  )
}

function Sky({ skyCode, ptyCode }: { skyCode: number | null; ptyCode: number | null }) {
  const label = skyLabel(skyCode, ptyCode)
  const long = label.length >= 4 // 4글자 이상이면 64 폭에 맞게 작게
  return (
    <div className="flex h-[84px] w-16 flex-col items-center">
      <div className="size-16">
        <WeatherIcon skyCode={skyCode} ptyCode={ptyCode} size={64} />
      </div>
      <span className={`text-center font-medium whitespace-nowrap text-neutral-50 text-stroke ${long ? 'text-[14px] leading-4' : 'text-[18px] leading-5'}`}>{label}</span>
    </div>
  )
}

function Hourly({ predictions }: { predictions: readonly WeatherPrediction[] }) {
  return (
    <div className="flex h-[84px] w-[138px] flex-col items-start gap-[3px]">
      {predictions.slice(0, 3).map((p) => (
        // 시간 칸·날씨 칸 너비를 정해 세 줄의 열을 맞춘다 (수정사항 3번, 10-16) — 날씨 글자 길이가 달라도 시간이 안 흔들린다
        <div key={p.forecastAt} className="flex h-[26px] items-center gap-2 self-stretch rounded-md bg-forecast-row bg-blend-plus-darker px-1.5 text-b3 text-white text-stroke-thin">
          <span className="w-11 shrink-0 text-center">{fmtHHMM(p.forecastAt)}</span>
          <span className="flex-1 text-center whitespace-nowrap">{skyLabel(p.skyCode, p.ptyCode)}</span>
        </div>
      ))}
    </div>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={`flex h-16 w-[138px] flex-col items-center gap-1 px-2 py-2.5 ${glass}`}>
      <span className="inline-flex items-center gap-1 text-b3 text-white text-stroke-thin">
        {icon}
        {label}
      </span>
      <span className="text-b2 whitespace-nowrap text-white text-stroke">{value}</span>
    </div>
  )
}

const Metrics = memo(function Metrics({ obs, weather }: { obs: WeatherObservation | null; weather: WeatherSummary | null }) {
  const aq = weather?.airQuality
  return (
    <>
      <div className="flex w-full gap-2">
        <Metric icon={<HumidityIcon />} label="온도·습도" value={formatTempHum(obs)} />
        <Metric icon={<WindIcon />} label="바람" value={formatWind(obs)} />
        <Metric icon={<RainfallIcon />} label="강수량" value={formatRainfall(obs)} />
      </div>
      <div className="flex w-full gap-2">
        <Metric icon={<DustIcon />} label="미세먼지" value={`${gradeLabel(aq?.pm10Grade ?? null)} (PM 10)`} />
        <Metric icon={<FineDustIcon />} label="초미세먼지" value={`${gradeLabel(aq?.pm25Grade ?? null)} (PM 2.5)`} />
        <Metric icon={<OzoneIcon />} label="오존" value={gradeLabel(aq?.o3Grade ?? null)} />
      </div>
    </>
  )
})

export const WeatherCard = memo(function WeatherCard({ weather }: { weather: WeatherSummary | null }) {
  const obs = weather?.observation ?? null
  return (
    <div className="flex h-[336px] w-[464px] flex-col items-start gap-3 rounded-2xl border border-line-glass p-4 shadow-glass bg-weather-card">
      <div className="flex h-[92px] items-center gap-[26px] self-stretch">
        <div className="flex items-center gap-[9px]">
          <DateTime />
          <Sky skyCode={weather?.predictions?.[0]?.skyCode ?? null} ptyCode={obs?.ptyCode ?? null} />
        </div>
        <Hourly predictions={weather?.predictions ?? []} />
      </div>
      <Metrics obs={obs} weather={weather} />
      <div className={`flex w-full items-center gap-3 px-3 py-2.5 ${glass}`}>
        <div className="flex shrink-0 items-center justify-center gap-[6.75px] rounded-[10px] bg-accent-red px-[11.25px] py-[9px]">
          <span className="text-b5 text-center text-white">기상특보</span>
        </div>
        <Marquee text={formatWarnings(weather?.warnings ?? [])} className="text-b2 text-white text-stroke" />
      </div>
    </div>
  )
})
