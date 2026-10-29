// CCTV 확대 창 (1600×964 — 헤더 64 + 영상 1600×900). 화면 전체를 흐리게 덮는다.
//   ESC·바깥 누름·축소 버튼으로 닫힘. 닫혀 있을 땐 플레이어를 두지 않는다 (게이트 연결이 남지 않게).
//   열고 닫는 움직임은 ExpandModal 과 같다 — 흐림은 바로, 창은 가운데에서 5%→100% (0.45초). 닫히는 동안은 영상을 남겨 둔다.
import { useEffect } from 'react'
import { cn, CollapseButton, NumberBadge, useKept, ZOOM_MS } from '@/shared/ui'
import { dash } from '../../dashboard/state'
import { Player } from './Player'

const close = () => dash.set({ modalCctv: null })

export function CctvModal() {
  const modal = dash.use((s) => s.modalCctv)
  const open = !!modal
  const c = useKept(modal, ZOOM_MS)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  if (!c) return null
  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/25 backdrop-blur-[20px]" onClick={open ? close : undefined}>
      <div
        role="dialog"
        aria-label={c.name}
        className={cn('relative flex h-[964px] w-[1600px] flex-col items-start overflow-hidden rounded-[40px] border border-white/20 bg-neutral-700 shadow-modal transition-zoom starting:scale-5', !open && 'scale-5')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mt-16">
          <Player cctvId={c.cctvId} className="h-[900px] w-[1600px]" />
        </div>
        <div className="absolute top-0 left-0 flex h-16 w-[1600px] items-center gap-2.5 border-b border-white/20 bg-neutral-800/90 px-8">
          {/* 순번 — 오른쪽 5칸에서 연 것만 (지도 팝업에서 열면 없음) */}
          {c.number > 0 && <NumberBadge number={c.number} size="large" />}
          <span className="relative top-px font-sans text-[22px] leading-none font-semibold text-white">{c.name}</span>
        </div>
        <CollapseButton onClick={close} />
      </div>
    </div>
  )
}
