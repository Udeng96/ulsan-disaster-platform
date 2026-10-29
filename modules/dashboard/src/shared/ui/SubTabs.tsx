// 서브탭 — 메뉴 버튼 아래 pill (급경사지 총괄·계측·조기경보, 관리자 등).
//   기본 960×62 안에 306 버튼. 탭 수가 다르면 className 으로 폭만 바꾼다.
import { memo } from 'react'
import { cn } from './cn'

export interface SubTab<T extends string> {
  id: T
  label: string
}

interface Props<T extends string> {
  tabs: readonly SubTab<T>[]
  active: T
  onChange: (id: T) => void
  /** 줄 너비 (기본 w-[960px]) — cn 은 겹친 클래스를 고르지 않으므로 바꿀 땐 통째로 */
  className?: string
  /** 버튼 위아래 여백 (기본 pt-3 pb-2). 관리자는 py-2.5 (사용자 10-22) */
  tabClassName?: string
}

function SubTabsInner<T extends string>({ tabs, active, onChange, className, tabClassName }: Props<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex h-[62px] items-center justify-between rounded-[100px] border-2 border-neutral-450 bg-neutral-700 px-[5px] py-2',
        className ?? 'w-[960px]',
      )}
    >
      {tabs.map((t) => {
        const on = t.id === active
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={cn(
              'flex w-[306px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[100px] border text-center font-headline text-[30px] leading-8 font-normal text-ellipsis backdrop-blur-[3px] hover:bg-neutral-450',
              on ? 'border-black/20 bg-neutral-450 text-white shadow-tab-active' : 'border-transparent text-tab-idle',
              tabClassName ?? 'pt-3 pb-2',
            )}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

export const SubTabs = memo(SubTabsInner) as typeof SubTabsInner
