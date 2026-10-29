// 서버 부르기 — 메뉴마다 따로 쓰던 fetch 를 하나로.
//   - 모듈 이름만 주면 주소 앞부분(nginx·vite 프록시 접두)을 붙인다
//   - 시간 제한(기본 8초), 부른 쪽 signal 로 취소
//   - 실패는 모두 ApiError 하나로: 서버가 준 {code, message} 그대로 / 통신 끊김 NETWORK / 시간 초과 TIMEOUT / JSON 아님 BAD_RESPONSE
//   - 부른 쪽이 취소하면 AbortError 를 그대로 던진다 (usePolling 이 조용히 넘긴다)

/** 백엔드 모듈 → 주소 앞부분 */
const BASE = {
  gis: '/api',
  slope: '/slope/api',
  earthquake: '/earthquake/api',
  cctv: '/cctv/api',
  bcast: '/bcast/api',
  owl: '/owl',
  server: '/server/api',
  weather: '/weather/api',
  oms: '/oms',
} as const

export type ApiModule = keyof typeof BASE

export const DEFAULT_TIMEOUT_MS = 8000

export type ApiErrorKind = 'http' | 'network' | 'timeout'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  /** HTTP 상태 (통신 끊김·시간 초과는 null) */
  readonly status: number | null
  /** 서버 code (없으면 HTTP_<상태>), 또는 NETWORK·TIMEOUT */
  readonly code: string
  constructor(kind: ApiErrorKind, status: number | null, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.code = code
  }
}

export type Query = Record<string, string | number | boolean | null | undefined | readonly (string | number)[]>

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  /** 주소 뒤 ?a=1&b=2 — null·undefined 는 빼고, 배열은 같은 이름으로 여러 번 */
  query?: Query
  /** JSON 으로 보낼 값 */
  body?: unknown
  timeoutMs?: number
  signal?: AbortSignal
  /** 페이지를 닫는 중에도 보내기 (창 닫을 때 저장) */
  keepalive?: boolean
}

/** 모듈 주소 + 경로 + 쿼리 */
export function apiUrl(module: ApiModule, path: string, query?: Query): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v == null) continue
    if (Array.isArray(v)) for (const x of v) qs.append(k, String(x))
    else qs.append(k, String(v))
  }
  const s = qs.toString()
  return `${BASE[module]}${path}${s ? `?${s}` : ''}`
}

export async function request<T>(module: ApiModule, path: string, { method = 'GET', query, body, timeoutMs = DEFAULT_TIMEOUT_MS, signal, keepalive }: RequestOptions = {}): Promise<T> {
  // 시간 초과와 부른 쪽 취소를 한 signal 로 — 어느 쪽인지는 timedOut 으로 가린다
  const ac = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    ac.abort()
  }, timeoutMs)
  const onAbort = () => ac.abort(signal?.reason)
  if (signal?.aborted) onAbort()
  else signal?.addEventListener('abort', onAbort, { once: true })

  try {
    const res = await fetch(apiUrl(module, path, query), {
      method,
      signal: ac.signal,
      keepalive,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await res.text()
    if (!res.ok) {
      const err = parse(text) as { code?: unknown; message?: unknown } | undefined
      throw new ApiError(
        'http',
        res.status,
        typeof err?.code === 'string' && err.code ? err.code : `HTTP_${res.status}`,
        typeof err?.message === 'string' && err.message ? err.message : `서버 오류 (${res.status})`,
      )
    }
    if (!text) return undefined as T
    const data = parse(text)
    if (data === undefined) throw new ApiError('http', res.status, 'BAD_RESPONSE', '서버 응답을 읽을 수 없습니다')
    return data as T
  } catch (e) {
    if (e instanceof ApiError) throw e
    if (timedOut) throw new ApiError('timeout', null, 'TIMEOUT', '서버 응답이 늦습니다')
    if (signal?.aborted) throw e
    throw new ApiError('network', null, 'NETWORK', '서버에 연결할 수 없습니다')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

function parse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
