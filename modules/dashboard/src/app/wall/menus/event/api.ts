// 이벤트 메뉴 API — 부엉이 owl-web (답: notes/gis-front/api-질문/5-이벤트·검색-답-owl.md, 10-21).
//   이벤트 유형 1개 + 이벤트 목록 1개 + 실시간 SSE 1개. 실패는 Spring 기본 모양이라 message 가 없다 → 공통 함수가 HTTP_<상태> 로 채운다.
//   발생 지역(행정동)은 레이어 메뉴와 같은 gis /api/regions 를 쓴다 (regionIds 가 같은 id).
import { apiUrl, request } from '@/shared/api'

/** 소분류 — id 는 대분류 id 와 겹친다 */
export interface EventSubType {
  id: number
  name: string
  /** 3자리 코드 (예 '603'), 앞자리가 대분류 code */
  code: string
  groupCode: string
}

/** 대분류 — 표시 순서대로. 공지/안내(9)는 소분류가 없어 children: [] */
export interface EventType {
  id: number
  name: string
  code: string | null
  children: EventSubType[]
}

/** 이벤트 1건 — 목록·SSE 같은 모양. id·msgId 말고는 모두 비어(null) 올 수 있다.
 *  후속 전파(msgSn 증가)는 새 id 의 새 줄로 온다 */
export interface OwlEvent {
  id: number
  msgId: string
  /** 소분류 코드 (예 '601') — 앞자리로 대분류 색 */
  disasterTypeCode: string | null
  disasterTypeName: string | null
  title: string | null
  /** 시간대 없는 'yyyy-MM-ddTHH:mm:ss' (한국 시각) */
  occurDtm: string | null
  sendDtm: string | null
  /** 행안부 종료여부명 그대로 (값 목록 없음) */
  endStatus: string | null
  /** 보통 행정동 이름, 못 찾으면 원본 위치명 */
  regionName: string | null
  addr: string | null
  roadAddr: string | null
  lat: number | null
  lng: number | null
  /** 신고내역 */
  summary: string | null
}

/** 조회 조건 — 셋 다 비면 전체. typeIds 는 대분류 통째, subTypeIds 는 일부만 고른 대분류의 소분류 */
export interface EventSearchParams {
  typeIds: number[]
  subTypeIds: number[]
  regionIds: number[]
}

/** 처음·조회 때 받는 건수 (수정사항 7번, 사용자 10-21) — 서버도 안 주면 100 */
export const EVENT_LIMIT = 100

export async function fetchEventTypes(signal?: AbortSignal): Promise<EventType[]> {
  const rows = await request<EventType[]>('owl', '/event-types', { signal })
  return rows.map((t) => ({ ...t, children: t.children ?? [] }))
}

/** 최신순 (발생 일시 → 저장 순, 발생 일시 없는 건 맨 뒤), 조건에 맞는 것 중 limit 건. 콤마로 여러 개 */
export function searchEvents(p: EventSearchParams, signal?: AbortSignal) {
  const ids = (a: readonly number[]) => (a.length ? a.join(',') : undefined)
  return request<OwlEvent[]>('owl', '/events', { query: { typeIds: ids(p.typeIds), subTypeIds: ids(p.subTypeIds), regionIds: ids(p.regionIds), limit: EVENT_LIMIT }, signal })
}

/** 실시간 SSE — owl-message(이벤트 1건) · ping(15초) · connect(구독 직후). 끊긴 동안의 이벤트는 다시 보내지 않는다 */
export const STREAM_URL = apiUrl('owl', '/events/stream')
export const EVENT = { message: 'owl-message', ping: 'ping', connect: 'connect' } as const
