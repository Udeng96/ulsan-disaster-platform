// 재난 예·경보 API — 메뉴를 열면 바로 보이는 목록만 (답: notes/gis-front/api-질문/7-재난예경보-답-broadcast.md, -답-gis.md, 10-22).
//   broadcast: 방송장비·전광판 목록, 메시지 유형(문구) 목록 — nginx /bcast 를 거친다
//   gis: 권한·부서 목록 (OMS 표를 gis 가 직접 읽음)
//   송출·문구 추가·수정·삭제·권한 확인·가입은 아직 옛 @/api — OMS 리팩토링 뒤에 옮긴다 (사용자 10-22)
//   broadcast 는 null 인 필드를 아예 빼고 보낸다 (non_null) → 없을 수 있는 필드는 모두 ? 로 둔다
import type { FacilityListItem } from '@/api/facility'
import { request } from '@/shared/api'

/** 방송장비 1건 — id 순 */
export interface Terminal {
  id: number
  /** 음성 송출 targets[].code 에 넣는 값 (송출은 나중에 옮김) */
  terminalCode: string
  /** "가상시설0004" — 앞 (행정동) 은 떼고, 끝 '@' 는 아파트 표시 (아직 48개 남음) */
  name: string
  layerCode: string
  commType: string
  phone?: string
  address?: string
  lat?: number
  lng?: number
  installedAt?: string
  manufacturer?: string
  model?: string
  /** 14종 (아파트·경로당·어린이집·주민센터 …), 늘 있음 */
  groupType: string
  region?: string
}

/** 전광판 1건 — id 순. host 없는 전광판(가상시설0692)도 온다 */
export interface Signboard {
  id: number
  name: string
  layerCode: string
  address?: string
  /** 송출 도메인 */
  host?: string
  lat?: number
  lng?: number
  region?: string
}

/** 메시지 유형 칩 — id 순 */
export interface Template {
  id: number
  title: string
  content: string
}

export interface EventRole {
  /** 'ROLE_…' 글자 */
  id: string
  name: string
  description: string
}
export interface Department {
  id: string
  code: string
  name: string
}
/** 권한은 이름순, 부서는 울산 · 관리 부서 뺀 것 · code 순 */
export interface RolesDepartments {
  eventRoles: EventRole[]
  departments: Department[]
}

/** "가상시설0004" → "달동어울림@" — 앞 행정동은 트리 묶음과 겹쳐서 뗀다 */
export const cleanTerminalName = (raw: string) => raw.replace(/^\([^)]*\)\s*/, '').trim()

/** 좌표가 없으면 NaN — 트리에는 두고 지도에서만 뺀다 (지도는 Number.isFinite 로 거른다) */
const coord = (v: number | undefined) => (typeof v === 'number' ? v : NaN)

export async function fetchTerminals(signal?: AbortSignal): Promise<FacilityListItem[]> {
  const rows = await request<Terminal[]>('bcast', '/broadcast/terminals', { signal })
  return rows.map((t) => ({
    id: t.id,
    type: 'BROADCAST' as const,
    name: cleanTerminalName(t.name),
    region: t.region?.trim() || '미지정',
    lat: coord(t.lat),
    lng: coord(t.lng),
    isApartment: t.groupType === '아파트' || /@\s*$/.test(t.name),
    groupType: t.groupType?.trim() || undefined,
  }))
}

export async function fetchSignboards(signal?: AbortSignal): Promise<FacilityListItem[]> {
  const rows = await request<Signboard[]>('bcast', '/broadcast/signboards', { signal })
  return rows.map((b) => ({
    id: b.id,
    type: 'DISASTER_SIGNBOARD' as const,
    name: b.name.trim(),
    region: b.region?.trim() || '미지정',
    lat: coord(b.lat),
    lng: coord(b.lng),
    host: b.host || undefined,
  }))
}

export const fetchTemplates = (signal?: AbortSignal) => request<Template[]>('bcast', '/broadcast/templates', { signal })

export const fetchRolesDepartments = (signal?: AbortSignal) => request<RolesDepartments>('gis', '/oms/roles-departments', { signal })
