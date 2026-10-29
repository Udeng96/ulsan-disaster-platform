import { afterEach, describe, expect, it } from 'vitest'
import { addRecent, loadRecent, saveRecent, splitKeyword } from './logic'

describe('주소 검색', () => {
  afterEach(() => localStorage.clear())

  it('키워드 강조 — 대소문자 무시, 여러 번 모두', () => {
    expect(splitKeyword('Abc 달동 abc', 'ABC')).toEqual([
      { text: 'Abc', hit: true },
      { text: ' 달동 ', hit: false },
      { text: 'abc', hit: true },
    ])
    expect(splitKeyword('달동', ' ')).toEqual([{ text: '달동', hit: false }])
    expect(splitKeyword(null, '달')).toEqual([])
  })

  it('최근 검색어 — 맨 앞으로, 20개까지', () => {
    expect(addRecent(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c'])
    expect(addRecent(Array.from({ length: 20 }, (_, i) => String(i)), 'x')).toHaveLength(20)
  })

  it('저장된 값 — 글자만, 공백·중복 없이, 깨졌으면 빈 목록', () => {
    localStorage.setItem('gis-front:recent-searches', JSON.stringify([' 달동 ', 3, '달동', '', '가상시설0411']))
    expect(loadRecent()).toEqual(['달동', '가상시설0411'])
    saveRecent(['x'])
    expect(loadRecent()).toEqual(['x'])
    localStorage.setItem('gis-front:recent-searches', '{')
    expect(loadRecent()).toEqual([])
  })
})
