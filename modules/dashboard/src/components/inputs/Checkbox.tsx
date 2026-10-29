// 공통 체크박스 SVG — 4 상태 (checked / unchecked / indeterminate / disabled).
//
// 디자인:
//   checked:       bg #F4F8FB, 체크 stroke #0D8AE0
//   unchecked:     bg #E0F2FF/40%, border #E0F2FF/20%
//   indeterminate: bg #F4F8FB, 가로선 stroke #0D8AE0
//   disabled:      bg #E0F2FF/20%, border 없음 (DropdownPanel 비활성 row)
//
// 모든 상태 viewBox 22×22 정규화 → size prop 으로 width/height scale.
//   기본 size = 22 (LayerPanel / TreeSelect 표준).
//   sub-text 안 등 작은 곳 size = 18, MenuButton 같은 큰 곳 size = 26.
//
// 사용 예:
//   <Checkbox state="checked" />
//   <Checkbox state={partial ? 'indeterminate' : 'unchecked'} size={18} />

export type CheckboxState = 'checked' | 'unchecked' | 'indeterminate' | 'disabled'

interface Props {
  state: CheckboxState
  /** 렌더 크기 px (default 22, viewBox 22×22 비율 유지). */
  size?: number
}

export function Checkbox({ state, size = 22 }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
    >
      {state === 'checked' && (
        <>
          <rect width="22" height="22" rx="6" fill="#F4F8FB" />
          <path
            d="M6 11L9.5 14.5L16 8"
            stroke="#0D8AE0"
            strokeWidth="2.07778"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {state === 'indeterminate' && (
        <>
          <rect width="22" height="22" rx="6" fill="#F4F8FB" />
          <path
            d="M6 11H16"
            stroke="#0D8AE0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {state === 'unchecked' && (
        <>
          <rect width="22" height="22" rx="6" fill="#E0F2FF" fillOpacity="0.4" />
          <rect
            x="1"
            y="1"
            width="20"
            height="20"
            rx="5"
            stroke="#E0F2FF"
            strokeOpacity="0.2"
            strokeWidth="2"
          />
        </>
      )}
      {state === 'disabled' && (
        <rect width="22" height="22" rx="6" fill="#E0F2FF" fillOpacity="0.2" />
      )}
    </svg>
  )
}
