// 헤더 아래 가로 메뉴 버튼 영역 — W 1920 × H 120, gap 12, padding 8/18.
// TABS 7 개 (배수펌프장 / 하천시설물 / 급경사지 / 지진가속도 / 재난 예·경보 / 레이어 / 관리자).
//   - 클릭 시 onSelectTab(idx) 호출 — 같은 idx 누르면 -1 (메뉴 비활성).
//   - 클릭 시 부모는 투망 (activeEvent) 도 종료 → CCTV 가 메뉴 rotation 으로 전환.
// 스타일은 .menu-btn / .menu-inactive-btn 클래스 (index.css) 사용.

import { TABS } from './data'

interface Props {
  activeTabIdx: number
  /** 클릭 시 호출 — 같은 idx 면 -1 토글, 부모는 투망 종료 등 추가 처리. */
  onSelectTab: (idx: number) => void
}

export function MenuTabs({ activeTabIdx, onSelectTab }: Props) {
  return (
    <nav
      // gap 6 — 버튼 알약이 박스 안쪽 3px 에 그려져서, 보이는 간격은 6+3+3 = 12px.
      className="flex h-[120px] w-[1920px] shrink-0 items-center justify-center gap-1.5"
      style={{ padding: '8px 18px' }}
    >
      {TABS.map((label, idx) => {
        const isActive = idx === activeTabIdx
        return (
          <button
            key={label}
            type="button"
            onClick={() => onSelectTab(idx)}
            className={`menu-btn shrink-0 ${isActive ? 'is-active' : ''}`}
          >
            <div className="btn-inside">
              <div className="btn-shimmer" />
            </div>
            <span className="btn-text">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
