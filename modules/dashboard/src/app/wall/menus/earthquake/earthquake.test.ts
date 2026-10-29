import { describe, expect, it } from 'vitest'
import { chartOption, intensityOf, yMax } from './chart'

describe('지진가속도 차트', () => {
  it('평상시(진도 I) y축 꼭대기는 진도 I 상한 0.69 gal — 평상시 값은 바닥 가까이', () => {
    expect(yMax([])).toBe(0.69)
    expect(yMax([[0, 0.02], [1, 0.075]])).toBe(0.69)
    expect(0.05 / yMax([[0, 0.05]])).toBeLessThan(0.1)
  })
  it('값이 커지면 그 값이 든 진도 단계 상한으로', () => {
    expect(yMax([[0, 0.69]])).toBe(2.26) // 진도 II
    expect(yMax([[0, 3]])).toBe(7.45) // 진도 III
    expect(yMax([[0, 50]])).toBe(67.3) // 진도 V
    expect(yMax([[0, 1000]])).toBe(1433) // 진도 IX
    expect(yMax([[0, 2000]])).toBe(3000) // 진도 X 이상 — 2400 → 3000
  })
  it('y축은 3칸, 꼭대기 줄이 있다', () => {
    const o = chartOption([], 0)
    expect(o.yAxis.max).toBe(0.69)
    expect(o.yAxis.interval).toBeCloseTo(0.23)
    expect(o.yAxis.axisLabel.formatter(0.23)).toBe('0.2300')
    expect(o.yAxis.axisLabel.formatter(310.5)).toBe('311')
  })
  it('진도 — 단계 상한 미만이면 그 단계, 1433 gal 이상은 X', () => {
    expect(intensityOf(0)).toBe('I')
    expect(intensityOf(0.05)).toBe('I')
    expect(intensityOf(0.69)).toBe('II')
    expect(intensityOf(7.44)).toBe('III')
    expect(intensityOf(25.1)).toBe('V')
    expect(intensityOf(1432)).toBe('IX')
    expect(intensityOf(1433)).toBe('X')
  })
  it('x축은 지금부터 60초 전까지', () => {
    const o = chartOption([], 100_000)
    expect([o.xAxis.min, o.xAxis.max]).toEqual([40_000, 100_000])
    expect(o.animation).toBe(false)
  })
})
