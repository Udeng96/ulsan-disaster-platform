// 전체선택 / 전체해제 헤더 버튼 그룹.

import { COLORS } from '@/styles/designTokens'

export function BulkControl({
  onSelectAll,
  onDeselectAll,
}: {
  onSelectAll: () => void
  onDeselectAll: () => void
}) {
  const btnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    // 한글 글리프가 line box 위쪽에 치우쳐 글씨가 위로 보이는 문제 보정.
    // paddingTop 7 / paddingBottom 3 으로 글씨를 시각적 중앙으로 내림 (버튼 높이 22px 유지).
    padding: '7px 10px 3px',
    fontFamily: 'Roboto',
    fontSize: '12px',
    fontWeight: 500 as const,
    lineHeight: 1,
    color: COLORS.neutral100,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  }
  return (
    <div className="flex items-center" style={{ gap: '6px' }}>
      <button type="button" style={btnStyle} onClick={onSelectAll}>
        전체선택
      </button>
      <button type="button" style={btnStyle} onClick={onDeselectAll}>
        전체해제
      </button>
    </div>
  )
}
