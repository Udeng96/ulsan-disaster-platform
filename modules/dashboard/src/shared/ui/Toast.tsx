// 토스트 — 화면 위 가운데 알림. message 가 바뀌면 나타났다가 duration 뒤 사라진다.
//   항상 그려 두고 opacity 로만 페이드 (자리 이동 없음).
//   tone: notice(빨강, 여러 줄) / success·error(재난 예·경보 권한·송출 — 초록·빨강, 한 줄 굵게)
import { memo, useEffect, useState } from 'react'
import { cn } from './cn'

interface Props {
  message: string | null
  duration?: number
  onDismiss?: () => void
  tone?: 'notice' | 'success' | 'error'
}

const TONE = {
  notice: 'bg-accent-red font-medium leading-normal whitespace-pre-line',
  success: 'bg-toast-success font-semibold leading-none whitespace-nowrap',
  error: 'bg-accent-red font-semibold leading-none whitespace-nowrap',
}

export const Toast = memo(function Toast({ message, duration = 2500, onDismiss, tone = 'notice' }: Props) {
  const [shown, setShown] = useState<string | null>(null)

  useEffect(() => {
    if (!message) return
    setShown(message)
    const t = setTimeout(() => {
      setShown(null)
      onDismiss?.()
    }, duration)
    return () => clearTimeout(t)
  }, [message, duration, onDismiss])

  const visible = !!message && shown === message
  return (
    <div
      role="status"
      aria-hidden={!visible}
      className={cn(
        'pointer-events-none fixed top-8 left-1/2 z-[6000] -translate-x-1/2 rounded-[10px] px-5 py-3 text-center font-sans text-[15px] text-white shadow-toast transition-opacity duration-200 ease-in-out',
        TONE[tone],
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      {message ?? ''}
    </div>
  )
})
