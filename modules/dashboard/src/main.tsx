import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { WeatherSummaryProvider } from './components/WeatherSummaryProvider'
import { registerDiagnostics } from './utils/diagnostics'
import './index.css'

// 망 분리 현장에서 콘솔로 자가 진단 (__diag / __xeusCheck).
registerDiagnostics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WeatherSummaryProvider>
      <RouterProvider router={router} />
    </WeatherSummaryProvider>
  </StrictMode>,
)
