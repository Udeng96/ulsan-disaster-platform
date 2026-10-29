// 재난 예·경보 (방송장비 / 재해문자전광판) 마커 — MapLibre.
//   18×18 원 (방송장비/전광판 레이어 색) + 옵션 이름 라벨.
//   라벨 디자인: 전용 재난 메뉴(idx 4) → 'plain' (글씨만, 위), 레이어 메뉴(idx 5) → 'boxed' (박스, 아래).
//   강조 (DisasterPanel 체크, 전용 메뉴만): 원 svg 를 56×56 이중 링으로 교체 (element 재생성 없이).
//
// 사용처: 메인 지도 (MapSection) — 재난 예·경보 메뉴(idx 4) 또는 레이어 메뉴(idx 5) 체크 시.

import { useEffect, useRef } from 'react'
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import type { FacilityListItem } from '@/api/facility'
import {
  createMarkerLabelEl,
  type MarkerLabelStyle,
} from './markerElement'

interface Props {
  map: MlMap
  items: readonly FacilityListItem[]
  color?: string
  emphasizedIds?: ReadonlySet<number>
  showLabels?: boolean
  /** 라벨 디자인 — 전용 메뉴 'plain', 레이어 메뉴 'boxed'. */
  labelStyle?: MarkerLabelStyle
  /** 마커 클릭 — 패널에서 그 시설물을 선택/해제한다. 주면 마커가 클릭 가능해진다. */
  onSelect?: (id: number) => void
}

// 기본 18×18 / 강조 56×56 (이중 링) SVG.
function markerSvg(color: string, emphasized: boolean): string {
  if (!emphasized) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7.5" fill="${color}" stroke="white" stroke-width="1.5"/>
    </svg>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56" fill="none">
    <circle cx="28" cy="28" r="20" fill="${color}" fill-opacity="0.2"/>
    <circle cx="28" cy="28" r="14" fill="${color}" fill-opacity="0.4"/>
    <circle cx="28" cy="28" r="7.5" fill="${color}" stroke="white" stroke-width="1.5"/>
  </svg>`
}

/** 아이콘 svg 교체 — 18×18 자리 중심에 겹쳐 그린다 (커져도 중심이 안 움직이게). */
function setIconSvg(icon: HTMLElement, color: string, emphasized: boolean) {
  icon.innerHTML = markerSvg(color, emphasized)
  const svg = icon.firstElementChild as HTMLElement | null
  if (!svg) return
  svg.style.position = 'absolute'
  svg.style.left = '50%'
  svg.style.top = '50%'
  svg.style.transform = 'translate(-50%, -50%)'
}

export function BroadcastMarkers({
  map,
  items,
  color = '#BD008E',
  emphasizedIds,
  showLabels = false,
  labelStyle = 'plain',
  onSelect,
}: Props) {
  // 이벤트 핸들러가 항상 최신 콜백을 쓰도록 ref 로 참조.
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  // id → 아이콘 holder (svg 감싼 div) — 강조 시 여기 innerHTML 만 교체 (라벨 유지).
  const iconByIdRef = useRef<Map<number, HTMLElement>>(new Map())
  // hover 이름 툴팁 — CCTV 마커 툴팁과 같은 규격(cctv-tip-popup).
  const tipRef = useRef<maplibregl.Popup | null>(null)
  if (!tipRef.current) {
    tipRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      anchor: 'bottom',
      offset: [0, -12],
      className: 'cctv-tip-popup',
      maxWidth: 'none',
    })
  }
  useEffect(
    () => () => {
      tipRef.current?.remove()
    },
    [],
  )

  useEffect(() => {
    const markers: maplibregl.Marker[] = []
    iconByIdRef.current.clear()
    const boxed = labelStyle === 'boxed'
    items.forEach((f) => {
      if (typeof f.lat !== 'number' || typeof f.lng !== 'number') return
      // column — plain: [라벨, 원] anchor bottom / boxed: [원, 라벨] anchor top. 원 중심이 좌표에.
      const el = document.createElement('div')
      // 클릭/hover 를 받을 때만 이벤트를 켠다 (레이어 메뉴 등 표시 전용일 땐 그대로 통과).
      el.style.pointerEvents = onSelectRef.current ? 'auto' : 'none'
      el.style.display = 'flex'
      el.style.flexDirection = 'column'
      el.style.alignItems = 'center'
      el.style.gap = boxed ? '6px' : '4px'
      const icon = document.createElement('div')
      // 아이콘 자리는 18×18 로 고정하고 svg 는 그 중심에 겹쳐 놓는다.
      //   강조(56×56)로 커져도 자리 크기가 그대로라 원 중심이 좌표에서 움직이지 않는다.
      icon.style.position = 'relative'
      icon.style.width = '18px'
      icon.style.height = '18px'
      icon.style.lineHeight = '0'
      setIconSvg(icon, color, false)
      const labelEl = showLabels
        ? createMarkerLabelEl(f.name, labelStyle, color)
        : null
      if (boxed) {
        el.appendChild(icon)
        if (labelEl) el.appendChild(labelEl)
      } else {
        if (labelEl) el.appendChild(labelEl)
        el.appendChild(icon)
      }
      if (onSelectRef.current) {
        icon.style.cursor = 'pointer'
        // hover — 이름 툴팁(CCTV 마커와 같은 규격) + 아이콘 강조.
        icon.addEventListener('mouseenter', () => {
          icon.style.filter =
            'drop-shadow(0 0 4px rgba(255,255,255,0.9)) drop-shadow(0 2px 6px rgba(0,0,0,0.45))'
          tipRef.current
            ?.setText(f.name)
            .setLngLat([f.lng, f.lat])
            .addTo(map)
        })
        icon.addEventListener('mouseleave', () => {
          icon.style.filter = ''
          tipRef.current?.remove()
        })
        icon.addEventListener('click', (ev) => {
          ev.stopPropagation()
          tipRef.current?.remove()
          onSelectRef.current?.(f.id)
        })
      }
      const marker = new maplibregl.Marker({
        element: el,
        anchor: boxed ? 'top' : 'bottom',
        offset: boxed ? [0, -9] : [0, 9],
      })
        .setLngLat([f.lng, f.lat])
        .addTo(map)
      markers.push(marker)
      iconByIdRef.current.set(f.id, icon)
    })
    return () => {
      tipRef.current?.remove()
      markers.forEach((m) => m.remove())
      iconByIdRef.current.clear()
    }
  }, [map, items, color, showLabels, labelStyle])

  // 강조 변경 — 매칭 아이콘 svg 만 교체 + zIndex (라벨 유지).
  useEffect(() => {
    iconByIdRef.current.forEach((icon, id) => {
      const emphasized = emphasizedIds?.has(id) ?? false
      setIconSvg(icon, color, emphasized)
      const wrapper = icon.parentElement
      if (wrapper) wrapper.style.zIndex = emphasized ? '10' : '0'
    })
  }, [emphasizedIds, items, color])

  return null
}
