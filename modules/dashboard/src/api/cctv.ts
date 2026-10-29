// CCTV 목록 — GET /api/cctv (약 1,500건).

import type { FacilityListItem } from './facility'

export interface CctvItem {
  /** CCTV id (예: "CTV0000581"). */
  cctvId: string
  /** CCTV 명 (예: "그린파킹018-월드컵북로20안길 22"). */
  name: string
  lat: number
  lng: number
  /** 구분 코드. */
  gbnCd: string
  /** VMS 장비 관리번호 (영상 재생엔 미사용 — 게이트는 cctvId 를 씀). */
  mgtNo: string
  /** PTZ 가능 여부 ('Y'/'N'). */
  ptzYn: string
  /** 행정동 id (/api/regions). 매칭되는 행정동이 없으면 null → '기타'. */
  regionId: number | null
  /** 시설물 분류 — 상위·하위 쌍의 목록. 미분류면 빈 배열. */
  facilities: CctvFacility[]
}

/** CCTV 에 붙은 시설물 분류 1건 — 상위 + (선택) 하위. */
export interface CctvFacility {
  facClfy: string
  facSubClfy: string | null
}

export async function fetchCctvList(): Promise<CctvItem[]> {
  const res = await fetch('/api/cctv')
  if (!res.ok) {
    throw new Error(`fetchCctvList failed: ${res.status} ${res.statusText}`)
  }
  const data = (await res.json()) as CctvItem[]
  // lat/lng 가 문자열로 올 수 있어 number 보정 + 좌표 없는 항목 제외.
  return data
    .map((c) => ({
      ...c,
      lat: typeof c.lat === 'string' ? parseFloat(c.lat) : c.lat,
      lng: typeof c.lng === 'string' ? parseFloat(c.lng) : c.lng,
      facilities: c.facilities ?? [],
    }))
    .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng))
}

// 기존 시설물 파이프라인(useCctvSelection 등)에서 쓰도록 FacilityListItem 으로 어댑트.
//   id — cctvId 의 숫자부분 (CTV0000581 → 581). region 은 응답에 없어 '미지정'.
//   cctvId(CTV...) 를 그대로 넘김 — Xeus 게이트의 cctvMgrNo 가 이 형식.
export function toFacilityItems(items: readonly CctvItem[]): FacilityListItem[] {
  return items.map((c) => ({
    id: Number(c.cctvId.replace(/\D/g, '')) || 0,
    type: 'CCTV' as const,
    name: c.name,
    region: '미지정',
    regionId: c.regionId ?? null,
    lat: c.lat,
    lng: c.lng,
    cctvId: c.cctvId,
  }))
}
