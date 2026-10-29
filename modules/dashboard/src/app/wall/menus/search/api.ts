// 주소 검색 API — gis (답: notes/gis-front/api-질문/5-이벤트·검색-답-gis.md, 10-21).
//   juso 가 찾고 vWorld 가 좌표만 구한다. 한 번에 최대 20건, 건물명 있는 결과가 먼저, 울산만.
//   결과 없음 []. juso 가 죽으면 502 {code: SEARCH_UNAVAILABLE, message}. vWorld 가 실패한 건은 에러 없이 빠진다.
import { request } from '@/shared/api'

export interface AddressSearchItem {
  /** 'road:' + 건물관리번호 */
  id: string
  /** 건물명, 없으면 도로명주소 (비지 않는다) */
  title: string
  /** PLACE(건물명 있음) · ROAD(주소만) */
  category: string
  /** 도로명주소 (비지 않는다) */
  roadAddress: string | null
  /** 지번주소 — juso 가 "" 로 줄 수 있어 비어 있음(null)으로 바꾼다 */
  parcelAddress: string | null
  lat: number
  lng: number
}

/** 주소·건물 검색. 빈 글자면 부르지 않고 [] */
export async function searchAddress(q: string, signal?: AbortSignal): Promise<AddressSearchItem[]> {
  const k = q.trim()
  if (!k) return []
  const rows = await request<AddressSearchItem[]>('gis', '/search', { query: { q: k }, signal })
  return rows.map((r) => ({ ...r, roadAddress: r.roadAddress?.trim() || null, parcelAddress: r.parcelAddress?.trim() || null }))
}
