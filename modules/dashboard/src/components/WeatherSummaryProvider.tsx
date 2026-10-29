import { useEffect, useState, type ReactNode } from 'react'
import { fetchWeatherSummary, type WeatherSummary } from '@/api/weather'
import { WeatherSummaryContext } from '@/hooks/useWeatherSummary'

// 좌측 wall과 메인 헤더가 한 응답을 공유한다. 기존과 동일하게 5분마다 갱신.
export function WeatherSummaryProvider({ children }: { children: ReactNode }) {
  const [weather, setWeather] = useState<WeatherSummary | null>(null)
  useEffect(() => {
    let cancelled = false
    let loading = false
    const load = async () => {
      if (loading) return
      loading = true
      try {
        const data = await fetchWeatherSummary()
        if (!cancelled) setWeather(data)
      } catch (error) {
        // 실패 시 오래된 특보를 현재 발효 중이라고 표시하지 않는다.
        if (!cancelled) setWeather(null)
        console.warn('[weather] fetch 실패', error)
      } finally {
        loading = false
      }
    }
    void load()
    const timer = setInterval(() => void load(), 5 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])
  return <WeatherSummaryContext.Provider value={weather}>{children}</WeatherSummaryContext.Provider>
}
