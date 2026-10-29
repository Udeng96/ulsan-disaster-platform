// 검색 결과 타이틀에서 키워드와 일치하는 부분만 Teal 로 강조.
//   - 대소문자 무시 (영문 대비)
//   - 다중 출현 모두 강조
//   - 키워드 없으면 그대로 반환

import type { ReactNode } from 'react'

const HIGHLIGHT_COLOR = '#00D2E0'

export function highlightKeyword(
  text: string | null | undefined,
  keyword: string,
): ReactNode {
  if (!text) return ''
  const k = keyword.trim()
  if (!k) return text
  const lowerText = text.toLowerCase()
  const lowerKey = k.toLowerCase()
  const parts: ReactNode[] = []
  let cursor = 0
  let n = 0
  while (cursor < text.length) {
    const found = lowerText.indexOf(lowerKey, cursor)
    if (found === -1) {
      parts.push(text.slice(cursor))
      break
    }
    if (found > cursor) parts.push(text.slice(cursor, found))
    parts.push(
      <span key={n++} style={{ color: HIGHLIGHT_COLOR }}>
        {text.slice(found, found + k.length)}
      </span>,
    )
    cursor = found + k.length
  }
  return parts
}
