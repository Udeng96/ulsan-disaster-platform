// CCTV 동기화 이력 — 자정 배치가 남긴 변경 기록 (최대 30일 보관).
//   GET /cctv-sync/api/cctv/sync-history?from=&to=&type=&cctvId=&keyword=&page=&size=
//   응답 형태가 확정 전이라 Spring Page(content/totalElements) / {items,total} / 배열 모두 받는다.

/** 변경 종류 — 신규 등록 / 수정 / 삭제. */
export type CctvHistoryType = 'NEW' | 'UP' | 'DEL'

export interface CctvHistoryItem {
  id: number
  type: CctvHistoryType
  cctvId: string
  name: string
  gbnCd: string
  /** 동기화 시각 (ISO). */
  syncedAt: string
  /** 수정(UP) 일 때 어떤 값이 바뀌었는지 — 사람이 읽는 요약. */
  changes?: string
}

export interface CctvHistoryPage {
  items: CctvHistoryItem[]
  /** 필터 조건 전체 건수 (페이지 수 계산용). */
  total: number
}

export interface CctvHistoryQuery {
  /** 'YYYY-MM-DD' */
  from: string
  to: string
  type?: CctvHistoryType
  cctvId?: string
  keyword?: string
  page?: number
  size?: number
}

/** 응답 래핑이 무엇이든 {items,total} 로 정규화. */
function toPage(json: unknown): CctvHistoryPage {
  if (Array.isArray(json)) {
    return { items: json as CctvHistoryItem[], total: json.length }
  }
  const o = (json ?? {}) as Record<string, unknown>
  const items = (o.content ?? o.items ?? o.list ?? []) as CctvHistoryItem[]
  const total =
    (o.totalElements as number) ??
    (o.total as number) ??
    (o.totalCount as number) ??
    items.length
  return { items, total }
}

export async function fetchCctvHistory(
  q: CctvHistoryQuery,
): Promise<CctvHistoryPage> {
  const p = new URLSearchParams({ from: q.from, to: q.to })
  if (q.type) p.set('type', q.type)
  if (q.cctvId) p.set('cctvId', q.cctvId)
  if (q.keyword) p.set('keyword', q.keyword)
  if (q.page != null) p.set('page', String(q.page))
  if (q.size != null) p.set('size', String(q.size))
  const res = await fetch(`/cctv-sync/api/cctv/sync-history?${p.toString()}`)
  if (!res.ok) {
    throw new Error(`fetchCctvHistory failed: ${res.status} ${res.statusText}`)
  }
  return toPage(await res.json())
}
