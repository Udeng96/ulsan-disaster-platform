// 체크박스 그림 — checked / unchecked / indeterminate / disabled. viewBox 22, size 로 크기만 바꾼다.
//   기본 22 (레이어·트리), 작은 곳 18, 재난 예·경보 메뉴 버튼 26.
//   클릭은 감싸는 버튼이 받는다 (이 컴포넌트는 그림만).
import { memo } from 'react'

export type CheckboxState = 'checked' | 'unchecked' | 'indeterminate' | 'disabled'

export const Checkbox = memo(function Checkbox({ state, size = 22 }: { state: CheckboxState; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden data-state={state}>
      {(state === 'checked' || state === 'indeterminate') && <rect width="22" height="22" rx="6" className="fill-neutral-50" />}
      {state === 'checked' && (
        <path d="M6 11L9.5 14.5L16 8" className="stroke-primary-dark" strokeWidth="2.07778" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {state === 'indeterminate' && (
        <path d="M6 11H16" className="stroke-primary-dark" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {state === 'unchecked' && (
        <>
          <rect width="22" height="22" rx="6" className="fill-ice" fillOpacity="0.4" />
          <rect x="1" y="1" width="20" height="20" rx="5" className="stroke-ice" strokeOpacity="0.2" strokeWidth="2" />
        </>
      )}
      {state === 'disabled' && <rect width="22" height="22" rx="6" className="fill-ice" fillOpacity="0.2" />}
    </svg>
  )
})
