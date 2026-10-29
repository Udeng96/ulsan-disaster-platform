// 지도 위 CCTV 영상 팝업 — 클러스터 목록/마커에서 고른 CCTV 를 작은 플레이어로 표출.
//   maplibre Popup 대신 지도 컨테이너 위 절대배치 div — 헤더를 잡고 자유롭게 옮길 수 있어야 해서다.
//   · 옮기기 전: 마커 옆에 붙어 지도 이동/줌을 따라간다.
//   · 옮긴 뒤  : 화면 위치가 고정되고, 마커와 팝업을 잇는 연결선(polyline)이 그려진다.
//               줌/이동을 해도 팝업은 그대로, 연결선의 시작점만 마커를 따라 움직인다.

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { type Map as MlMap } from 'maplibre-gl'
import { CctvPlayer } from '@/features/shared/cctv-stream/CctvPlayer'
import { ExpandButton } from '@/features/shared/cctv-stream/ExpandButton'
import {
  CLOSE_ICON_HOVER_SVG,
  CLOSE_ICON_SVG,
  type SelectedCctv,
} from './CctvMarkersML'

// 작은 버전 — 그리드의 작은 칸과 동일 규격 (16:9).
const PLAYER_W = 320
const PLAYER_H = 180
const HEADER_H = 32
// 마커 오른쪽으로 띄우는 간격 (기존 popup offset 과 동일).
const GAP_X = 18

interface Props {
  map: MlMap
  cctv: SelectedCctv
  onClose: () => void
  /** 확대 버튼 — 기존 CCTV 전체화면 모달로. */
  onExpand?: () => void
}

export function CctvPlayerPopup({ map, cctv, onClose, onExpand }: Props) {
  const [closeHover, setCloseHover] = useState(false)
  // 마커의 화면 좌표 — 지도 이동/줌마다 갱신.
  const [anchor, setAnchor] = useState(() => map.project([cctv.lng, cctv.lat]))
  // 드래그로 옮긴 화면 좌표 (팝업 좌상단). null 이면 아직 마커에 붙어 있다.
  const [dragged, setDragged] = useState<{ x: number; y: number } | null>(null)
  const draggedRef = useRef(dragged)
  draggedRef.current = dragged

  // 지도 이동/줌 → 마커 화면 좌표 갱신. 팝업이 붙어 있으면 같이 움직이고,
  //   옮긴 뒤에는 연결선 시작점만 이 값을 따라간다.
  useEffect(() => {
    const sync = () => setAnchor(map.project([cctv.lng, cctv.lat]))
    sync()
    map.on('move', sync)
    map.on('resize', sync)
    return () => {
      map.off('move', sync)
      map.off('resize', sync)
    }
  }, [map, cctv.lng, cctv.lat])

  // 헤더 드래그 — 누른 지점과 팝업 좌상단의 간격을 유지한 채 이동.
  const onHeaderPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // 닫기/확대 버튼 위에서 시작한 드래그는 무시.
      if ((e.target as HTMLElement).closest('button')) return
      e.preventDefault()
      const container = map.getContainer()
      const rect = container.getBoundingClientRect()
      // ScaledFrame 이 화면 전체를 축소하므로 clientX(화면 px) → 컨테이너 CSS px 로 환산한다.
      const scale = rect.width / (container.offsetWidth || rect.width)
      const toLocal = (clientX: number, clientY: number) => ({
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      })
      const start = draggedRef.current ?? {
        x: anchor.x + GAP_X,
        y: anchor.y - cctv.markerHeight,
      }
      const grab = toLocal(e.clientX, e.clientY)
      const grabX = grab.x - start.x
      const grabY = grab.y - start.y
      const onMove = (ev: PointerEvent) => {
        const at = toLocal(ev.clientX, ev.clientY)
        setDragged({ x: at.x - grabX, y: at.y - grabY })
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [map, anchor.x, anchor.y, cctv.markerHeight],
  )

  const pos = dragged ?? {
    x: anchor.x + GAP_X,
    y: anchor.y - cctv.markerHeight,
  }

  // 연결선 — 마커(anchor) 에서 팝업의 가장 가까운 변 중앙까지.
  const linkTo = {
    x: Math.min(Math.max(anchor.x, pos.x), pos.x + PLAYER_W),
    y: Math.min(Math.max(anchor.y, pos.y), pos.y + HEADER_H + PLAYER_H),
  }

  return createPortal(
    <>
      {dragged && (
        <svg
          className="absolute inset-0"
          style={{ pointerEvents: 'none', zIndex: 1199 }}
          width="100%"
          height="100%"
        >
          <line
            x1={anchor.x}
            y1={anchor.y}
            x2={linkTo.x}
            y2={linkTo.y}
            stroke="#1EA7FF"
            strokeWidth={2}
          />
          <circle cx={anchor.x} cy={anchor.y} r={4} fill="#1EA7FF" />
        </svg>
      )}
      <div
        className="cctv-player-popup-box absolute"
        // 팝업 안에서 시작한 클릭/드래그가 지도(패닝·마커 클릭)로 넘어가지 않게 막는다.
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: `${PLAYER_W}px`,
          // 마커(z-index 10)와 지도 컨트롤(z-index 1000) 보다 위에 —
          //   컨트롤과 겹치는 자리에서도 닫기 버튼이 눌려야 한다.
          zIndex: 1200,
        }}
      >
        {/* 헤더 — 이름 + 우측 닫기. 여기를 잡고 옮긴다. */}
        <div
          className="flex items-center"
          onPointerDown={onHeaderPointerDown}
          style={{
            height: `${HEADER_H}px`,
            padding: '0 6px 0 10px',
            gap: '6px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.20)',
            background: 'rgba(0, 26, 56, 0.90)',
            cursor: 'move',
          }}
        >
          <span
            title={cctv.name}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              color: '#FFF',
              fontFamily: 'Roboto, system-ui, sans-serif',
              fontSize: '13px',
              fontWeight: 500,
              lineHeight: 1.2,
            }}
          >
            {cctv.name}
          </span>
          {/* 닫기 — hover 시 크기는 그대로 두고 원/✕ 만 밝아진다. */}
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            onPointerEnter={() => setCloseHover(true)}
            onPointerLeave={() => setCloseHover(false)}
            className="flex items-center justify-center"
            style={{
              width: '20px',
              height: '20px',
              flexShrink: 0,
              cursor: 'pointer',
            }}
            dangerouslySetInnerHTML={{
              __html: closeHover ? CLOSE_ICON_HOVER_SVG : CLOSE_ICON_SVG,
            }}
          />
        </div>
        {/* 플레이어 */}
        <div className="relative">
          <CctvPlayer cctvId={cctv.cctvId} width={PLAYER_W} height={PLAYER_H} />
          <ExpandButton onClick={onExpand} />
        </div>
      </div>
    </>,
    map.getContainer(),
  )
}
