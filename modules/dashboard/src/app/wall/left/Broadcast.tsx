// 재난 방송 — 로컬 영상(YTN '극한 호우') 반복 재생. 항상 음소거 (자동재생 정책, 카드·모달 소리 겹침 방지).
import { memo, useEffect, useRef } from 'react'

export const Broadcast = memo(function Broadcast() {
  const v = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = v.current
    if (!el) return
    el.muted = true
    el.play().catch((e) => console.warn('[재난방송] 자동재생 거부', e))
  }, [])
  return (
    <div className="relative size-full bg-black">
      <video ref={v} src="/videos/disaster-broadcast.webm" autoPlay loop muted playsInline className="block size-full object-cover" />
    </div>
  )
})
