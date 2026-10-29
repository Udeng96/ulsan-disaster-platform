// CCTV API — cctv 모듈 (답: notes/gis-front/api-질문/4-CCTV-답-cctv.md, 10-21).
//   목록 1개(전체를 한 번 받아 화면이 메뉴로 거른다) + 전광판 ↔ CCTV 연결 1개.
//   실패는 {message} 또는 Spring 기본 모양 → 공통 함수가 message 가 없으면 HTTP_<상태> 로 채운다.
import type { FacilityListItem } from '@/api/facility'
import { once, request } from '@/shared/api'

/** CCTV 가 붙은 메뉴 — 재난 예·경보는 BROADCAST (옛 DISASTER_ALERT 아님) */
export type CctvMenu = 'PUMP_STATION' | 'SLOPE' | 'SEISMOMETER' | 'BROADCAST'

/** 메뉴 배정 1건 — 한 CCTV 가 여러 메뉴·여러 시설에 들어갈 수 있다 (BROADCAST 만 1:1) */
export interface CctvMenuAssign {
  menu: CctvMenu
  /** 펌프장 id · 급경사지 지구(slope.area) id · 전광판 id. 지진가속도는 null */
  facId: number | null
  /** 서버가 채운 시설 이름. 지워진 시설은 '(삭제된 시설)', 지진가속도는 null */
  facName: string | null
}

/** CCTV 1건 — 좌표가 없거나 울산권 밖이면 서버가 뺀다 */
export interface CctvItem {
  /** 'CTV0000581' — 영상 게이트(Xeus)도 이 값을 쓴다 */
  cctvId: string
  name: string
  lat: number
  lng: number
  gbnCd: string
  mgtNo: string
  ptzYn: string
  /** 행정동 — 자정 동기화 뒤 채워지기 전이면 null ('기타') */
  regionId: number | null
  regionName: string | null
  /** 배정 없으면 [] */
  menus: CctvMenuAssign[]
}

/** 전광판 전체 — 연결 없으면 cctvId null, 전광판 id 순 */
export interface SignboardCctv {
  signboardId: number
  cctvId: string | null
}

export async function fetchCctvList(signal?: AbortSignal): Promise<CctvItem[]> {
  const rows = await request<CctvItem[]>('cctv', '/map/cctv', { signal })
  // 서버가 좌표 없는 것을 빼 주지만, 한 건이라도 깨지면 지도 엔진이 멈추므로 한 번 더 거른다
  return rows.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng)).map((c) => ({ ...c, menus: c.menus ?? [] }))
}

/** CCTV 목록 — 앱 전체에서 처음 한 번, 그 뒤 매일 RELOAD_AT 에 다시 */
export const cctvList = once<readonly CctvItem[]>(fetchCctvList, [], 'cctv-list')

/** 다시 받는 시각 — 목록은 매일 00:00 동기화로만 바뀐다 (사용자 10-21).
 *  동기화는 1초 안, 이어지는 행정동 채우기는 평소 수 초라 30분 뒤면 넉넉하다 (4-CCTV-답-cctv-동기화시간.md) */
export const RELOAD_AT = { hour: 0, minute: 30 } as const

/** 다음 RELOAD_AT 까지 남은 ms (지금이 그 시각이면 내일) */
export function msToReload(now: Date): number {
  const next = new Date(now)
  next.setHours(RELOAD_AT.hour, RELOAD_AT.minute, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime()
}

export const fetchSignboardCctv = (signal?: AbortSignal) => request<SignboardCctv[]>('cctv', '/signboard-cctv', { signal })

/** 지도·5칸이 쓰는 모양으로. id 는 cctvId 의 숫자 부분 (CTV0000581 → 581) */
export function toFacilityItems(items: readonly CctvItem[]): FacilityListItem[] {
  return items.map((c) => ({
    id: Number(c.cctvId.replace(/\D/g, '')) || 0,
    type: 'CCTV' as const,
    name: c.name,
    region: c.regionName ?? '미지정',
    regionId: c.regionId ?? null,
    lat: c.lat,
    lng: c.lng,
    cctvId: c.cctvId,
  }))
}
