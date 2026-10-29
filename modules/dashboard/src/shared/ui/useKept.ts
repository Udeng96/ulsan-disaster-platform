// 닫힐 때 움직임이 끝날 때까지 마지막 값을 붙잡아 둔다 — 확대 창이 작아지는 동안 내용이 사라지지 않게.
//   value 가 있으면 그대로, null 이 되면 ms 동안 마지막 값을 돌려준 뒤 null.
import { useEffect, useState } from 'react'

/** 확대 창 열고 닫기 시간 — tokens.css 의 transition-zoom 과 같은 값 */
export const ZOOM_MS = 450

export function useKept<T>(value: T | null, ms: number): T | null {
  const [kept, setKept] = useState(value)
  // 새 값이 오면 바로 바꾼다 (렌더 중 갱신 — 효과로 한 박자 늦추지 않게)
  if (value !== null && value !== kept) setKept(value)
  useEffect(() => {
    if (value !== null || kept === null) return
    const id = window.setTimeout(() => setKept(null), ms)
    return () => window.clearTimeout(id)
  }, [value, kept, ms])
  return value ?? kept
}

/** 값이 바뀌면 ms 동안 바로 앞의 값을 돌려준다 (그 밖에는 null) — 새 것이 덮으며 들어오는 동안 밑에 이전 것을 깔아 두게.
 *  앞의 값이 null 이었으면(없다가 생김) null. */
export function usePrevious<T>(value: T | null, ms: number): T | null {
  const [cur, setCur] = useState(value)
  const [prev, setPrev] = useState<T | null>(null)
  if (value !== cur) {
    setCur(value)
    setPrev(cur)
  }
  useEffect(() => {
    if (prev === null) return
    const id = window.setTimeout(() => setPrev(null), ms)
    return () => window.clearTimeout(id)
  }, [prev, ms])
  return prev
}
