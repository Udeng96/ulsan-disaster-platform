// 날씨 요약 — 좌측 날씨 카드와 메인 헤더 특보가 한 응답을 같이 쓴다 (5분마다).
//   실패하면 비운다 — 오래된 특보를 지금 발효 중인 것처럼 보이지 않게 (옛 화면과 같음).
import type { ReactNode } from 'react'
import { fetchWeatherSummary } from './left/api'
import { usePolling } from '@/shared/hooks'
import { WeatherContext } from './weatherContext'

export function WeatherProvider({ children }: { children: ReactNode }) {
  const { data, error } = usePolling((s) => fetchWeatherSummary(s), { intervalMs: 5 * 60_000 })
  return <WeatherContext.Provider value={error ? null : (data ?? null)}>{children}</WeatherContext.Provider>
}
