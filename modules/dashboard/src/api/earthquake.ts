// 지진가속도 API client.
// 백엔드: Spring Boot 8086, context-path /earthquake.
//   GET  /earthquake/api/instruments        계측기 목록
//   SSE  /earthquake/api/realtime/stream    실시간 관측값 (event: earthquake-realtime)

/** 실시간 관측 1건 — SSE 'earthquake-realtime' 이벤트의 data. */
export interface EarthquakeRealtime {
  /** 관측소 코드 (= net + '_' + obs, 예: 'US_NGG'). */
  stationCode: string
  /** 관측망 (예: 'US'). */
  net: string
  /** 관측소 (예: 'NGG'). */
  obs: string
  /** 관측 시각 — 타임존 없는 ISO ('2026-08-24T15:17:22'). */
  time: string
  /** 수평 최대가속도 (g). */
  hpga: number
  /** 3축 합성 최대가속도 (g). */
  tpga: number
}

/** 실시간 SSE 엔드포인트. */
export const EARTHQUAKE_STREAM_URL = '/earthquake/api/realtime/stream'
/** SSE 이벤트명 — 서버가 event: 로 붙여 보낸다. */
export const EARTHQUAKE_STREAM_EVENT = 'earthquake-realtime'

/** 계측기 1대 — 화면 채널 한 줄. */
export interface EarthquakeInstrument {
  id: number
  /** 관측소 코드 — SSE stationCode 와 짝을 맞추는 키 (예: 'US_NGG'). */
  stationCode: string
  net: string
  obs: string
  /** 설치 위치 (예: '가상시설0683', '가상시설0714'). */
  installLocation: string
  /** 축 구성 (예: '3축', '2축(Y,X)'). */
  axis: string
  modelName: string
  serialNo: string
  connectionType: string
  lat: number
  lng: number
}

/** 화면 라벨 — '가상시설0683(3축)' 처럼 설치 위치와 축을 합친다. */
export function instrumentLabel(i: EarthquakeInstrument): string {
  return i.axis ? `${i.installLocation}(${i.axis})` : i.installLocation
}

/** 계측기 목록 조회 — 화면 채널 목록의 소스. */
export async function fetchEarthquakeInstruments(): Promise<
  EarthquakeInstrument[]
> {
  const res = await fetch('/earthquake/api/instruments')
  if (!res.ok) {
    throw new Error(
      `fetchEarthquakeInstruments failed: ${res.status} ${res.statusText}`,
    )
  }
  const data = (await res.json()) as EarthquakeInstrument[]
  return data.map((i) => ({
    ...i,
    lat: typeof i.lat === 'string' ? parseFloat(i.lat) : i.lat,
    lng: typeof i.lng === 'string' ? parseFloat(i.lng) : i.lng,
  }))
}
