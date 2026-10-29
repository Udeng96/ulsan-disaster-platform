// 확인창 — 408×234, 제목 + 메시지 + [취소][확인]. 재난 예·경보 초기화·삭제·취소 확인에 쓰던 모양.
//   메시지에 줄바꿈(\n)이 있으면 줄 간격 1.5 (옛 송출 취소 확인과 같게).
import { Button, type ButtonVariant } from './Button'
import { cn } from './cn'
import { Dialog, DialogFooter, DialogHeader } from './Dialog'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  confirmVariant?: ButtonVariant
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel, confirmVariant = 'danger', onConfirm, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} label={title} className="h-[234px] w-[408px]">
      <DialogHeader title={title} onClose={onClose} />
      <div className="flex min-h-0 flex-[1_0_0] flex-col items-start justify-center gap-2.5 self-stretch p-6">
        <span className={cn('font-sans text-[15px] font-normal text-neutral-100', message.includes('\n') ? 'leading-normal whitespace-pre-line' : 'leading-none')}>{message}</span>
      </div>
      <DialogFooter>
        <Button variant="cancel" onClick={onClose}>
          취소
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
