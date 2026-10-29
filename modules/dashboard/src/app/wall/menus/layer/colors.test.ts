import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushLayerColors, setLayerColor } from './colors'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const bodies = (f: ReturnType<typeof vi.fn>) => f.mock.calls.map((c) => JSON.parse((c[1] as RequestInit).body as string))

describe('레이어 색 저장', () => {
  it('#RRGGBB 만 받고, 바꾼 것을 한 번에 보낸다 (같은 code 는 마지막 색)', async () => {
    const f = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', f)
    setLayerColor('SHELTER', '#06B6D4')
    setLayerColor('SHELTER', '#112233')
    setLayerColor('AIR_QUALITY', 'red')
    setLayerColor('AIR_QUALITY', '#abc')
    await flushLayerColors()
    expect(f).toHaveBeenCalledTimes(1)
    expect((f.mock.calls[0] as unknown[])[0]).toBe('/api/layers/colors')
    expect(bodies(f)).toEqual([[{ code: 'SHELTER', color: '#112233' }]])
    await flushLayerColors()
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('실패하면 다음 주기에 다시 보낸다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'INTERNAL_ERROR', message: '서버 내부 오류' }), { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', f)
    setLayerColor('PUMP_STATION', '#2563EB')
    await flushLayerColors()
    await flushLayerColors()
    expect(bodies(f)).toEqual([[{ code: 'PUMP_STATION', color: '#2563EB' }], [{ code: 'PUMP_STATION', color: '#2563EB' }]])
  })
})
