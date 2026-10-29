// weather (날씨 / 대기질 / 특보) 타입 + fetch.
// endpoint: /weather/api/summary — weather 서비스 (8090, context-path /weather).

export interface WeatherSummary {
  location: WeatherLocation
  observation: WeatherObservation | null
  predictions: WeatherPrediction[]
  airQuality: WeatherAirQuality | null
  warnings: WeatherWarning[]
}

export interface WeatherLocation {
  name: string
  /** BigDecimal → string 으로 올 가능성 대비 number 캐스팅 */
  latitude: number
  longitude: number
}

export interface WeatherObservation {
  observedAt: string // ISO offset datetime
  temperatureC: number | null
  humidityPct: number | null
  rainfallMm: number | null
  windSpeedMs: number | null
  windDirectionDeg: number | null
  /** 강수 종류 — 0=없음 1=비 2=비/눈 3=눈 5=빗방울 6=빗방울/눈 7=눈날림 */
  ptyCode: number | null
}

export interface WeatherPrediction {
  forecastAt: string
  /** 하늘 상태 — 1=맑음 3=구름많음 4=흐림 */
  skyCode: number | null
  ptyCode: number | null
  temperatureC: number | null
  humidityPct: number | null
  rainfallMm: number | null
  windSpeedMs: number | null
  windDirectionDeg: number | null
}

export interface WeatherAirQuality {
  measuredAt: string
  stationName: string
  pm10Value: number | null
  /** 1=좋음 2=보통 3=나쁨 4=매우나쁨 */
  pm10Grade: number | null
  pm25Value: number | null
  pm25Grade: number | null
  o3Value: number | null
  o3Grade: number | null
  khaiValue: number | null
  khaiGrade: number | null
}

export interface WeatherWarning {
  tmFc: string
  title: string
  content: string | null
}

// 위성 이미지 한 프레임 (애니메이션용)
export interface SatelliteFrame {
  observedAtKst: string // ISO offset datetime
  sourceUrl: string // KMA hosted image URL (PNG/JPG)
}

// 레이더 최신 이미지 — /weather/api/radar/latest.
//   imageUrl 은 /kma-radar/... 경로 (vite proxy → www.kma.go.kr forward).
export interface RadarLatestInfo {
  observedAtKst: string // ISO offset datetime
  imageUrl: string
  radarType: string
}

/** 레이더 최신 이미지 조회. */
export async function fetchRadarLatest(): Promise<RadarLatestInfo> {
  const res = await fetch('/weather/api/radar/latest')
  if (!res.ok) {
    throw new Error(`fetchRadarLatest failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as RadarLatestInfo
}

/** 날씨 요약 조회 (관측 + 예보 + 대기질 + 특보). */
export async function fetchWeatherSummary(): Promise<WeatherSummary> {
  const res = await fetch('/weather/api/summary')
  if (!res.ok) {
    throw new Error(
      `fetchWeatherSummary failed: ${res.status} ${res.statusText}`,
    )
  }
  const data = (await res.json()) as WeatherSummary
  // BigDecimal → string 으로 올 가능성 대비 좌표 number 캐스팅.
  const { location } = data
  return {
    ...data,
    location: {
      ...location,
      latitude:
        typeof location.latitude === 'string'
          ? parseFloat(location.latitude)
          : location.latitude,
      longitude:
        typeof location.longitude === 'string'
          ? parseFloat(location.longitude)
          : location.longitude,
    },
  }
}
