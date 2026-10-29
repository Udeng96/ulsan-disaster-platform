import { describe, expect, it } from 'vitest'
import { fmtKoDate, fmtKoTime } from './dateFormatters'

describe('dateFormatters', () => {
  it('fmtKoDate — 연월일과 요일', () => {
    expect(fmtKoDate(new Date(2026, 5, 16))).toBe('2026년 6월 16일 화요일')
  })

  it('fmtKoTime — 자정·정오·오후 경계', () => {
    expect(fmtKoTime(new Date(2026, 0, 1, 0, 5))).toEqual({ meridiem: '오전', time: '12:05' })
    expect(fmtKoTime(new Date(2026, 0, 1, 12, 0))).toEqual({ meridiem: '오후', time: '12:00' })
    expect(fmtKoTime(new Date(2026, 0, 1, 13, 7))).toEqual({ meridiem: '오후', time: '01:07' })
  })
})
