import { createContext, useContext } from 'react'
import type { WeatherSummary } from '@/api/weather'

export const WeatherSummaryContext = createContext<WeatherSummary | null>(null)

export function useWeatherSummary() {
  return useContext(WeatherSummaryContext)
}
