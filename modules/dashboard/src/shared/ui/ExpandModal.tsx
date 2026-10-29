// 확대 모달 — 카드(위성 지도·재난 방송·CCTV)를 크게 띄운다. 가운데 메인 화면(1920)만 흐리게 덮는다.
//   ESC·바깥 클릭·축소 버튼으로 닫힘.
//   열 때 뒤가 바로 흐려지고 창이 가운데에서 5% 크기로 시작해 커진다. 닫을 때는 작아진 뒤 흐림이 사라진다 (옛 화면 0.45초).
//   창 크기(scale)만 바꾸고 흐림은 움직이는 동안 그대로 둔다 — 흐림을 서서히 바꾸면 매 순간 화면 전체를 다시 흐리게 계산한다.
//   닫히는 동안 내용을 남기려면 부모도 useKept 로 마지막 내용을 붙잡아 둔다.
import { useEffect, type ReactNode } from 'react'
import { cn } from './cn'
import { CollapseButton } from './CollapseButton'
import { useKept, ZOOM_MS } from './useKept'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  width?: number
  height?: number
  /** 덮을 영역 — ScaledFrame 기준 좌표. 기본: wall 가운데 (left 480, 1920×1080) */
  areaLeft?: number
  areaWidth?: number
  areaHeight?: number
  children?: ReactNode
}

export function ExpandModal({ open, onClose, title, width = 1280, height = 720, areaLeft = 480, areaWidth = 1920, areaHeight = 1080, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const shown = useKept(open || null, ZOOM_MS)
  if (!shown) return null
  return (
    <div
      className="fixed top-0 z-[4000] flex items-center justify-center bg-black/25 backdrop-blur-[20px]"
      style={{ left: areaLeft, width: areaWidth, height: areaHeight }}
      onClick={open ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className={cn('relative flex flex-col items-stretch overflow-hidden rounded-[40px] border border-modal-line bg-neutral-800 shadow-modal transition-zoom starting:scale-5', !open && 'scale-5')}
        style={{ width, height }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-modal-line bg-neutral-700 px-8">
          <span className="font-sans text-[22px] leading-[26px] font-semibold text-white">{title}</span>
        </div>
        <div className="relative min-h-0 w-full flex-[1_1_0]">{children}</div>
        <CollapseButton onClick={onClose} />
      </div>
    </div>
  )
}
