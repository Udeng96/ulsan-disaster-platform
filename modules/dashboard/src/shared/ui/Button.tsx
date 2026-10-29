// 버튼 — 모달 하단 버튼 규격 (120×40, radius 8, Roboto 14/500).
//   cancel : 반투명 흰 테두리 (취소)
//   danger : 빨강 (초기화·삭제)
//   primary: 파랑 (확인·저장)
// 크기가 다른 곳은 className 으로 덮어쓴다.
import { memo, type ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

export type ButtonVariant = 'cancel' | 'danger' | 'primary'

const VARIANT: Record<ButtonVariant, string> = {
  cancel: 'border-white/24 bg-white/8 hover:border-white/40 hover:bg-white/16',
  danger: 'border-transparent bg-accent-red hover:bg-accent-red-light',
  primary: 'border-transparent bg-primary-dark hover:bg-primary-light',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export const Button = memo(function Button({ variant = 'cancel', className, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={cn(
        'flex h-10 w-[120px] cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 pt-[3px] pb-0 font-sans text-[14px] leading-none font-medium text-white transition-[background,border-color] duration-150 disabled:cursor-default disabled:opacity-40',
        VARIANT[variant],
        className,
      )}
      {...rest}
    />
  )
})
