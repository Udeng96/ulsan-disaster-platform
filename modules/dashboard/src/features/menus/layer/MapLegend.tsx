import { COLORS } from '@/styles/designTokens'
import { useEffect, useState } from 'react'
import { useLayers } from './useLayers'
import { useLayerColorMap } from './layerColorStore'

// 지도 범례 — 레이어 메뉴 active 시 지도 위 표시
// 외곽 radius 12, border Neutral-200, bg white 60%, 헤더 + chevron 토글 (펼침/접힘)
//   항목 = CCTV (레이어 아님 — 항상 표시) + 백엔드 레이어 중 체크된 것 (백엔드 색).

export interface LegendItem {
  /** 렌더 key (레이어는 code, CCTV 는 'CCTV'). */
  key: string
  label: string
  color: string
}

// CCTV 는 /api/layers 에 없는 별도 표시 — 레이어 패널 체크 시 범례 첫 항목으로 노출.
const CCTV_ITEM: LegendItem = {
  key: 'CCTV',
  label: 'CCTV',
  color: COLORS.neutral300,
}

// 16×16 색 dot (LayerPanel 의 22 dot 의 축소판, white stroke)
function LegendDot({ color }: { color: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle
        cx="8"
        cy="8"
        r="6.5"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
  )
}

// chevron toggle (이벤트 result 의 ExpandIcon 패턴, 24×24)
function ExpandToggleIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      data-anim=""
      style={{
        transform: open ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.2s',
      }}
    >
      <g opacity="0.9">
        <rect
          y="0.00012207"
          width="24"
          height="24"
          rx="12"
          fill="black"
          fillOpacity="0.08"
        />
        <rect
          x="0.5"
          y="0.500122"
          width="23"
          height="23"
          rx="11.5"
          stroke="black"
          strokeOpacity="0.16"
        />
      </g>
      <path
        d="M8.5 11.0938L12 14.5938L15.5 11.0938"
        stroke="#001229"
        strokeWidth="1.3125"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface MapLegendProps {
  /** 항목별 체크 상태 (code → checked, LayerPanel state) — 체크 out 시 범례에서 사라짐 */
  layerChecked: Record<string, boolean>
  /** 고정 항목 — 주면 레이어 체크 대신 이 목록을 그대로 표출 (급경사지 등급 범례 등). */
  items?: LegendItem[]
}

