import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { live, type LiveMode } from '.'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('live', () => {
  it('처음 한 번만 받고, poll 이 붙어 있는 동안만 주기 갱신, 떨어지면 멈춘다', async () => {
    vi.useFakeTimers()
    vi.stubEnv('VITE_DISABLE_POLLING', 'false') // .env.local 의 개발용 끄기 무시
    let n = 0
    const load = vi.fn(async () => ++n)
    const value = live(load, 0, { intervalMs: 1000 })
    const Show = ({ mode }: { mode: LiveMode }) => <span>{value.use(mode)}</span>
    const once = render(<Show mode="once" />)
    await act(async () => {})
    expect(once.container.textContent).toBe('1')
    await act(async () => vi.advanceTimersByTime(3000))
    expect(load).toHaveBeenCalledTimes(1)

    // 갱신하는 곳이 붙으면 바로 한 번, 그 뒤 주기마다
    const poll = render(<Show mode="poll" />)
    await act(async () => {})
    expect(load).toHaveBeenCalledTimes(2)
    await act(async () => vi.advanceTimersByTime(1000))
    expect(load).toHaveBeenCalledTimes(3)
    expect(once.container.textContent).toBe('3')

    poll.unmount()
    await act(async () => vi.advanceTimersByTime(3000))
    expect(load).toHaveBeenCalledTimes(3)
  })

  it('off 는 받지 않는다, 실패하면 지난 값을 둔다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const load = vi.fn().mockResolvedValueOnce([1]).mockRejectedValueOnce(new Error('x'))
    const value = live<number[]>(load, [], { intervalMs: 1000 })
    const Show = ({ mode }: { mode: LiveMode }) => <span>{value.use(mode).join()}</span>
    const off = render(<Show mode="off" />)
    await act(async () => {})
    expect(load).not.toHaveBeenCalled()
    off.unmount()
    const a = render(<Show mode="poll" />)
    await act(async () => {})
    expect(a.container.textContent).toBe('1')
    a.unmount()
    const b = render(<Show mode="poll" />)
    await act(async () => {})
    expect(load).toHaveBeenCalledTimes(2)
    expect(b.container.textContent).toBe('1')
    b.unmount()
  })
})
