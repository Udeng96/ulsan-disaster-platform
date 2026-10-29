// 하천시설물 외부 사이트 — DashboardPage 위에 1920×1080 전체 화면 오버레이.
// 운영자가 받은 URL 로 const 한 줄만 교체하면 됨.
// 닫기 방법:
//   1) 우상단 ✕ 버튼 클릭
//   2) ESC 키 (iframe 에 포커스 없을 때) — cross-origin iframe focus 상태에선 동작 안 함.
//      그 경우엔 마우스로 우상단 ✕ 클릭하면 됨.

import { useEffect, useState } from 'react'

// 하천시설물 사이트.
//   운영 : nginx 전용 포트(192.0.2.179:8099) — prefix 없이 루트로 중계.
//   dev  : vite proxy (/south-ulsan).
//   ⚠️ prefix 경유(/south-ulsan)는 그 사이트 HTML 의 절대경로(/js, /css)가 우리 origin 으로
//      요청돼 404 가 난다. 그래서 운영은 전용 포트를 쓴다.
//      주소가 바뀌면 .env 의 VITE_RIVER_FACILITY_URL 로 덮어쓴다.
//      nginx 설정: dep/202609/nginx/river-facility.{internal,dmz}.conf
//
// PATH 는 iframe 진입 시 띄울 SPA 내 페이지 (예: '/raining', '/rainfall' 등).
// 빈 문자열 → root (/) 진입. 메인 메뉴에서 사용자가 우천시/평상시/유지보수/방재/배수/경관/편의 선택.
const RIVER_FACILITY_PATH = ''
//   운영 기본값 — nginx(192.0.2.179) 의 전용 포트. prefix 가 없어야 그 사이트의
//   절대경로 정적파일(/js, /css)이 살아난다. dev 는 vite proxy(/south-ulsan) 사용.
const RIVER_FACILITY_BASE =
  import.meta.env.VITE_RIVER_FACILITY_URL ??
  (import.meta.env.PROD ? 'http://192.0.2.179:8099' : '/south-ulsan')
const RIVER_FACILITY_URL = `${RIVER_FACILITY_BASE.replace(/\/$/, '')}${RIVER_FACILITY_PATH}`

interface Props {
  onClose: () => void
}

const TRANSITION_MS = 450
// 맥OS minimize 같은 곡선 — 시작 fast → 끝 천천히. transform-origin 에서 시작/수렴.
const TRANSITION_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)'
// transform-origin — 화면 하단 (상태표시줄 위치) 에서 펼쳐지는 효과.
// 맥OS dock 에서 앱 실행되는 느낌. 수평 중앙 + 수직 100% (1080 의 맨 아래).
const ORIGIN_X = '50%'
const ORIGIN_Y = '100%'

export function RiverFacilityOverlay({ onClose }: Props) {
  // Enter / Exit 애니메이션 상태:
  //   entered=false (초기): translateY(-100%) (화면 위)
  //   entered=true: translateY(0) (정위치)
  //   다시 false 로 토글 → 슬라이드 아웃, transition 끝나면 parent 의 onClose 호출 → unmount.
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // 닫기 트리거 — 슬라이드 아웃 → transition 완료 후 unmount.
  // entered 가 이미 false 면 중복 호출 무시 (double click 방어).
  const triggerClose = () => {
    if (!entered) return
    setEntered(false)
    window.setTimeout(() => onClose(), TRANSITION_MS)
  }

  // ESC 키 → triggerClose (슬라이드 아웃 후 닫힘). iframe focus 시 cross-origin 한계 동일.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        triggerClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    window.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('keydown', handleKey)
    }
    // triggerClose 는 entered + onClose 만 의존 — entered 변화 시 listener 재등록 OK.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered, onClose])
  return (
    <div
      className="absolute"
      style={{
        top: 0,
        left: 0,
        width: '1920px',
        height: '1080px',
        background: '#001A38',
        zIndex: 10000,
        // 맥OS minimize 효과 — transform-origin 점에서 펼쳐지고 다시 그 점으로 수축.
        // 마운트 시 scale(0.05) (메뉴 버튼 크기 정도) → scale(1) (전체 화면).
        // 닫을 때 역방향 → 메뉴 위치로 빨려들어감.
        transform: entered ? 'scale(1)' : 'scale(0.05)',
        transformOrigin: `${ORIGIN_X} ${ORIGIN_Y}`,
        transition: `transform ${TRANSITION_MS}ms ${TRANSITION_EASING}`,
        willChange: 'transform',
      }}
    >
      {RIVER_FACILITY_URL ? (
        <iframe
          src={RIVER_FACILITY_URL}
          title="하천시설물"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      ) : (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-3"
        >
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontFamily: 'Roboto, system-ui, sans-serif',
              fontSize: '28px',
              fontWeight: 500,
            }}
          >
            하천시설물 사이트
          </span>
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}
          >
            RIVER_FACILITY_URL 미설정
          </span>
        </div>
      )}
      {/* 닫기 버튼 — 우상단 코너, 56×56 원형, 글래스 효과 */}
      <button
        type="button"
        onClick={triggerClose}
        aria-label="닫기"
        className="absolute"
        style={{
          top: '24px',
          right: '220px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.5)',
          border: '2px solid rgba(255, 255, 255, 0.35)',
          color: '#FFF',
          fontSize: '20px',
          fontWeight: 600,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ✕
      </button>
    </div>
  )
}
