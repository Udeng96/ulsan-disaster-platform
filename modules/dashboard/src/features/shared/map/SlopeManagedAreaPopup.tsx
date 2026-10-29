import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Map as MlMap } from 'maplibre-gl'
import type { ManagedArea } from '@/api/slope'
import { GRADE_COLOR } from '@/features/menus/steep-slope/variants'
import './SlopeManagedAreaPopup.css'

export function managedAreaAddress(area: ManagedArea): string {
  const dong = area.legalDong?.trim()
  const jibun = area.jibun?.trim()
  if (!dong || !jibun) return '주소 정보 없음'
  // 법정동 코드 31140 = 가상시설0565. 기관명이나 시설명으로 주소를 추측하지 않는다.
  const prefix = area.legalDongCode?.startsWith('31140') && !dong.includes('울산')
    ? '가상시설0565 ' : ''
  return `${prefix}${dong} ${jibun}`
}

interface FrameProps {
  map: MlMap
  lat: number | null
  lng: number | null
  rightInset: number
  ariaLabel: string
  closeLabel: string
  /** 헤더 좌측 (번호·이름·배지). */
  heading: ReactNode
  /** 항목 목록 — <div><dt/><dd/></div> 묶음. */
  children: ReactNode
  onClose: () => void
  /** 마커를 창 위쪽 높이에 두고, 마커가 보이는 곳 밖으로 나가면 창도 숨긴다 (/v2/wall). 없으면 옛 화면처럼 마커가 창 가운데, 늘 보임 */
  pinTop?: boolean
}

/** pinTop 일 때 창 위 끝에서 마커까지 (머리 줄 높이쯤) */
const PIN_TOP_OFFSET = 28

/** 급경사지 지도 팝업 틀 — 지점 옆에 붙어 지도 이동을 따라간다. 총괄·관제(관리지역)와 계측 상세(계측기)가 같이 쓴다. */
export function SlopeMapPopup({ map, lat, lng, rightInset, ariaLabel, closeLabel, heading, children, onClose, pinTop = false }: FrameProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 12, y: 12, hidden: false })
  // 그리기 전에 자리를 잡는다 — useEffect 면 첫 화면에 왼쪽 위(12,12)로 한 번 그렸다가 제자리로 튄다
  useLayoutEffect(() => {
    const sync = () => {
      if (lat == null || lng == null) return
      const anchor = map.project([lng, lat])
      const container = map.getContainer()
      const width = ref.current?.offsetWidth ?? 340
      const height = ref.current?.offsetHeight ?? 270
      const availableWidth = container.clientWidth - rightInset
      const availableHeight = Math.min(container.clientHeight, 672)
      const desiredX = anchor.x + 24 + width <= availableWidth - 12
        ? anchor.x + 24 : anchor.x - width - 24
      const hidden = pinTop && (anchor.x < 0 || anchor.x > availableWidth || anchor.y < 0 || anchor.y > container.clientHeight)
      setPosition({
        x: Math.max(12, Math.min(desiredX, availableWidth - width - 12)),
        y: Math.max(12, Math.min(pinTop ? anchor.y - PIN_TOP_OFFSET : anchor.y - height / 2, availableHeight - height - 12)),
        hidden,
      })
    }
    sync()
    map.on('move', sync)
    map.on('resize', sync)
    const observer = new ResizeObserver(sync)
    if (ref.current) observer.observe(ref.current)
    return () => {
      map.off('move', sync)
      map.off('resize', sync)
      observer.disconnect()
    }
  }, [map, lat, lng, rightInset, pinTop])

  return createPortal(
    <div
      ref={ref}
      className="slope-managed-popup"
      role="dialog"
      aria-label={ariaLabel}
      style={{ left: position.x, top: position.y, visibility: position.hidden ? 'hidden' : undefined }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}
    >
      <header className="slope-managed-popup-header">
        <div className="slope-managed-popup-heading">{heading}</div>
        <button type="button" onClick={onClose} aria-label={closeLabel}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </header>
      <dl className="slope-managed-popup-details">{children}</dl>
    </div>,
    map.getContainer(),
  )
}

interface Props {
  map: MlMap
  area: ManagedArea
  rightInset: number
  onClose: () => void
  pinTop?: boolean
}

export function SlopeManagedAreaPopup({ map, area, rightInset, onClose, pinTop }: Props) {
  const coordinate = (value: number | null) => value != null && Number.isFinite(value) ? value.toFixed(6) : '정보 없음'
  return (
    <SlopeMapPopup
      map={map}
      lat={area.lat}
      lng={area.lng}
      rightInset={rightInset}
      pinTop={pinTop}
      ariaLabel={`${area.name} 급경사지 정보`}
      closeLabel="급경사지 정보 닫기"
      onClose={onClose}
      heading={
        <>
          <span className="slope-managed-popup-number">관리번호 {area.mgmtNo || '정보 없음'}</span>
          <div className="slope-managed-popup-name-row">
            <h3>{area.name}</h3>
            <span className="slope-managed-popup-grade" style={{ color: (area.grade && GRADE_COLOR[area.grade]) || '#b8c8d6' }}>
              {area.grade ? `${area.grade}등급` : '등급 없음'}
            </span>
          </div>
        </>
      }
    >
      <div><dt>주소</dt><dd>{managedAreaAddress(area)}</dd></div>
      <div><dt>위치</dt><dd><span>위도 {coordinate(area.lat)}</span><span>경도 {coordinate(area.lng)}</span></dd></div>
      <div><dt>관리 기관</dt><dd>{area.org?.trim() || '정보 없음'}</dd></div>
      <div><dt>관리 부서</dt><dd>{area.department?.trim() || '정보 없음'}</dd></div>
    </SlopeMapPopup>
  )
}
