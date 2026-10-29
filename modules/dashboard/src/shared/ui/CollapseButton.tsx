// 축소 버튼 — 확대 모달 오른쪽 아래 (48×48, bottom 36 right 36). 평소 36 회색 유리, 올리면 48 파란 유리.
import { memo, useId } from 'react'
import { cn } from './cn'

function Arrow({ big }: { big: boolean }) {
  return big ? (
    <>
      <path d="M23.7077 33.3794H33.5985V23.7795M23.7077 33.3794H14.3987V14.1796H23.9986M23.7077 33.3794V23.7795H15.1073" className="stroke-white" strokeWidth="1.93295" />
      <path d="M32.8481 20.1647L27.5325 20.1647L27.5325 14.9283" className="stroke-white" strokeWidth="1.93295" />
      <path d="M33.5195 14.2561L27.4897 20.2859" className="stroke-white" strokeWidth="1.93295" />
    </>
  ) : (
    <>
      <path d="M17.7806 25.0347H25.1987V17.8347M17.7806 25.0347H10.7988V10.6348H17.9988M17.7806 25.0347V17.8347H11.3303" className="stroke-white" strokeWidth="1.44971" />
      <path d="M24.6362 15.1236L20.6495 15.1236L20.6495 11.1963" className="stroke-white" strokeWidth="1.44971" />
      <path d="M25.1395 10.6924L20.6172 15.2147" className="stroke-white" strokeWidth="1.44971" />
    </>
  )
}

export const CollapseButton = memo(function CollapseButton({ onClick, disabled, className }: { onClick?: () => void; disabled?: boolean; className?: string }) {
  const a = useId()
  const b = useId()
  return (
    <button
      type="button"
      aria-label="축소"
      onClick={onClick}
      disabled={disabled}
      className={cn('group absolute right-9 bottom-9 flex size-12 items-center justify-center disabled:opacity-30', className)}
    >
      <span className="block group-enabled:group-hover:hidden">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
          <foreignObject x="-18" y="-18" width="72" height="72">
            <div className="size-full backdrop-blur-[9px]" style={{ clipPath: `url(#${a})` }} />
          </foreignObject>
          <g opacity="0.9">
            <rect width="36" height="36" rx="9" className="fill-glass-dark mix-blend-plus-darker" fillOpacity="0.45" />
            <rect x="0.5625" y="0.5625" width="0.0" height="0.0" rx="8.4375" className="stroke-black" strokeOpacity="0.15" strokeWidth="1.125" />
          </g>
          <Arrow big={false} />
          <defs>
            <clipPath id={a} transform="translate(18 18)">
              <rect width="36" height="36" rx="9" />
            </clipPath>
          </defs>
        </svg>
      </span>
      <span className="hidden group-enabled:group-hover:block">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
          <foreignObject x="-12" y="-11.9996" width="72" height="72">
            <div className="size-full backdrop-blur-[6px]" style={{ clipPath: `url(#${b})` }} />
          </foreignObject>
          <g opacity="0.9">
            <rect y="0.000366211" width="48" height="48" rx="12" className="fill-glass-dark mix-blend-plus-darker" fillOpacity="0.6" />
            <rect y="0.000366211" width="48" height="48" rx="12" className="fill-primary-light" fillOpacity="0.3" />
            <rect x="0.375" y="0.375366" width="47.25" height="47.25" rx="11.625" className="stroke-primary-light" strokeOpacity="0.45" strokeWidth="0.75" />
          </g>
          <Arrow big />
          <defs>
            <clipPath id={b} transform="translate(12 11.9996)">
              <rect y="0.000366211" width="48" height="48" rx="12" />
            </clipPath>
          </defs>
        </svg>
      </span>
    </button>
  )
})
