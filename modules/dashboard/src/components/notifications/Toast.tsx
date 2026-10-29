import { useEffect, useState } from 'react'

// 간단한 fade in/out toast — props 으로 받은 message 가 바뀌면 표출 + auto dismiss.
// 위치는 부모 컨테이너 기준 fixed (스케일 프레임 안에서도 동작).
interface ToastProps {
  message: string | null
  /** ms — 표출 후 자동 사라지는 시간 (default 2500) */
  duration?: number
  onDismiss?: () => void
}

export function Toast({ message, duration = 2500, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) {
      setVisible(false)
      return
    }
    setVisible(true)
    const t = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, duration)
    return () => clearTimeout(t)
  }, [message, duration, onDismiss])

  // 항상 mount, opacity transition 으로 페이드
  return (
    <div
      style={{
        // 재난 예·경보 토스트와 같은 규격 (상단 중앙 고정, 빨강).
        position: 'fixed',
        top: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 20px',
        borderRadius: '10px',
        background: '#FF4245',
        color: '#FFF',
        fontFamily: 'Roboto',
        fontSize: '15px',
        fontWeight: 500,
        // 여러 줄일 때 문단 간격 — 한 줄이면 영향 없다.
        lineHeight: '1.5',
        // 줄바꿈(\n) 이 있으면 여러 줄로 — 없으면 기존처럼 한 줄.
        whiteSpace: 'pre-line',
        textAlign: 'center',
        opacity: visible ? 1 : 0,
        pointerEvents: 'none',
        transition: 'opacity 0.2s ease',
        zIndex: 6000,
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
      }}
    >
      {message ?? ''}
    </div>
  )
}
