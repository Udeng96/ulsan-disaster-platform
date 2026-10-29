import { ExpandButton } from './ExpandButton'
import { NumberBadge } from './NumberBadge'
import { CctvNameLabel } from './CctvNameLabel'
import { CctvPlayer } from './CctvPlayer'

interface MainCCTVProps {
  number: number
  name: string
  onExpand?: () => void
  /** NumberBadge variant — 'event' 시 빨간 배지 */
  badgeVariant?: 'normal' | 'event'
  /** 숫자 배지 표시 여부 (default true). 투망 비활성 시 숨김. */
  showBadge?: boolean
  /** CCTV 관리번호 (cctvId). undefined 면 placeholder. */
  cctvId?: string
  /** 영상 폭 (default 640). 급경사지는 512. 높이는 16:9 로 자동. */
  width?: number
  /** 헤더 높이 (default 40). 급경사지는 32. */
  headerHeight?: number
  /** 높이를 부모(레이아웃)에 맡긴다 — 셀 자체 height 애니메이션을 쓰지 않는다. */
  fillHeight?: boolean
  /** 이름 baseline 보정 (default 1px). */
  nameTop?: string
}

// 큰 CCTV (메인) — header (absolute) + body (영상)
// wrapper: W 640 × H 400, col, items-start, shrink-0
// border-radius 16 16 0 0, border 0.947 rgba(255,255,255,0.20)
// header: W 640 × H 40, absolute left 0, padding 0 14, items-center, gap 6
//   border-bottom 1px rgba(255,255,255,0.20), bg rgba(0,26,56,0.80)
// body: W 640 × H 360 (영상 — 16:9)
// expand button: 32×32, absolute bottom 12 right 12
export function MainCCTV({
  number,
  name,
  onExpand,
  badgeVariant,
  showBadge = true,
  cctvId,
  width = 640,
  headerHeight = 40,
  nameTop,
  fillHeight,
}: MainCCTVProps) {
  const bodyHeight = Math.round((width * 9) / 16)
  return (
    <div
      className="relative flex shrink-0 flex-col items-start overflow-hidden"
      style={{
        width: `${width}px`,
        height: fillHeight ? '100%' : `${headerHeight + bodyHeight}px`,
        // 급경사지 전환 — 1단계에서 높이, 3단계(0.7s 뒤)에서 폭이 줄어든다.
        transition:
          'height 0.5s cubic-bezier(0.33, 1, 0.68, 1), width 0.45s cubic-bezier(0.33, 1, 0.68, 1) var(--map-shift-delay, 0s)',
        borderRadius: '16px 16px 0 0',
        // border 두께만큼 content area 가 줄어 영상 visual W 가 작은 CCTV grid 보다
        // 좁아 보이는 문제 — border 대신 box-shadow inset 으로 그려 layout 영향 제거
        boxShadow: 'inset 0 0 0 0.947px rgba(255, 255, 255, 0.20)',
        background: '#002247',
      }}
    >
      {/* body — 헤더(40) 아래 영역만 사용 (W 640 × H 360 = 16:9).
          cctvId 있으면 Xeus 플레이어, 없으면 placeholder 아이콘 (64×64) */}
      <div
        style={{
          marginTop: `${headerHeight}px`,
          height: fillHeight ? `calc(100% - ${headerHeight}px)` : undefined,
        }}
      >
        <CctvPlayer
          cctvId={cctvId}
          width={width}
          height={bodyHeight}
          fillHeight={fillHeight}
        />
      </div>

      {/* header — absolute top 0 left 0, body 위 overlay */}
      <div
        className="absolute left-0 top-0 flex items-center"
        style={{
          width: `${width}px`,
          height: `${headerHeight}px`,
          padding: '0 14px',
          transition:
            'height 0.5s cubic-bezier(0.33, 1, 0.68, 1), width 0.45s cubic-bezier(0.33, 1, 0.68, 1) var(--map-shift-delay, 0s)',
          gap: '6px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.20)',
          background: 'rgba(0, 26, 56, 0.80)',
        }}
      >
        {showBadge && <NumberBadge number={number} variant={badgeVariant} />}
        {/* 이름 — 한 줄 고정. 헤더 폭 넘치면 말줄임(…). */}
        <CctvNameLabel name={name} fontSize="17px" top={nameTop} />
      </div>

      {/* expand button — 32×32, absolute bottom 12 right 12 */}
      <ExpandButton onClick={onExpand} />
    </div>
  )
}
