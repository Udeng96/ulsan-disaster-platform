// 재난 예·경보 메뉴 button — 자동음성통보 / 재해문자 전광판 전환.
//   체크박스 + 텍스트. active 시 .is-selected 스타일 (index.css).

import { Checkbox } from '@/components/inputs/Checkbox'

export function MenuButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`disaster-menu-btn flex flex-col items-center${
        active ? ' is-selected' : ''
      }`}
      style={{ flex: '1 0 0', minWidth: 0, padding: '24px 0', gap: '10px' }}
    >
      <div className="flex items-center" style={{ gap: '10px' }}>
        <Checkbox state={active ? 'checked' : 'unchecked'} size={26} />
        <span
          className="disaster-menu-btn-text font-display"
          style={{ fontSize: '30px', fontWeight: 700, lineHeight: '32px' }}
        >
          {label}
        </span>
      </div>
    </button>
  )
}
