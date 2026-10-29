// 시설물 / 패널 공통 상태 타입 — 4 단계.
//   normal   정상 — 초록
//   warning  주의 — 노랑
//   caution  경계 — 주황
//   critical 심각 — 빨강
//
// 사용처:
//   - 급경사지 area / cell (SlopeStatus 별칭)
//   - 우측 패널 mini column (배수펌프장 / 육갑문 / 지진가속도)
//   - 지도 라벨 배경 등
//
// 3 단계 시스템 (정상 / 주의 / 심각) 만 쓰는 경우: 'normal' / 'caution' / 'critical' 사용.
export type Status = 'normal' | 'warning' | 'caution' | 'critical'

export const STATUS_TEXT: Record<Status, string> = {
  normal: '정상',
  warning: '주의',
  caution: '경계',
  critical: '심각',
}
