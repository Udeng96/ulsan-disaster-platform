import { createContext, useContext } from 'react'
import type { WeatherSummary } from './left/api'

export const WeatherContext = createContext<WeatherSummary | null>(null)
/** 날씨 요약 (WeatherProvider 아래에서) — 없거나 실패면 null */
export const useWeather = () => useContext(WeatherContext)
