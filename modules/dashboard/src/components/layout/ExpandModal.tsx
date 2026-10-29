// 범용 확장 모달 — 카드 콘텐츠를 전체화면 크기로 띄움 (CCTVModal 패턴 차용).
//   backdrop (blur) + 중앙 scale 애니메이션 (맥OS minimize/restore 식) + 헤더(title) + 닫기.
//   사용처: 좌측 패널 위성지도 / 재난방송 확장.

import { useEffect, useState, type ReactNode } from 'react'
import { CollapseButton } from '@/features/shared/cctv-stream/CollapseButton'

const DUR_MS = 450
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'

interface Props {
  isOpen: boolean
  onClose: () => void
  title: string
  /** 모달 박스 크기 (콘텐츠 비율에 맞춰 부모가 지정). default 1280×720 (16:9). */
  width?: number
  height?: number
  /** backdrop/모달 표출 영역 — wall 가운데 메인 화면 (left/right 패널 침범 방지).
   *  ScaledFrame transform 기준 좌표. default: 메인 (left 480, 1920×1080). */
  areaLeft?: number
  areaWidth?: number
  areaHeight?: number
  children?: ReactNode
}

export function ExpandModal({
  isOpen,
  onClose,
  title,
  width = 1280,
  height = 720,
  areaLeft = 480,
  areaWidth = 1920,
  areaHeight = 1080,
  children,
}: Props) {
  // backdrop visibility 지연 unmount — 모달 scale 끝나기 전엔 backdrop 유지.
  const [showBackdrop, setShowBackdrop] = useState(isOpen)
  useEffect(() => {
    if (isOpen) {
      setShowBackdrop(true)
    } else {
      const id = window.setTimeout(() => setShowBackdrop(false), DUR_MS)
      return () => window.clearTimeout(id)
    }
  }, [isOpen])

  // ESC 키 → 닫기. 열려있을 때만 리스너 등록.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const boxTween = `transform ${DUR_MS}ms ${EASE}`

  return (
    <div
      className="fixed flex items-center justify-center"
      // backdrop — wall 가운데 메인 영역만 덮음 (left/right 패널 침범 방지).
      style={{
        left: `${areaLeft}px`,
        top: 0,
        width: `${areaWidth}px`,
        height: `${areaHeight}px`,
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        visibility: showBackdrop ? 'visible' : 'hidden',
        pointerEvents: isOpen ? 'auto' : 'none',
        zIndex: 4000,
      }}
      onClick={onClose}
    >
      {/* modal box — center origin scale(0.05)→scale(1) 펼침, 닫힘 역방향 (no fade). */}
      <div
        className="relative flex flex-col items-stretch overflow-hidden"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: '40px',
          border: '1px solid rgba(255, 255, 255, 0.20)',
          boxShadow:
            '0 12px 48px 0 rgba(0, 0, 0, 0.24), 0 0 40px 0 rgba(0, 0, 0, 0.08)',
          background: '#001A38',
          transform: isOpen ? 'scale(1)' : 'scale(0.05)',
          transformOrigin: 'center',
          transition: boxTween,
          willChange: 'transform',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header — 상단 flow (불투명 bg). 콘텐츠가 헤더 아래 body 에 들어가도록 overlay 아님. */}
        <div
          className="flex shrink-0 items-center"
          style={{
            height: '64px',
            padding: '0 32px',
            gap: '10px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.20)',
            background: '#002247',
          }}
        >
          <span
            style={{
              color: '#FFF',
              fontFamily: 'Roboto',
              fontSize: '22px',
              fontWeight: 600,
              lineHeight: '26px',
            }}
          >
            {title}
          </span>
        </div>

        {/* body — 헤더 아래 나머지 영역, 콘텐츠가 여기에 맞춰 들어감 */}
        <div className="relative w-full" style={{ flex: '1 1 0', minHeight: 0 }}>
          {children}
        </div>

        {/* collapse button — 48×48, absolute bottom 36 right 36 */}
        <CollapseButton onClick={onClose} />
      </div>
    </div>
  )
}
