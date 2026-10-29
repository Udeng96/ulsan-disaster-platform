import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { once } from '.'

afterEach(() => vi.restoreAllMocks())

describe('once', () => {
  it('여러 곳이 써도 한 번만 받고, 받은 값으로 같이 바뀐다', async () => {
    const load = vi.fn(async () => [1, 2])
    const list = once(load, [] as number[])
    const Show = () => <span>{list.use().length}</span>
    const { container } = render(
      <>
        <Show />
        <Show />
      </>,
    )
    expect(container.textContent).toBe('00')
    await act(async () => {})
    expect(container.textContent).toBe('22')
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('실패하면 빈 값으로 두고, 다음에 붙는 곳이 다시 받는다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const load = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce([7])
    const list = once<number[]>(load, [])
    const Show = () => <span>{list.use().join()}</span>
    const first = render(<Show />)
    await act(async () => {})
    expect(first.container.textContent).toBe('')
    first.unmount()
    const second = render(<Show />)
    await act(async () => {})
    expect(second.container.textContent).toBe('7')
    expect(load).toHaveBeenCalledTimes(2)
  })
  it('reload — 다시 받아 바뀌면 알리고, 같거나 실패하면 그대로', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const load = vi.fn().mockResolvedValueOnce([1]).mockResolvedValueOnce([1]).mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce([1, 2])
    const list = once<number[]>(load, [])
    let renders = 0
    const Show = () => {
      renders += 1
      return <span>{list.use().join()}</span>
    }
    const { container } = render(<Show />)
    await act(async () => {})
    expect(container.textContent).toBe('1')
    const before = renders
    await act(async () => list.reload())
    expect(renders).toBe(before)
    await act(async () => list.reload())
    expect(container.textContent).toBe('1')
    await act(async () => list.reload())
    expect(container.textContent).toBe('1,2')
    expect(load).toHaveBeenCalledTimes(4)
  })
})
