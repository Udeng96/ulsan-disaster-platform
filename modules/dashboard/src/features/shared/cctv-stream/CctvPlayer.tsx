import { useEffect, useId, useRef, useState } from 'react'
import XeusGate, { type XeusPlayerInstance } from '@/vendor/xeus.player.2.2.0'
import { XEUS_DEBUG, XEUS_STREAM_URL, XEUS_USER_ID } from '@/config/xeus'
import { CCTVPlaceholderIcon } from './CCTVPlaceholderIcon'
import {
  installStreamTiming,
  STREAM_ROUTE,
  takeSocketOpenMs,
} from './streamTiming'

// 아이콘을 정중앙보다 살짝 위로 — 헤더(40)가 위쪽을 덮고 있어 정중앙이면 아래로 처져 보인다.
const ICON_LIFT = { transform: 'translateY(-8%)' } as const

// 접속 정보 로그는 첫 플레이어 1회만 (5칸 × 순환이라 매번 찍으면 노이즈).
let loggedConnectionInfo = false

// 게이트 WebSocket open 시각 계측 — 모듈 로드 시 1회 설치.
installStreamTiming()

interface CctvPlayerProps {
  /** CCTV 관리번호 (/api/cctv 의 cctvId (관리번호)). undefined 면 placeholder 만 표시. */
  cctvId: string | undefined
  /** body 영역 크기. CCTV 컴포넌트마다 다른 사이즈 (320×180, 640×360, 1600×900). */
  width: number
  height: number
  /** 높이를 부모에 맡긴다 (레이아웃이 세로 크기를 결정하는 화면). */
  fillHeight?: boolean
  /** 영상 수신 여부 변화 — 관리자 화면의 재생 확인 배지에서 쓴다. */
  onConnectedChange?: (connected: boolean) => void
}

