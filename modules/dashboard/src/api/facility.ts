// 시설물 — 타입 정의만 보존.
// fetchFacilities / fetchFacilityDetail 은 백엔드 contract 재설계 대기 중 — 호출 코드 정리 시 제거됨.
// 추후 endpoint 확정 시 카테고리별 API 로 분리될 수도 (pumpStation.ts 처럼).

export type FacilityType =
  | 'CCTV'
  | 'BROADCAST'
  | 'PUMP_STATION'
  // 급경사지 관련
  | 'STEEP_SLOPE'
  | 'ROCKFALL_DETECTOR'
  | 'RAIN_GAUGE'
  | 'SLOPE_INSTRUMENT'
  // 지진가속도
  | 'SEISMOMETER'
  // 재난 예·경보 (재해전광판)
  | 'DISASTER_SIGNBOARD'

export interface FacilityListItem {
  id: number
  type: FacilityType
  name: string
  region: string
  /** 위도 (BigDecimal 직렬화 → string 으로 올 수도 있어 number 캐스팅) */
  lat: number
  /** 경도 */
  lng: number
  /** BROADCAST 타입일 때만 채워짐. 원본 이름에 @ 마커 있던 아파트 시설 표시. */
  isApartment?: boolean
  /** BROADCAST 타입일 때만 채워짐 — 백엔드 분류 (경로당/아파트/주민센터/태화강 등). */
  groupType?: string
  /** DISASTER_SIGNBOARD 타입일 때만 채워짐 — 송출 대상 도메인 (미설정 전광판은 없음). */
  host?: string
  /** CCTV 타입일 때만 채워짐 — 관리번호. Xeus 플레이어의 cctvMgrNo. */
  cctvId?: string
  /** CCTV 타입일 때만 채워짐 — 행정동 id. 없으면 null ('기타'). */
  regionId?: number | null
}

export interface CctvDetail {
  seqNo: number | null
  mgmtNo: string | null
  militaryCoord: string | null
  category: string | null
  avniFlag: string | null
  cctvCount: number | null
  rotationType: string | null
}

export interface FacilityDetail {
  id: number
  type: FacilityType
  name: string
  address: string | null
  region: string | null
  lat: number
  lng: number
  installDate: string | null
  cctv?: CctvDetail
  // broadcast / pumpStation 은 필요 시 타입 추가
}

// ---------- 자동음성통보 (방송장비) ----------

/** 백엔드 /api/broadcast/terminals 응답 원본. */
export interface BroadcastTerminal {
  id: number
  terminalCode: string // 예: 'SGB129'
  /** 원본 이름 — "가상시설0003" / "가상시설0004" (@ = 아파트 마커) */
  name: string
  commType: string // 예: 'BROADCAST_CDMA'
  phone: string | null
  address: string | null
  lat: number
  lng: number
  installedAt: string | null
  manufacturer: string | null
  model: string | null
  /** 분류 (예: '경로당', '아파트', '어린이집', '센터') */
  groupType: string | null
  /** 행정동 (예: '달동', '가상시설0412') */
  region: string | null
}

/** 원본 이름 정리 — "가상시설0004" → "달동어울림@".
 *  지역 prefix 만 제거 (region 필드/트리 그룹과 중복). @ 아파트 마커는 표시 유지. */
function cleanBroadcastName(raw: string): string {
  return raw.replace(/^\([^)]*\)\s*/, '').trim()
}

/** 방송장비 목록 조회 → DisasterPanel 이 쓰는 FacilityListItem 으로 어댑트. */
export async function fetchBroadcastTerminals(): Promise<FacilityListItem[]> {
  const res = await fetch('/api/broadcast/terminals')
  if (!res.ok) {
    throw new Error(
      `fetchBroadcastTerminals failed: ${res.status} ${res.statusText}`,
    )
  }
  const data = (await res.json()) as BroadcastTerminal[]
  return data.map((t) => ({
    id: t.id,
    type: 'BROADCAST' as const,
    name: cleanBroadcastName(t.name),
    region: t.region?.trim() || '미지정',
    lat: typeof t.lat === 'string' ? parseFloat(t.lat) : t.lat,
    lng: typeof t.lng === 'string' ? parseFloat(t.lng) : t.lng,
    // 아파트 여부 — 백엔드 groupType 우선, 없으면 이름 @ 마커.
    isApartment: t.groupType === '아파트' || /@\s*$/.test(t.name),
    groupType: t.groupType?.trim() || undefined,
  }))
}

// ---------- 재해문자전광판 ----------

/** 백엔드 /api/signboard/boards 응답 원본. */
export interface DisasterBoard {
  id: number
  name: string
  address: string | null
  lat: number
  lng: number
  /** 행정동 */
  region: string | null
  /** 송출 대상 도메인 — 미설정 전광판은 null. */
  host: string | null
}

/** 재해문자전광판 목록 조회 → FacilityListItem 으로 어댑트. */
export async function fetchDisasterBoards(): Promise<FacilityListItem[]> {
  const res = await fetch('/api/signboard/boards')
  if (!res.ok) {
    throw new Error(
      `fetchDisasterBoards failed: ${res.status} ${res.statusText}`,
    )
  }
  const data = (await res.json()) as DisasterBoard[]
  return data.map((b) => ({
    id: b.id,
    type: 'DISASTER_SIGNBOARD' as const,
    name: b.name.trim(),
    region: b.region?.trim() || '미지정',
    lat: typeof b.lat === 'string' ? parseFloat(b.lat) : b.lat,
    lng: typeof b.lng === 'string' ? parseFloat(b.lng) : b.lng,
    host: b.host ?? undefined,
  }))
}
