import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createStore } from './store'

describe('createStore', () => {
  it('고른 값이 바뀔 때만 다시 그린다', () => {
    const s = createStore({ a: 1, b: 1 })
    let renders = 0
    function A() {
      renders++
      return <span>{s.use((x) => x.a)}</span>
    }
    const { container } = render(<A />)
    act(() => s.set({ b: 2 }))
    expect(renders).toBe(1)
    act(() => s.set((x) => ({ a: x.a + 1 })))
    expect(renders).toBe(2)
    expect(container.textContent).toBe('2')
    act(() => s.set({ a: 2 })) // 같은 값
    expect(renders).toBe(2)
    act(() => s.reset())
    expect(container.textContent).toBe('1')
  })
})
