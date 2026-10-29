// 확대 버튼 32×32 — 두 가지 모양.
//   round  : 패널 헤더 우상단 (둥근 글라스, hover 시 조금 진해짐)
//   square : CCTV 칸 우하단 (네모 글라스, hover 시 Primary-light 로 바뀜, disabled 지원)
// hover 는 CSS 로만 바꾼다 (상태 없음 → 마우스를 올려도 다시 그리지 않는다).
import { memo } from 'react'
import { cn } from './cn'

interface Props {
  variant?: 'round' | 'square'
  onClick?: () => void
  disabled?: boolean
  className?: string
  label?: string
}

export const ExpandButton = memo(function ExpandButton({ variant = 'round', onClick, disabled, className, label = '확대' }: Props) {
  const round = variant === 'round'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-variant={variant}
      className={cn(
        'group relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center p-0 disabled:cursor-default disabled:opacity-30',
        round ? 'rounded-full' : 'rounded-lg',
        className,
      )}
    >
      {/* 글라스 바탕 — 뒤를 흐리게 + 반투명 회색.
          시안 SVG 의 plus-lighter/plus-darker 는 opacity 그룹 안이라 실제로는 효과가 없어 넣지 않는다 (픽셀 비교로 확인). */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 opacity-90 backdrop-blur-[8px]',
          round
            ? 'rounded-full bg-glass-light/15 group-hover:bg-glass-light/24'
            : 'rounded-lg bg-glass-dark/45 group-enabled:group-hover:bg-glass-dark/60',
        )}
      />
      {/* 테두리 (+ square hover 의 하늘색 덧칠) */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 opacity-90',
          round
            ? 'rounded-full border border-white/15 group-hover:border-[1.25px] group-hover:border-white/21'
            : 'rounded-lg border border-black/15 group-enabled:group-hover:border-primary-light/45 group-enabled:group-hover:bg-primary-light/30',
        )}
      />
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden className="relative">
        <g
          className={cn('stroke-white', !round && 'group-enabled:group-hover:stroke-primary-light')}
          strokeWidth="1.28863"
        >
          <path d="M15.8056 22.253H22.3995V15.8531M15.8056 22.253H9.59961V9.45312H15.9996M15.8056 22.253V15.8531H10.072" />
          <path d="M18.8574 9.4523L22.4012 9.4523L22.4012 12.9432" />
          <path d="M22.348 9.50415L18.3281 13.524" />
        </g>
      </svg>
    </button>
  )
})
