// 날씨·레이더 API — weather (답: notes/gis-front/api-질문/6-날씨-답-weather.md, 10-23).
//   시각은 모두 ISO 문자열 +09:00. 기상청이 응답하지 않아도 서버는 마지막으로 받은 값을 준다.
//   실패는 {code, message} — 레이더를 아직 하나도 못 받았으면 404 RADAR_NOT_READY.
import { request } from '@/shared/api'

export interface WeatherSummary {
  location: { name: string; latitude: number | null; longitude: number | null }
  /** 아직 한 번도 못 받았으면 null */
  observation: WeatherObservation | null
  /** 지금 정시부터 1시간 간격 최대 3개 — 수집이 멈추면 적거나 [] */
  predictions: WeatherPrediction[]
  airQuality: WeatherAirQuality | null
  /** 지금 발효 중인 울산 구역 특보만 (기상청 발효 현황 순서). 없으면 [] */
  warnings: WeatherWarning[]
}

export interface WeatherObservation {
  observedAt: string
  temperatureC: number | null
  humidityPct: number | null
  rainfallMm: number | null
  windSpeedMs: number | null
  windDirectionDeg: number | null
  /** 강수 종류 — 0 없음 1 비 2 비/눈 3 눈 5 빗방울 6 빗방울/눈 7 눈날림 */
  ptyCode: number | null
}

export interface WeatherPrediction {
  forecastAt: string
  /** 하늘 — 1 맑음 3 구름많음 4 흐림 */
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
  /** 1 좋음 2 보통 3 나쁨 4 매우나쁨 */
  pm10Grade: number | null
  pm25Value: number | null
  pm25Grade: number | null
  o3Value: number | null
  o3Grade: number | null
  khaiValue: number | null
  khaiGrade: number | null
}

export interface WeatherWarning {
  /** 이 특보를 발표(변경)한 통보문 시각 */
  tmFc: string
  /** 특보 종류 — 예: 강풍주의보 */
  kind: string
  areas: string[]
  /** "강풍주의보 : 울산" */
  title: string
  /** "강풍주의보 발표 : 울산 / 해제 예고: …" — 못 찾으면 null */
  content: string | null
}

export const fetchWeatherSummary = (signal?: AbortSignal) => request<WeatherSummary>('weather', '/summary', { signal })

/** 레이더 최신 시각 (기상청에 실제로 올라온 그림의 시각, 5분 단위) */
export const fetchRadarLatest = (signal?: AbortSignal) => request<{ observedAtKst: string; imageUrl: string; radarType: string }>('weather', '/radar/latest', { signal })
