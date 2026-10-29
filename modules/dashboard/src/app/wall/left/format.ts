// 날씨 카드 표시용 — 코드·각도·등급 → 한글, 실황 → 표시 문자열.

import type { WeatherObservation, WeatherWarning } from './api'

// ── 하늘 상태 코드 → 라벨 매핑 ──────────────────────────────
//   skyCode (예보): 1=맑음 3=구름많음 4=흐림
//   ptyCode (실황/예보): 0=없음 1=비 2=비/눈 3=눈 5=빗방울 6=빗방울/눈 7=눈날림
// ptyCode 우선 (강수 있으면 강수 표시), 없으면 sky 표시.
export function skyLabel(
  skyCode: number | null,
  ptyCode: number | null,
): string {
  if (ptyCode != null && ptyCode > 0) {
    switch (ptyCode) {
      case 1:
        return '비'
      case 2:
        return '비/눈'
      case 3:
        return '눈'
      case 5:
        return '빗방울'
      case 6:
        return '빗방울/눈'
      case 7:
        return '눈날림'
      default:
        return ''
    }
  }
  switch (skyCode) {
    case 1:
      return '맑음'
    case 3:
      return '구름많음'
    case 4:
      return '흐림'
    default:
      return '-'
  }
}

// 풍향 각도 (0-360°) → 16 방위 한글 라벨.
export function windDirLabel(deg: number | null): string {
  if (deg == null) return '-'
  const dirs = [
    '북',
    '북북동',
    '북동',
    '동북동',
    '동',
    '동남동',
    '남동',
    '남남동',
    '남',
    '남남서',
    '남서',
    '서남서',
    '서',
    '서북서',
    '북서',
    '북북서',
  ]
  const idx = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16
  return dirs[idx]
}

// 미세먼지 등급 (1좋 / 2보통 / 3나쁨 / 4매우나쁨) → 라벨.
export function gradeLabel(g: number | null): string {
  switch (g) {
    case 1:
      return '좋음'
    case 2:
      return '보통'
    case 3:
      return '나쁨'
    case 4:
      return '매우나쁨'
    default:
      return '-'
  }
}

// ── 실황 객체 → 표시용 문자열 — 데이터 없으면 '-' fallback ──

export function formatTempHum(o: WeatherObservation | null): string {
  if (!o) return '-'
  const t = o.temperatureC != null ? `${o.temperatureC.toFixed(1)}°` : '-'
  const h = o.humidityPct != null ? `${Math.round(o.humidityPct)}%` : '-'
  return `${t} | ${h}`
}

export function formatWind(o: WeatherObservation | null): string {
  if (!o) return '-'
  const d = windDirLabel(o.windDirectionDeg)
  const s = o.windSpeedMs != null ? `${o.windSpeedMs.toFixed(1)} m/s` : '-'
  return `${d} | ${s}`
}

export function formatRainfall(o: WeatherObservation | null): string {
  if (!o || o.rainfallMm == null) return '0mm'
  return `${o.rainfallMm.toFixed(1)}mm`
}

// 기상특보 → "YYYY.MM.DD HH:MM 본문" 을 발효 중인 것 모두 이어서 (사용자 10-23 '모두 이어서').
//   본문이 없으면 "제목 발령". 하나도 없으면 "발령된 특보 없음".
export function formatWarnings(ws: readonly WeatherWarning[]): string {
  if (ws.length === 0) return '발령된 특보 없음'
  return ws
    .map((w) => {
      const d = new Date(w.tmFc)
      const ts = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      return `${ts} ${w.content?.trim() || `${w.title} 발령`}`
    })
    .join('   /   ')
}

/** 머리 줄 특보 — 발효 중인 특보 종류만 겹치지 않게 (예: "강풍주의보, 풍랑주의보") */
export const warningKinds = (ws: readonly WeatherWarning[]) => [...new Set(ws.map((w) => w.kind))].join(', ')
