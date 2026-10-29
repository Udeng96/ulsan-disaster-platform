// 모달 틀 — 화면 전체를 어둡게 덮고 가운데 상자. 상자 크기는 className 으로 (폭 408·440 등).
//   ScaledFrame 안에서 fixed 라 축소 배율을 같이 따른다.
//   ESC 로 닫힘. 바깥(어두운 곳) 클릭은 닫지 않는다 (입력 중 실수로 닫히지 않게 — 옛 화면과 같음).
import { useEffect, type ReactNode } from 'react'
import { CloseButton } from './CloseButton'
import { cn } from './cn'

interface DialogProps {
  open: boolean
  onClose: () => void
  /** 상자 className — 폭·높이 */
  className?: string
  /** 접근성용 이름 (보통 제목과 같게) */
  label: string
  children: ReactNode
}

export function Dialog({ open, onClose, className, label, children }: DialogProps) {
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

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50">
      <div role="dialog" aria-modal aria-label={label} className={cn('flex flex-col items-start rounded-2xl border border-neutral-450 bg-neutral-700', className)}>
        {children}
      </div>
    </div>
  )
}

/** 제목 줄 — confirm(작은 확인창, Roboto 18) / form(로그인 등, Do Hyeon 24). */
export function DialogHeader({ title, onClose, size = 'confirm' }: { title: string; onClose: () => void; size?: 'confirm' | 'form' }) {
  const form = size === 'form'
  return (
    <div className={cn('flex items-center self-stretch', form ? 'gap-2 pt-5 pr-4 pb-4 pl-6' : 'gap-4 px-6 py-3.5')}>
      <span className={cn('flex-[1_0_0] leading-none text-white', form ? 'font-headline text-[24px] font-normal' : 'font-sans text-[18px] font-medium')}>
        {title}
      </span>
      <CloseButton onClick={onClose} className={form ? 'size-[30px]' : undefined} />
    </div>
  )
}

/** 아래 버튼 줄 — 오른쪽 정렬. */
export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-2 self-stretch px-6 py-3.5">{children}</div>
}
