// CCTV 순번 상자 — small 18×18 (격자), large 24×24 (모달 헤더).
//   normal: 지도 reticle 과 같은 보라, event: 이벤트 활성 빨강.
import { memo } from 'react'
import { cn } from './cn'

interface Props {
  number: number
  size?: 'small' | 'large'
  variant?: 'normal' | 'event'
}

export const NumberBadge = memo(function NumberBadge({ number, size = 'small', variant = 'normal' }: Props) {
  return (
    <div
      data-variant={variant}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-[4px] border',
        size === 'large' ? 'size-6' : 'size-[18px]',
        variant === 'event' ? 'border-accent-red bg-event' : 'border-white bg-reticle',
      )}
    >
      {/* 한 글자 — line-height 1 로 옆 한글 라벨과 맞춤. 모달(large)만 1px 내린다. */}
      <span
        className={cn(
          'relative text-center font-sans leading-none font-semibold text-white',
          size === 'large' ? 'top-px text-[20px]' : 'text-[15px]',
        )}
      >
        {number}
      </span>
    </div>
  )
})
