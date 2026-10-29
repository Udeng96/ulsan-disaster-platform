/** 표시 단위는 헤더에서 안내한다. 작은 트래픽을 0으로 오해하지 않도록 구분한다. */
export function formatTrafficMbps(bps: number | null | undefined): string {
  if (bps == null || !Number.isFinite(bps)) return '-'
  const value = bps / 1_000_000
  if (value > 0 && value < 0.01) return '<0.01'
  return String(Number(value.toFixed(value >= 10 ? 0 : 2)))
}
