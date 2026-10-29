// 부엉이 이벤트 — OMS(재난문자) 이벤트 검색.
//   GET /api/regions        — 남구 행정동 14개 (gis 서비스)
//   GET /owl/event-types    — 이벤트 종류 (기타 code=null 포함, flat)
//   GET /owl/events         — 이벤트 리스트 (typeIds/regionIds 콤마 다중)
//   ※ 부엉이 서비스는 context-path /owl (별도 서비스).

// 행정동 — GET /api/regions
export interface RegionItem {
  id: number
  code: string
  name: string
}

// 이벤트 종류 — GET /owl/event-types.
//   대분류(긴급구조/사회재난/…) 아래 소분류(화재/구조/구급/…) 가 children 으로 온다.
//   ⚠️ 대분류 id 와 소분류 id 가 서로 겹치므로 화면에서 키를 만들 때 구분이 필요하다.
export interface EventTypeChild {
  id: number
  name: string
  /** 3자리 코드 (예: '603'). 앞자리가 대분류 code. */
  code: string
  /** 소속 대분류 code (예: '6'). */
  groupCode: string
}

export interface EventTypeItem {
  id: number
  name: string
  code: string | null
  children?: EventTypeChild[]
}

// 이벤트 — GET /owl/events, SSE /owl/events/stream (같은 스키마).
//   식별자는 msgId + msgSn (같은 상황의 후속 전파는 msgSn 이 올라간다).
//   id 는 목록 API 에만 있을 수 있어 optional.
export interface EventListItem {
  id?: number
  msgId: string
  /** 같은 msgId 안의 전파 순번 ('1', '2' …). 원본 수신 payload 에만 있을 수 있다. */
  msgSn?: string
  /** 메시지 유형 (예: 'EMERGENCY_RESCUE'). */
  msgType?: string
  disasterTypeCode: string | null
  disasterTypeName: string
  title: string
  occurDtm: string
  sendDtm: string
  endStatus: string | null
  regionCode: string
  regionName: string
  addr: string | null
  roadAddr: string | null
  lat: number
  lng: number
  /** 신고일시·신고내역·진행상황이 줄바꿈으로 들어온 요약문. */
  summary?: string
}

// 대분류(= disasterTypeCode 앞자리) 별 색 — 목록 유형 셀 / 마커 공용.
//   6 긴급구조 · 2 사회재난 · 1 자연재난 · 4 해외재난 · 5 모의훈련 · 9 공지/안내
export const EVENT_GROUP_COLOR: Record<string, string> = {
  '6': '#FF453A',
  '2': '#FF9F0A',
  '1': '#30D158',
  '4': '#BF5AF2',
  '5': '#64D2FF',
  '9': '#98A2B3',
}

/** 이벤트 유형 색 — 코드 앞자리로 대분류를 찾는다. 모르면 흰색. */
export function eventTypeColor(disasterTypeCode: string | null): string {
  if (!disasterTypeCode) return '#FFFFFF'
  return EVENT_GROUP_COLOR[disasterTypeCode[0]] ?? '#FFFFFF'
}

/** 오늘(로컬 기준) 발생한 이벤트인지 — 관제 화면은 금일 건만 본다.
 *  ⚠️ 서버에 날짜 파라미터가 생기면 조회 단계에서 거르도록 바꾼다. */
export function isToday(e: EventListItem): boolean {
  const t = e.occurDtm ?? e.sendDtm
  if (!t) return false
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

/** 이벤트 식별자 — 목록/SSE 공통.
 *  id 가 오면 그것을, 없으면 msgId(+msgSn) 로 대체한다. */
export function eventKey(e: EventListItem): string {
  if (e.id != null) return String(e.id)
  return e.msgSn ? `${e.msgId}-${e.msgSn}` : e.msgId
}

// 검색 조건 — EventSearchForm → EventPanel.
//   typeIds    : 대분류가 통째로 선택된 것 (그 아래 전부).
//   subTypeIds : 부분 선택된 대분류에서 체크된 소분류만.
//   regionIds  : 선택 행정동 id.
//   셋 다 비면 파라미터 없이 = 전체.
export interface EventSearchParams {
  typeIds: number[]
  subTypeIds: number[]
  regionIds: number[]
}

// ── fetch ──
export async function fetchRegions(): Promise<RegionItem[]> {
  const res = await fetch('/api/regions')
  if (!res.ok) throw new Error(`fetchRegions failed: ${res.status}`)
  return res.json()
}

export async function fetchEventTypes(): Promise<EventTypeItem[]> {
  const res = await fetch('/owl/event-types')
  if (!res.ok) throw new Error(`fetchEventTypes failed: ${res.status}`)
  return res.json()
}

// 이벤트 조회 — GET /owl/events?typeIds=1,3&subTypeIds=5,6&regionIds=2,5
//   (콤마 다중, 빈 값은 param 생략 → 셋 다 없으면 전체).
export async function searchEvents(
  params: EventSearchParams,
): Promise<EventListItem[]> {
  const q = new URLSearchParams()
  if (params.typeIds.length) q.set('typeIds', params.typeIds.join(','))
  if (params.subTypeIds.length) {
    q.set('subTypeIds', params.subTypeIds.join(','))
  }
  if (params.regionIds.length) q.set('regionIds', params.regionIds.join(','))
  const qs = q.toString()
  const res = await fetch(`/owl/events${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error(`searchEvents failed: ${res.status}`)
  return res.json()
}