export function MapLegend({ layerChecked, items }: MapLegendProps) {
  // 백엔드 레이어 (displayOrder 순) — 이름/순서 소스.
  const layers = useLayers()
  // 유효 색 (override ?? 백엔드색) — 컬러 피커 반영.
  const colorMap = useLayerColorMap()
  const [open, setOpen] = useState(true)
  // width transition 활성 플래그 — open 토글 시에만 켜고, items 변경 시엔 꺼둠
  // → 항목 추가/제거 시 flex-wrap 깜빡임 방지하면서 펼침/접힘은 부드럽게 애니메이션.
  const [animatingWidth, setAnimatingWidth] = useState(false)
  useEffect(() => {
    if (!animatingWidth) return
    const t = setTimeout(() => setAnimatingWidth(false), 700)
    return () => clearTimeout(t)
  }, [animatingWidth])
  const toggleOpen = () => {
    setAnimatingWidth(true)
    setOpen((v) => !v)
  }

  // CCTV (항상 표시) + 체크된 백엔드 레이어. 색은 유효 색 (컬러 피커 반영).
  const LEGEND_ITEMS: LegendItem[] = items ?? [
    ...(layerChecked[CCTV_ITEM.key] ? [CCTV_ITEM] : []),
    ...layers
      .map((l) => ({
        key: l.code,
        label: l.name,
        color: colorMap[l.code] ?? l.color,
      }))
      .filter((item) => layerChecked[item.key] ?? false),
  ]

  return (
    // data-anim — 새 화면(/v2/wall)이 옛 지도 부품 움직임을 끌 때도 범례 여닫기는 남긴다 (애니메이션 7번)
    <div
      className="inline-flex flex-col items-start"
      data-anim=""
      style={{
        // 펼치면 항목 글자 길이만큼(max-content, 한 줄 최대 8칸 = 항목 줄 maxWidth 442), 접으면 124.
        //   interpolate-size 로 max-content 까지도 부드럽게 늘고 준다 (지원 안 하는 브라우저는 폭만 바로 바뀜)
        // 항목이 1~2개면 헤더('지도 범례' + chevron)보다 좁아져 제목이 줄바꿈된다 → 접힘 폭(124) 이상 보장.
        width: open ? 'max-content' : '124px',
        minWidth: '124px',
        interpolateSize: 'allow-keywords',
        borderRadius: '12px',
        border: '1px solid #B8C8D6',
        background: 'rgba(255, 255, 255, 0.60)',
        // animatingWidth (open 토글 직후) 일 때만 width transition 적용.
        //   - 펼침 (open=true): delay 0s → width 가 먼저 늘어남, body 는 delay 0.35s 로 그 뒤
        //   - 접힘 (open=false): delay 0.35s → body 가 먼저 접힌 뒤 width 가 줄어듦
        // 아닐 때 (items 변경 등): transition none → width snap (flex-wrap 깜빡임 방지)
        transition: animatingWidth
          ? open
            ? 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
            : 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1) 0.35s'
          : 'none',
      }}
    >
      {/* 헤더 — H 36, padding 6/6/6/10, items-center, gap 6, self-stretch */}
      <div
        className="flex items-center self-stretch"
        style={{
          height: '36px',
          padding: '6px 6px 6px 10px',
          gap: '6px',
        }}
      >
        <span
          className="text-b5"
          style={{ color: COLORS.neutral900, flex: '1 0 0', whiteSpace: 'nowrap' }}
        >
          지도 범례
        </span>
        <button
          type="button"
          onClick={toggleOpen}
          className="shrink-0"
          aria-label={open ? '범례 숨기기' : '범례 펼치기'}
        >
          <ExpandToggleIcon open={open} />
        </button>
      </div>

      {/* 항목 grid — flex-wrap (한 row 최대 8 항목 = 416, 넘으면 다음 줄)
          항목 수가 8 미만이면 wrapper W 자동 (자식 합 따라 줄어듦)
          padding 4/10/10/10, 항상 mount + transition (max-height + opacity + padding) */}
      <div
        className="flex flex-wrap overflow-hidden"
        data-anim=""
        style={{
          // max-width 442 (= 자식 8×52=416 + padding 좌우 10+10 + slack 6)
          // box-sizing border-box default 라 padding 포함 max-width.
          // content W 422 → 자식 8 fit(slack 6, 조기 wrap 방지), 9 번째 wrap
          maxWidth: '442px',
          rowGap: '2px', // wrap 시 첫 줄/둘째 줄 사이 간격
          padding: open ? '4px 10px 10px 10px' : '0 10px',
          maxHeight: open ? '200px' : '0',
          opacity: open ? 1 : 0,
          // open 시 grid 가 width 변경 후 expand (delay 0.35) — width 먼저 펼쳐짐
          // close 시 grid 가 width 변경 전에 collapse (delay 0)
          transition: `max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1) ${
            open ? '0.35s' : '0s'
          }, opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1) ${
            open ? '0.35s' : '0s'
          }, padding 0.35s cubic-bezier(0.4, 0, 0.2, 1) ${
            open ? '0.35s' : '0s'
          }`,
        }}
      >
        {LEGEND_ITEMS.map((item) => (
          <LegendCell key={item.key} item={item} />
        ))}
      </div>
    </div>
  )
}

// 한 항목 — 최소 W 52, 라벨이 길면 줄바꿈 없이 글자 길이만큼 넓어짐 (좌우 3px), col, justify/items-center, 아이콘 + 라벨 (사이 4px)
function LegendCell({ item }: { item: LegendItem }) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ minWidth: '52px', padding: '0 3px', boxSizing: 'border-box', whiteSpace: 'nowrap', gap: '4px' }}
    >
      <LegendDot color={item.color} />
      <span
        style={{
          color: COLORS.neutral900,
          textAlign: 'center',
          fontFamily: 'Roboto',
          fontSize: '11px',
          fontWeight: 500,
          lineHeight: '14px',
        }}
      >
        {item.label}
      </span>
    </div>
  )
}
