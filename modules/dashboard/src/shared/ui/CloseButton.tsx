// 닫기(X) 버튼 — 모달·팝업 우상단. 아이콘 22, 누르는 영역은 className 으로 (기본 아이콘 크기).
import { memo } from 'react'
import { cn } from './cn'

export const CloseButton = memo(function CloseButton({ onClick, className }: { onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label="닫기" className={cn('flex cursor-pointer items-center justify-center', className)}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <path
          d="M10.9883 11.9946L17.4942 18.5005L18.5054 17.4893L11.9995 10.9834L18.5054 4.47755L17.4942 3.46639L10.9883 9.97226L4.47894 3.46289L3.46777 4.47405L9.97715 10.9834L3.46777 17.4928L4.47894 18.504L10.9883 11.9946Z"
          className="fill-icon"
        />
      </svg>
    </button>
  )
})
