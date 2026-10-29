// 날씨 카드 — 좌측 패널 상단의 큰 cyan-blue 박스 (W 464 × H 336).
//   글라스 효과 (inset highlight + inset glow + 외부 shadow) + image34.png 오버레이.
//   안에 sub-component 5 종 조립:
//     1) 상단: CurrentDateTime + SkyState + HourlyForecast
//     2) WeatherMetricCard × 3 (실황: 온습도/바람/강수량)
//     3) WeatherMetricCard × 3 (대기질: 미세먼지/초미세먼지/오존)
//     4) WarningBanner (기상특보)

import type { WeatherSummary } from '@/api/weather'
import { BORDERS, SHADOWS } from '@/styles/designTokens'
import {
  HumidityIcon,
  WindIcon,
  RainfallIcon,
  DustIcon,
  FineDustIcon,
  OzoneIcon,
} from '@/icons/weather/Indicators'
import { CurrentDateTime } from './CurrentDateTime'
import { SkyState } from './SkyState'
import { HourlyForecast } from './HourlyForecast'
import { WeatherMetricCard } from './WeatherMetricCard'
import { WarningBanner } from './WarningBanner'
import {
  formatTempHum,
  formatWind,
  formatRainfall,
  gradeLabel,
} from './utils/weatherFormatters'

interface Props {
  weather: WeatherSummary | null
  now: Date
}

export function WeatherCard({ weather, now }: Props) {
  const obs = weather?.observation ?? null
  const aq = weather?.airQuality
  const sky = weather?.predictions?.[0]
  return (
    <div
      className="weather-card flex flex-col items-start"
      style={{
        width: '464px',
        height: '336px',
        padding: '16px',
        gap: '12px',
        borderRadius: '16px',
        border: BORDERS.glassCard,
        boxShadow: SHADOWS.glassCard,
      }}
    >
      {/* 상단 영역 — CurrentDateTime + SkyState + HourlyForecast */}
      <div
        className="flex items-center self-stretch"
        style={{ height: '92px', gap: '26px' }}
      >
        <div className="flex items-center" style={{ gap: '9px' }}>
          <CurrentDateTime now={now} />
          <SkyState
            skyCode={sky?.skyCode ?? null}
            ptyCode={obs?.ptyCode ?? null}
          />
        </div>
        <HourlyForecast predictions={weather?.predictions ?? []} />
      </div>

      {/* 지표 row 1 — 실황 (온도·습도 / 바람 / 강수량) */}
      <div className="flex" style={{ width: '100%', gap: '8px' }}>
        <WeatherMetricCard
          icon={<HumidityIcon />}
          label="온도·습도"
          value={formatTempHum(obs)}
        />
        <WeatherMetricCard
          icon={<WindIcon />}
          label="바람"
          value={formatWind(obs)}
        />
        <WeatherMetricCard
          icon={<RainfallIcon />}
          label="강수량"
          value={formatRainfall(obs)}
        />
      </div>

      {/* 지표 row 2 — 대기질 (미세먼지 / 초미세먼지 / 오존) */}
      <div className="flex" style={{ width: '100%', gap: '8px' }}>
        <WeatherMetricCard
          icon={<DustIcon />}
          label="미세먼지"
          value={`${gradeLabel(aq?.pm10Grade ?? null)} (PM 10)`}
        />
        <WeatherMetricCard
          icon={<FineDustIcon />}
          label="초미세먼지"
          value={`${gradeLabel(aq?.pm25Grade ?? null)} (PM 2.5)`}
        />
        <WeatherMetricCard
          icon={<OzoneIcon />}
          label="오존"
          value={gradeLabel(aq?.o3Grade ?? null)}
        />
      </div>

      {/* 기상특보 banner */}
      <WarningBanner warning={weather?.warnings?.[0] ?? null} />
    </div>
  )
}