// CCTV 영상 영역 (Xeus-Gate Player).
// - cctvId 있음 → 게이트 서버(WebSocket) 접속해 해당 CCTV 영상 렌더
// - cctvId 없음 → placeholder (할당된 CCTV 없음)
//
// background 는 기존 #002247 유지해서 시각적 일관성 보존.
export function CctvPlayer({
  cctvId,
  width,
  height,
  fillHeight,
  onConnectedChange,
}: CctvPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<XeusPlayerInstance | null>(null)
  // 인스턴스별 고유 id — 같은 CCTV 를 그리드/모달에서 동시에 띄우면 id 가 겹쳐
  // Xeus 의 getElementById 가 먼저 있는 요소에 붙어버림 (모달이 비어 보이는 원인).
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const playerId = `VIDEO_PLAYER_${cctvId ?? 'none'}_${uid}`
  // 영상 데이터 수신 여부 — false 면 placeholder 아이콘으로 덮는다.
  //   Xeus 는 접속/대기/재시도 문구를 자기 상태 div (회색 배경) 에 띄우고,
  //   첫 영상 데이터가 들어오면 그 div 를 visibility:hidden 으로 바꾼다 → 이 값을 연결 신호로 사용.
  const [connected, setConnected] = useState(false)
  // 표출 소요 시간 측정 — 플레이어 생성 시각. 첫 영상이 뜨는 순간 경과를 찍는다.
  const startedAtRef = useRef(0)

  // cctvId 기준으로만 재생성 — 같은 CCTV 면 플레이어 유지 (깜빡임 방지).
  useEffect(() => {
    // 이전 플레이어 정리
    playerRef.current?.destroy?.()
    playerRef.current = null
    setConnected(false)
    onConnectedChange?.(false)
    startedAtRef.current = performance.now()

    if (!cctvId) return

    // DOM 이 id 로 준비된 직후에 붙어야 하므로 약간의 지연.
    const timer = window.setTimeout(() => {
      if (!containerRef.current) return
      // 현장 디버깅용 — 실제로 어떤 값으로 접속하는지 1회만 남김.
      if (!loggedConnectionInfo) {
        loggedConnectionInfo = true
        console.log('[Xeus] 접속 정보', {
          url: XEUS_STREAM_URL,
          userId: XEUS_USER_ID,
          cctvMgrNo: cctvId,
        })
      }
      playerRef.current = new XeusGate.Player({
        playerId,
        url: XEUS_STREAM_URL,
        userId: XEUS_USER_ID,
        cctvMgrNo: cctvId,
        debug: XEUS_DEBUG,
      })
    }, 30)

    return () => {
      window.clearTimeout(timer)
      playerRef.current?.destroy?.()
      playerRef.current = null
    }
  }, [cctvId, playerId])

  // Xeus 상태 div 의 visibility 를 구독 — hidden 이 되는 순간이 "영상 수신 시작".
  //   상태 div 는 플레이어 생성 후 비동기로 append 되므로 잠깐 폴링해서 잡는다.
  useEffect(() => {
    if (!cctvId) return
    const root = containerRef.current
    if (!root) return
    let observer: MutationObserver | null = null
    const poll = window.setInterval(() => {
      // 상태 div — 영상(video/img) 다음에 append 되는 유일한 div.
      const statusEl = root.querySelector<HTMLElement>(':scope > div')
      if (!statusEl) return
      window.clearInterval(poll)
      const sync = () => {
        const on = statusEl.style.visibility === 'hidden'
        // 첫 영상이 뜨는 순간 1회만 — 몇 초 만에 표출됐는지 남긴다.
        if (on && startedAtRef.current) {
          const total = (performance.now() - startedAtRef.current) / 1000
          const socketMs = takeSocketOpenMs()
          const socket = socketMs === null ? '?' : (socketMs / 1000).toFixed(2)
          console.log(
            `[CCTV] ${cctvId} (${STREAM_ROUTE}) 소켓 ${socket}s / 첫프레임 ${total.toFixed(2)}s`,
          )
          startedAtRef.current = 0
        }
        setConnected(on)
        onConnectedChange?.(on)
      }
      sync()
      observer = new MutationObserver(sync)
      observer.observe(statusEl, {
        attributes: true,
        attributeFilter: ['style'],
      })
    }, 100)
    return () => {
      window.clearInterval(poll)
      observer?.disconnect()
    }
  }, [cctvId, playerId])

  const body = {
    width: `${width}px`,
    height: fillHeight ? '100%' : `${height}px`,
    // 셀과 같은 타이밍 (높이 먼저, 폭은 0.7s 뒤).
    transition:
      'height 0.5s cubic-bezier(0.33, 1, 0.68, 1), width 0.45s cubic-bezier(0.33, 1, 0.68, 1) var(--map-shift-delay, 0s)',
    background: '#002247',
    // Xeus 가 만드는 상태 텍스트/영상 요소가 position:absolute 라, 여기서 기준(containing block)을
    // 잡아줘야 플레이어 영역 안에만 그려짐 (없으면 relative 인 셀 전체로 퍼짐).
    position: 'relative',
    overflow: 'hidden',
    // 내부 z-index(placeholder 오버레이 1)를 이 박스 안에 가둔다.
    //   없으면 셀 stacking context 로 새어나가 확대 버튼(z auto)을 덮어버린다.
    isolation: 'isolate',
  } as const

  if (!cctvId) {
    return (
      <div className="flex items-center justify-center" style={body}>
        <div style={ICON_LIFT}>
          <CCTVPlaceholderIcon />
        </div>
      </div>
    )
  }

  // Xeus 가 만든 DOM (영상 + 상태 텍스트) 은 안쪽 div 가 소유 — React 는 바깥 div 만 관리.
  //   연결 전에는 placeholder 아이콘 오버레이가 Xeus 의 회색 상태 화면·문구를 가린다.
  return (
    <div style={body}>
      <div
        id={playerId}
        ref={containerRef}
        style={{ position: 'absolute', inset: 0 }}
      />
      {!connected && (
        <div
          className="flex items-center justify-center"
          style={{
            position: 'absolute',
            inset: 0,
            background: '#002247',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          <div style={ICON_LIFT}>
            <CCTVPlaceholderIcon />
          </div>
        </div>
      )}
    </div>
  )
}
