// 이벤트 활성화 마커 (MapLibre) — 빨간 핀 + 4개 펄스 링 + "투망종료" 버튼.
//   구 Leaflet EventFocusMarker 의 'event' variant 를 MapLibre Marker 로 포팅.
//   컨테이너 316×316 중심이 lat/lng, 핀 tip 이 중심, 버튼은 핀 아래.

import { useEffect, useRef } from 'react'
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import type { EventListItem } from '@/api/event'

const CONTAINER_SIZE = 316

// 빨간 그라데이션 핀 (#FF6542 → #DE0602).
const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="50" viewBox="0 0 42 50" fill="none">
  <path d="M21 50C28.732 50 35 48.2091 35 46C35 0.0 28.732 42 21 42C13.268 42 7 0.0 7 46C7 48.2091 13.268 50 21 50Z" fill="#222837" fill-opacity="0.1"/>
  <path d="M21 48C25.9706 48 30 47.1046 30 46C30 44.8954 25.9706 44 21 44C16.0294 44 12 44.8954 12 46C12 47.1046 16.0294 48 21 48Z" fill="#222837" fill-opacity="0.15"/>
  <path d="M21 47C23.2091 47 25 46.5523 25 46C25 45.4477 23.2091 45 21 45C18.7909 45 17 45.4477 17 46C17 46.5523 18.7909 47 21 47Z" fill="#222837" fill-opacity="0.2"/>
  <path d="M20.9996 3C24.5599 3 28.0404 4.06227 31.0006 6.05176C33.9607 8.04124 0.0 10.8685 0.0 14.1768C38.9927 17.4851 0.0 21.1258 0.0 24.6377C37.9589 28.1493 0.0 31.3747 0.0 33.9062C31.5542 0.0 24.7496 0.0 20.9996 46C17.2496 0.0 10.782 0.0 8.27399 33.9062C5.75623 31.3747 4.04126 28.1494 3.34626 24.6377C2.65129 21.1258 3.00748 17.4851 4.3697 14.1768C5.73187 10.8687 8.03864 8.04118 10.9986 6.05176C13.9588 4.06229 17.4394 3.00003 20.9996 3ZM20.9996 16C18.2382 16.0001 15.9996 18.2386 15.9996 21C15.9996 23.7614 18.2382 25.9999 20.9996 26C23.761 26 25.9996 23.7614 25.9996 21C25.9996 18.2386 23.761 16 20.9996 16Z" fill="url(#evt_pin_grad)"/>
  <defs>
    <linearGradient id="evt_pin_grad" x1="21.0001" y1="3" x2="21.0001" y2="46" gradientUnits="userSpaceOnUse">
      <stop offset="0.1" stop-color="#FF6542"/>
      <stop offset="0.9" stop-color="#DE0602"/>
    </linearGradient>
  </defs>
</svg>`

// 동심원 ring — position/border/animation 은 .event-focus-ring CSS.
const ringHtml = (size: number, bg: string, delaySec: number) =>
  `<div class="event-focus-ring" style="width:${size}px;height:${size}px;background:${bg};animation-delay:${delaySec}s;"></div>`

interface Props {
  map: MlMap
  /** 표출할 이벤트 (displayed, flyTo 완료 후). null 이면 마커 제거. */
  event: Pick<EventListItem, 'lat' | 'lng'> | null
  /** "투망종료" 클릭 → 활성 해제. */
  onDeactivate: () => void
}

export function EventFocusMarkerML({ map, event, onDeactivate }: Props) {
  // onDeactivate 는 매 렌더 새 함수 — ref 로 안정화해 marker effect 가 [map,event] 로만 재실행.
  const onDeactivateRef = useRef(onDeactivate)
  onDeactivateRef.current = onDeactivate
  useEffect(() => {
    if (!event) return
    const el = document.createElement('div')
    el.style.pointerEvents = 'none'
    el.innerHTML = `
      <div style="position:relative;width:${CONTAINER_SIZE}px;height:${CONTAINER_SIZE}px;">
        ${ringHtml(316, 'rgba(225, 51, 51, 0.15)', 0.6)}
        ${ringHtml(198, 'rgba(225, 51, 51, 0.15)', 0.4)}
        ${ringHtml(115, 'rgba(225, 51, 51, 0.25)', 0.2)}
        ${ringHtml(56, 'rgba(225, 51, 51, 0.25)', 0)}
        <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);">${PIN_SVG}</div>
        <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,8px);display:flex;justify-content:center;">
          <button type="button" class="event-end-btn" style="display:flex;height:26px;padding:9px 7px 8px 7px;justify-content:center;align-items:center;border-radius:99px;border:1px solid #B8C8D6;background:rgba(0,18,41,0.90);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);color:#FFF;text-align:center;font-family:Roboto,sans-serif;font-size:13px;font-weight:600;line-height:14px;letter-spacing:0.26px;white-space:nowrap;cursor:pointer;pointer-events:auto;">투망종료</button>
        </div>
      </div>`
    const btn = el.querySelector('button')
    const onClick = (e: Event) => {
      e.stopPropagation()
      onDeactivateRef.current()
    }
    btn?.addEventListener('click', onClick)
    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([event.lng, event.lat])
      .addTo(map)
    return () => {
      btn?.removeEventListener('click', onClick)
      marker.remove()
    }
  }, [map, event])
  return null
}
