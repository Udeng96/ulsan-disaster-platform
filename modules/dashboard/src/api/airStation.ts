// 대기질 측정소 API client.
// 백엔드: GET /api/air/stations → 측정소 7곳 (도시대기/도로변/교외).
//   dev 중 Vite proxy 가 /api 를 백엔드 (8080) 로 포워딩.
//   레이어 메뉴 (idx 5) 에서 'AIR_QUALITY' 체크 시 지도 마커 표출.

/** 측정망 분류 — 백엔드 NetworkType enum 그대로. */
export type AirNetworkType =
  | 'URBAN' // 도시대기
  | 'ROADSIDE' // 도로변대기
  | 'SUBURBAN' // 교외대기

export interface AirStation {
  id: number
  /** 측정소명 (예: '가상시설0412') */
  name: string
  /** 레이어 code — 'AIR_QUALITY'. */
  layerCode: string
  networkType: AirNetworkType
  /** 설치 위치 (예: '가상시설0422') */
  location: string | null
  address: string | null
  lat: number
  lng: number
  /** 행정동 (예: 가상시설0412) */
  region: string | null
}

/** BigDecimal → string 직렬화 대비 number 캐스팅. */
function num(v: number | string): number {
  return typeof v === 'string' ? parseFloat(v) : v
}

/** 대기질 측정소 전체 조회. */
export async function fetchAirStations(): Promise<AirStation[]> {
  const res = await fetch('/api/air/stations')
  if (!res.ok) {
    throw new Error(`fetchAirStations failed: ${res.status} ${res.statusText}`)
  }
  const data = (await res.json()) as AirStation[]
  return data.map((s) => ({ ...s, lat: num(s.lat), lng: num(s.lng) }))
}
