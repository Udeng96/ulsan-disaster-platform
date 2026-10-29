/** className 합치기 — 거짓값은 건너뛴다. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
