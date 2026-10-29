// 우측 영역 CCTV 5 cell 그리드 — 메인(1 큰) + small 4 (2×2).
//   메뉴 안 눌린 기본 상태 + 공통 메뉴(배수펌프장/급경사지/지진가속도/레이어)의 우측에 표출.
//   재난 예·경보(idx 4)는 DisasterPanel 로 대체되므로 이 그리드 미사용.
//
// items: 항상 5 개 (useCctvSelection 의 activeCctvList — 부족분은 placeholder).
// hasCctv: 실제 CCTV 가 1 개 이상인지 (배지 표출 여부).

import { MainCCTV } from '@/features/shared/cctv-stream/MainCCTV'
import { SmallCCTV } from '@/features/shared/cctv-stream/SmallCCTV'
import type { CCTVMeta } from './data'

interface Props {
  items: CCTVMeta[]
  hasCctv: boolean
  onExpand: (cctv: CCTVMeta) => void
  /** 급경사지 전용 축소 규격 — 패널 512 (메인 512×288 / 작은 256×144, 헤더 32). */
  compact?: boolean
  /** 높이 규격만 따로 — 전환 2단계(세로 확대)에서 폭보다 먼저 늘어난다. */
  compactHeight?: boolean
}

export function CctvGrid({
  items,
  hasCctv,
  onExpand,
  compact,
  compactHeight = compact,
}: Props) {
  const mainWidth = compact ? 512 : 640
  const smallWidth = compact ? 256 : 320
  // 헤더 높이도 '높이 규격' 에 묶는다 — 폭과 같이 바뀌면 마지막에 8px 높이가 한 번 더 움직인다.
  const headerHeight = compactHeight ? 32 : 40
  // 세로 비율 — 400 : 220×2 (= 320 : 176×2, 두 규격이 같은 비율).
  // 급경사지는 순환이 없어서 순번 개념이 없다 — 숫자 배지 숨김.
  const showBadge = hasCctv && !compact
  // 배지가 빠진 급경사지 헤더는 이름만 남아 살짝 위로 떠 보인다 — 1px 더 내림.
  const nameTop = compact ? '2px' : undefined
  return (
    <aside
      // 폭은 두 상태 모두 고정값 — flex-1 ↔ 고정 px 로 바뀌면 transition 없이 즉시 점프한다
      // (전환 중 CCTV 블록만 먼저 튀어 보이는 원인).
      className="flex h-full shrink-0 flex-col items-start"
      style={{
        width: `${mainWidth}px`,
        transition:
          'width 0.45s cubic-bezier(0.33, 1, 0.68, 1) var(--map-shift-delay, 0s)',
        contain: 'layout paint',
      }}
    >
      {/* 세로는 비율로 나눈다 — 메인 400 : 작은 2행 440 (두 규격 모두 같은 비율). */}
      <div style={{ flex: '400 0 0', minHeight: 0, width: `${mainWidth}px` }}>
        <MainCCTV
          number={items[0].number}
          name={items[0].name}
          cctvId={items[0].cctvId}
          onExpand={() => onExpand(items[0])}
          badgeVariant="normal"
          showBadge={showBadge}
          width={mainWidth}
          headerHeight={headerHeight}
          nameTop={nameTop}
          fillHeight
        />
      </div>
      {/* 작은 셀 4개 — 2열 고정.
          flex-wrap 이면 폭이 줄어드는 중 한 줄에 2개가 안 들어가는 순간
          한 칸이 아래로 내려갔다 올라온다. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(2, ${smallWidth}px)`,
          gridTemplateRows: 'repeat(2, 1fr)',
          flex: '440 0 0',
          minHeight: 0,
          width: `${mainWidth}px`,
          transition:
            'width 0.45s cubic-bezier(0.33, 1, 0.68, 1) var(--map-shift-delay, 0s), grid-template-columns 0.45s cubic-bezier(0.33, 1, 0.68, 1) var(--map-shift-delay, 0s)',
        }}
      >
        {items.slice(1).map((c, i) => (
          <SmallCCTV
            key={c.number}
            number={c.number}
            name={c.name}
            cctvId={c.cctvId}
            onExpand={() => onExpand(c)}
            borderRadius={
              i === 2 ? '0 0 0 16px' : i === 3 ? '0 0 16px 0' : undefined
            }
            badgeVariant="normal"
            showBadge={showBadge}
            width={smallWidth}
            headerHeight={headerHeight}
            nameTop={nameTop}
            fillHeight
          />
        ))}
      </div>
    </aside>
  )
}
