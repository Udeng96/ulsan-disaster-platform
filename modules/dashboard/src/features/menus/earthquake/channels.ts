// 지진가속도 4 채널 정의 + 차트 공통 상수/헬퍼.

// x축 고정 시간창 — 데이터 범위를 따라가면 점이 들어올 때마다 축이 늘었다 줄어든다.
export const WINDOW_MS = 60_000 // 최근 60초
// y축 최소 상한 (gal) — 평상시 0.01~0.05 수준이라 이보다 작으면 이 값으로 고정,
//   지진 시에는 관측 최대에 맞춰 자동으로 늘어난다 (1000배 차이 대응).
export const VMIN_TOP = 0.06

// HH:MM:SS 포맷
export function fmtTime(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

// 지진계측기 4 채널 — 센서 코드 + 설치 위치.
export const CHANNELS: ReadonlyArray<{ code: string; location: string }> = [
  { code: 'US_NGG', location: '가상시설0683(3축)' },
  { code: '가상시설0204', location: '가상시설0714(Y,X)' },
  { code: '가상시설0205', location: '가상시설0714(Y)' },
  { code: '가상시설0203', location: '가상시설0715(3축)' },
]
