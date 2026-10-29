// 주소/장소 검색 — 백엔드 /api/search (vWorld 통합검색 proxy, 프론트에 키 노출 없음).

export interface AddressSearchItem {
  /** `place:{vWorldId}` / `address:{vWorldId}` — prefix 로 종류 구분 */
  id: string
  /** 표출 명 (도로명/지번 주소 또는 장소명) */
  title: string
  /** vWorld 카테고리 (예: ROAD, PLACE, '중앙행정기관 > 교육부' 등) */
  category: string
  /** 도로명 주소 */
  roadAddress: string | null
  /** 지번 주소 */
  parcelAddress: string | null
  /** 위도 */
  lat: number
  /** 경도 */
  lng: number
}

/** 주소/장소 통합 검색. 빈 문자열이면 빈 배열. */
export async function searchAddress(q: string): Promise<AddressSearchItem[]> {
  const trimmed = q.trim()
  if (!trimmed) return []
  const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
  if (!res.ok) {
    throw new Error(`searchAddress failed: ${res.status} ${res.statusText}`)
  }
  const data = (await res.json()) as AddressSearchItem[]
  // 빈 문자열 주소는 null 로 정규화 (백엔드가 "" 로 내려주는 경우).
  return data.map((d) => ({
    ...d,
    roadAddress: d.roadAddress?.trim() || null,
    parcelAddress: d.parcelAddress?.trim() || null,
  }))
}
