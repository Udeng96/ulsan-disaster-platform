// 라디오 점 그림 (18×18) — 선택 / 안 선택 / hover.
//   hover 는 감싸는 요소의 `group` 으로 표시하므로 부모에 className="group" 이 있어야 한다.
import { memo } from 'react'

export const Radio = memo(function Radio({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden data-checked="true">
        <rect x="0.5" y="0.5" width="17" height="17" rx="8.5" className="fill-neutral-50 stroke-primary" />
        <circle cx="9" cy="9" r="5" className="fill-primary" />
      </svg>
    )
  }
  // 안 선택 — 평소/hover 두 그림을 CSS 로 바꿔 끼운다 (상태 없음).
  const off = (fill: number, stroke: number, cls: string) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden data-checked="false" className={cls}>
      <rect width="18" height="18" rx="9" className="fill-ice" fillOpacity={fill} />
      <rect x="1" y="1" width="16" height="16" rx="8" className="stroke-ice" strokeOpacity={stroke} strokeWidth="2" />
    </svg>
  )
  return (
    <>
      {off(0.4, 0.2, 'block group-hover:hidden')}
      {off(0.75, 0.5, 'hidden group-hover:block')}
    </>
  )
})
