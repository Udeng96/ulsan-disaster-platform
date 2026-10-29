// 무더위쉼터 API client.
// 백엔드: GET /api/shelter/cooling → 무더위쉼터 71곳 (금융기관/경로당 등).
//   dev 중 Vite proxy 가 /api 를 백엔드 (8080) 로 포워딩.
//   레이어 메뉴 (idx 5) 에서 'SHELTER' 체크 시 지도 마커 표출.

export interface CoolingShelter {
  id: number
  /** 시설명 (예: '가상시설0656') */
  name: string
  /** 레이어 code — 'SHELTER'. */
  layerCode: string
  roadAddress: string | null
  parcelDetail: string | null
  lat: number
  lng: number
  /** 행정동 (예: 가상시설04721동) */
  region: string | null
  /** 시설 유형 (예: 금융기관, 경로당) */
  facilityType: string | null
  /** 수용 인원 */
  capacity: number | null
  /** 평일 개방 (HHmm) */
  weekdayOpen: string | null
  /** 평일 종료 (HHmm) */
  weekdayClose: string | null
}

/** BigDecimal → string 직렬화 대비 number 캐스팅. */
function num(v: number | string): number {
  return typeof v === 'string' ? parseFloat(v) : v
}

/** 무더위쉼터 전체 조회. */
export async function fetchCoolingShelters(): Promise<CoolingShelter[]> {
  const res = await fetch('/api/shelter/cooling')
  if (!res.ok) {
    throw new Error(
      `fetchCoolingShelters failed: ${res.status} ${res.statusText}`,
    )
  }
  const data = (await res.json()) as CoolingShelter[]
  return data.map((s) => ({ ...s, lat: num(s.lat), lng: num(s.lng) }))
}
