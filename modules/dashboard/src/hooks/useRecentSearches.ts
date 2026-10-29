import { useCallback, useEffect, useState } from 'react'

// 최근 검색어 localStorage 키 (디바이스 단위, 사용자 계정 X).
const STORAGE_KEY = 'gis-front:recent-searches'
const MAX_ITEMS = 20

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // 문자열만 통과 + 중복 제거 (구버전 데이터 호환).
    const seen = new Set<string>()
    const cleaned: string[] = []
    for (const item of parsed) {
      if (typeof item !== 'string') continue
      const trimmed = item.trim()
      if (!trimmed || seen.has(trimmed)) continue
      seen.add(trimmed)
      cleaned.push(trimmed)
    }
    return cleaned.slice(0, MAX_ITEMS)
  } catch {
    return []
  }
}

/**
 * 최근 검색어 훅 — localStorage 영속, 디바이스 단위.
 *
 * - `items`: 최신 순 string[] (최대 20)
 * - `add(keyword)`: 중복 제거 후 맨 앞에 삽입. 이미 있으면 그것만 맨 앞으로 이동.
 * - `remove(keyword)`: 해당 항목 제거.
 * - `clear()`: 전체 비움.
 */
export function useRecentSearches() {
  const [items, setItems] = useState<string[]>(loadFromStorage)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // storage quota 등 — 저장 실패는 무시 (메모리 상태는 유지).
    }
  }, [items])

  const add = useCallback((keyword: string) => {
    const trimmed = keyword.trim()
    if (!trimmed) return
    setItems((prev) => {
      const filtered = prev.filter((k) => k !== trimmed)
      return [trimmed, ...filtered].slice(0, MAX_ITEMS)
    })
  }, [])

  const remove = useCallback((keyword: string) => {
    setItems((prev) => prev.filter((k) => k !== keyword))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  return { items, add, remove, clear }
}
