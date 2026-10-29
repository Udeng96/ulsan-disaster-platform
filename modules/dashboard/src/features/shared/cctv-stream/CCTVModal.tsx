import { useEffect, useState } from 'react'
import { NumberBadge } from './NumberBadge'
import { CollapseButton } from './CollapseButton'
import { CctvPlayer } from './CctvPlayer'

// CCTV 확장 modal
// backdrop: fixed inset 0, bg rgba(0, 0, 0, 0.25)
// modal 외곽: W 1600 × H 900, col, items-start, aspect 16/9
// body: W 1600 × H 900 (영상)
// header: absolute top 0 left 0, W 1600 × H 64, padding 0 32, gap 10, items-center
//   number badge (large, 24×24) + CCTV 이름 (B1 22/600/26 white)
// collapse button: 48×48, absolute bottom 36 right 36 (모달 close)
interface CCTVModalProps {
  isOpen: boolean
  onClose: () => void
  number: number
  name: string
  /** CCTV 관리번호 (cctvId). 모달에서도 동일 Xeus 플레이어 사용. */
  cctvId?: string
}

const DUR_MS = 450
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'

export function CCTVModal({
  isOpen,
  onClose,
  number,
  name,
  cctvId,
}: CCTVModalProps) {
  // 맥OS minimize/restore — 모달 scale-from-origin 만, fade 없음.
  // backdrop 도 fade 안 함. isOpen 변경 시:
  //   true: backdrop 즉시 visible, 모달 scale up (450ms)
  //   false: 모달 scale down (450ms) → 끝나면 backdrop 도 hidden
  // showBackdrop state 로 backdrop visibility 지연 unmount (모달 scale 끝나기 전엔 backdrop 유지).
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
      className="fixed inset-0 flex items-center justify-center"
      style={{
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        // fade 없음 — visibility 로 즉시 보임/숨김. showBackdrop 이 false 면 hidden (모달 scale 끝난 후).
        visibility: showBackdrop ? 'visible' : 'hidden',
        pointerEvents: isOpen ? 'auto' : 'none',
        zIndex: 4000,
      }}
      onClick={onClose}
    >
      {/* modal box — 1600×964 (헤더 64 + 영상 1600×900 = 16/9), radius 40, border + shadow.
          맥OS minimize/restore 식 — center origin 에서 scale(0.05) → scale(1) 펼침,
          닫힘 시 역방향. opacity 변경 없음 (no fade). */}
      <div
        className="relative flex flex-col items-start overflow-hidden"
        style={{
          width: '1600px',
          height: '964px',
          borderRadius: '40px',
          border: '1px solid rgba(255, 255, 255, 0.20)',
          boxShadow:
            '0 12px 48px 0 rgba(0, 0, 0, 0.24), 0 0 40px 0 rgba(0, 0, 0, 0.08)',
          transform: isOpen ? 'scale(1)' : 'scale(0.05)',
          transformOrigin: 'center',
          transition: boxTween,
          willChange: 'transform',
          background: '#002247',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* body — 헤더(64) 아래 영상 영역 (W 1600 × H 900 = 16:9).
            열려 있을 때만 mount — 닫힌 모달에 플레이어를 두면 게이트 연결이 계속 유지되고,
            Xeus 가 상태 텍스트에 visibility:visible 을 직접 걸어 숨김이 안 먹는다
            (축소된 모달의 검은 사각형이 화면 중앙에 보이는 문제). */}
        <div style={{ marginTop: '64px' }}>
          {showBackdrop && (
            <CctvPlayer
              cctvId={cctvId}
              width={1600}
              height={900}
            />
          )}
        </div>

        {/* header — absolute top 0 left 0, body 위 overlay, border-bottom + bg */}
        <div
          className="absolute left-0 top-0 flex items-center"
          style={{
            width: '1600px',
            height: '64px',
            padding: '0 32px',
            gap: '10px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.20)',
            background: 'rgba(0, 26, 56, 0.90)',
          }}
        >
          {/* 순번 배지 — 우 패널 5칸에서 연 경우만. 지도 팝업에서 열면 순번이 없어 숨긴다. */}
          {number > 0 && <NumberBadge number={number} size="large" />}
          {/* CCTV 이름 — B1 (22/600/26) white */}
          <span
            style={{
              color: '#FFF',
              fontFamily: 'Roboto',
              fontSize: '22px',
              fontWeight: 600,
              lineHeight: 1,
              // 한글 잉크 중심이 글자 상자 중심보다 위에 있어 헤더 중앙에서 0.76px 떠 보인다.
              //   그리드 셀 헤더와 같은 방식으로 1px 내려 보정.
              position: 'relative',
              top: '1px',
            }}
          >
            {name}
          </span>
        </div>

        {/* collapse button — 48×48, absolute bottom 36 right 36 */}
        <CollapseButton onClick={onClose} />
      </div>
    </div>
  )
}
