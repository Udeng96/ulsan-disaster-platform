// CCTV 영상 (Xeus 게이트 플레이어). cctvId 가 없거나 첫 영상이 오기 전엔 카메라 아이콘.
//   플레이어는 cctvId 가 바뀔 때만 새로 만든다 (같은 CCTV 면 그대로 — 깜빡이지 않게).
import { useEffect, useId, useRef, useState } from 'react'
import { XEUS_DEBUG, XEUS_STREAM_URL, XEUS_USER_ID } from '@/config/xeus'
import { CCTVPlaceholderIcon } from '@/features/shared/cctv-stream/CCTVPlaceholderIcon'
import { installStreamTiming, STREAM_ROUTE, takeSocketOpenMs } from '@/features/shared/cctv-stream/streamTiming'
import XeusGate, { type XeusPlayerInstance } from '@/vendor/xeus.player.2.2.0'

// 접속 정보는 첫 플레이어 1번만 남긴다 (5칸 × 순환이라)
let logged = false
installStreamTiming()

// 헤더가 위를 덮고 있어 정가운데면 처져 보인다 — 조금 위로
function Placeholder({ cover }: { cover?: boolean }) {
  return (
    <div className={cover ? 'pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-neutral-700' : 'flex size-full items-center justify-center'}>
      <div className="-translate-y-[8%]">
        <CCTVPlaceholderIcon />
      </div>
    </div>
  )
}

export function Player({ cctvId, className }: { cctvId: string | undefined; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  // 같은 CCTV 를 칸과 확대 창에 같이 띄워도 id 가 겹치지 않게
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const playerId = `VIDEO_PLAYER_${cctvId ?? 'none'}_${uid}`
  // 연결 여부는 지금 플레이어 것만 (CCTV 가 바뀌면 다시 '연결 전')
  const [live, setLive] = useState<string | null>(null)
  const connected = live === playerId

  useEffect(() => {
    if (!cctvId) return
    const startedAt = performance.now()
    let player: XeusPlayerInstance | null = null
    let observer: MutationObserver | null = null
    // 요소가 id 로 자리 잡은 다음에 붙인다
    const timer = window.setTimeout(() => {
      if (!box.current) return
      if (!logged) {
        logged = true
        console.log('[Xeus] 접속 정보', { url: XEUS_STREAM_URL, userId: XEUS_USER_ID, cctvMgrNo: cctvId })
      }
      player = new XeusGate.Player({ playerId, url: XEUS_STREAM_URL, userId: XEUS_USER_ID, cctvMgrNo: cctvId, debug: XEUS_DEBUG })
    }, 30)
    // Xeus 는 상태 글 div 를 나중에 붙이고, 첫 영상이 오면 그 div 를 숨긴다 → 그때가 '연결됨'
    let first = true
    const poll = window.setInterval(() => {
      const status = box.current?.querySelector<HTMLElement>(':scope > div')
      if (!status) return
      window.clearInterval(poll)
      const sync = () => {
        const on = status.style.visibility === 'hidden'
        if (on && first) {
          first = false
          const socket = takeSocketOpenMs()
          console.log(`[CCTV] ${cctvId} (${STREAM_ROUTE}) 소켓 ${socket === null ? '?' : (socket / 1000).toFixed(2)}s / 첫프레임 ${((performance.now() - startedAt) / 1000).toFixed(2)}s`)
        }
        setLive(on ? playerId : null)
      }
      sync()
      observer = new MutationObserver(sync)
      observer.observe(status, { attributes: true, attributeFilter: ['style'] })
    }, 100)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(poll)
      observer?.disconnect()
      player?.destroy?.()
    }
  }, [cctvId, playerId])

  // Xeus 가 만든 영상·상태 글은 position:absolute — 이 상자 안에 가둔다 (isolate: 덮개가 확대 버튼을 덮지 않게)
  return (
    <div className={`relative isolate overflow-hidden bg-neutral-700 ${className ?? ''}`}>
      {cctvId ? (
        <>
          <div id={playerId} ref={box} className="absolute inset-0" />
          {!connected && <Placeholder cover />}
        </>
      ) : (
        <Placeholder />
      )}
    </div>
  )
}
