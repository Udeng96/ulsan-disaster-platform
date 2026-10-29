// 재난방송 비디오 — LeftPanel 의 "재난 방송" 섹션 + 확장 모달에 표출.
// 로컬 .webm 파일 (YTN '극한 호우' 클립) — autoplay + loop.
//
// 항상 음소거 재생 — 브라우저 autoplay 정책상 user gesture 없이 소리 있는 자동재생은 차단되고,
// 작은 영상 ↔ 모달 영상이 동시에 소리를 내면 겹치기 때문.

import { useEffect, useRef } from 'react'

const VIDEO_SRC = '/videos/disaster-broadcast.webm'

export function DisasterBroadcast() {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // 최초 autoplay 시도 (muted 라 정책상 허용).
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.play().catch((err) => {
      console.warn('[DisasterBroadcast] autoplay 거부됨:', err)
    })
  }, [])

  return (
    <div className="relative h-full w-full" style={{ background: '#000' }}>
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        autoPlay
        loop
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </div>
  )
}
