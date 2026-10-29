import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiUrl, request } from '.'

const respond = (status: number, body: unknown) => vi.fn(async () => new Response(body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body), { status }))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('apiUrl', () => {
  it('모듈 앞부분을 붙이고 빈 값은 빼고 배열은 여러 번', () => {
    expect(apiUrl('slope', '/areas')).toBe('/slope/api/areas')
    expect(apiUrl('owl', '/events', { regionIds: [1, 2], q: null, size: 100 })).toBe('/owl/events?regionIds=1&regionIds=2&size=100')
  })
})

describe('request', () => {
  it('성공 — JSON 을 풀어 돌려주고, body 는 JSON 으로 보낸다', async () => {
    const f = respond(200, { ok: 1 })
    vi.stubGlobal('fetch', f)
    await expect(request('bcast', '/broadcast/voice', { method: 'POST', body: { a: 1 } })).resolves.toEqual({ ok: 1 })
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/bcast/api/broadcast/voice')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"a":1}')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('빈 응답(204 등)은 undefined', async () => {
    vi.stubGlobal('fetch', respond(204, undefined))
    await expect(request('gis', '/layers/colors', { method: 'PUT', body: [] })).resolves.toBeUndefined()
  })

  it('서버가 준 {code, message} 를 그대로 담는다', async () => {
    vi.stubGlobal('fetch', respond(502, { code: 'SEARCH_UNAVAILABLE', message: '주소 검색을 할 수 없습니다' }))
    const e = await request('gis', '/search').catch((x: unknown) => x)
    expect(e).toBeInstanceOf(ApiError)
    expect(e).toMatchObject({ kind: 'http', status: 502, code: 'SEARCH_UNAVAILABLE', message: '주소 검색을 할 수 없습니다' })
  })

  it('에러 본문이 없거나 JSON 이 아니면 HTTP_<상태>', async () => {
    vi.stubGlobal('fetch', respond(500, '<html>oops</html>'))
    await expect(request('gis', '/regions')).rejects.toMatchObject({ kind: 'http', status: 500, code: 'HTTP_500', message: '서버 오류 (500)' })
  })

  it('성공인데 JSON 이 아니면 BAD_RESPONSE', async () => {
    vi.stubGlobal('fetch', respond(200, '<html>login</html>'))
    await expect(request('gis', '/regions')).rejects.toMatchObject({ kind: 'http', code: 'BAD_RESPONSE' })
  })

  it('통신이 끊기면 NETWORK', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(request('slope', '/areas')).rejects.toMatchObject({ kind: 'network', status: null, code: 'NETWORK' })
  })

  // 요청이 끝나지 않다가 signal 로 끊기는 fetch
  const hanging = vi.fn(
    (_: string, init: RequestInit) =>
      new Promise<Response>((_ok, fail) => init.signal?.addEventListener('abort', () => fail(new DOMException('aborted', 'AbortError')))),
  )

  it('시간이 넘으면 TIMEOUT', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', hanging)
    const p = request('earthquake', '/instruments', { timeoutMs: 1000 }).catch((x: unknown) => x)
    await vi.advanceTimersByTimeAsync(1000)
    expect(await p).toMatchObject({ kind: 'timeout', code: 'TIMEOUT' })
  })

  it('부른 쪽이 취소하면 AbortError 그대로 (ApiError 아님)', async () => {
    vi.stubGlobal('fetch', hanging)
    const ac = new AbortController()
    const p = request('cctv', '/map/cctv', { signal: ac.signal }).catch((x: unknown) => x)
    ac.abort()
    const e = await p
    expect(e).not.toBeInstanceOf(ApiError)
    expect((e as DOMException).name).toBe('AbortError')
  })
})
