// 주소 검색 계산 — 키워드 강조 조각, 최근 검색어(이 기기 localStorage, 최신 20개).

/** 글을 키워드와 같은 부분(hit)과 나머지로 나눈다 — 대소문자 무시, 여러 번 나와도 전부 */
export function splitKeyword(text: string | null | undefined, keyword: string): { text: string; hit: boolean }[] {
  if (!text) return []
  const k = keyword.trim().toLowerCase()
  if (!k) return [{ text, hit: false }]
  const lower = text.toLowerCase()
  const out: { text: string; hit: boolean }[] = []
  let at = 0
  while (at < text.length) {
    const found = lower.indexOf(k, at)
    if (found === -1) {
      out.push({ text: text.slice(at), hit: false })
      break
    }
    if (found > at) out.push({ text: text.slice(at, found), hit: false })
    out.push({ text: text.slice(found, found + k.length), hit: true })
    at = found + k.length
  }
  return out
}

const STORAGE_KEY = 'gis-front:recent-searches'
const MAX_RECENT = 20

/** 저장된 최근 검색어 — 글자만, 앞뒤 공백·중복 없이 (옛 데이터도 받아 준다) */
export function loadRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    const words = parsed.filter((x): x is string => typeof x === 'string').map((x) => x.trim())
    return [...new Set(words.filter(Boolean))].slice(0, MAX_RECENT)
  } catch {
    return []
  }
}
export function saveRecent(items: readonly string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // 저장 공간 부족 등 — 화면 값은 그대로 둔다
  }
}
/** 검색한 말을 맨 앞으로 (있던 건 옮김) */
export const addRecent = (items: readonly string[], word: string) => [word, ...items.filter((k) => k !== word)].slice(0, MAX_RECENT)
