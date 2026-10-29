// 시설 마커 공통 — 18px 원 + 이름표를 지도 엔진이 그린다 (지도 새로 만들기 4단계, '섞어 쓰기').
//   옛 markerElement(createLabeledCircleEl)·BroadcastMarkers 와 같은 모양·자리:
//     원: 반지름 7.5 + 흰 테두리 1.5, 원 안 글자(등급) 10px
//     이름표 boxed: 원 아래 6px (레이어 메뉴) / plain: 원 위 4px (전용 메뉴)
//     강조: 원 둘레 두 겹 (반지름 20 20%, 14 40%) — 재난 예·경보에서 고른 것
//     area: 급경사지 상시계측 지역 30px 원 (옛 createAreaCircleEl — 90% 칠 + 흰 테두리 2, 이름표는 원 아래 4px)
//   누를 수 있으면(onSelect) 올렸을 때 이름 풍선 + 빛, 누르면 onSelect.
//   점이 바뀌면 자료만 바꾼다 (레이어를 다시 만들지 않음). CCTV 는 늘 이보다 위 (CctvLayer).
import { useEffect, useId, useMemo, useRef } from 'react'
import maplibregl, { type ExpressionSpecification, type GeoJSONSource, type MapLayerMouseEvent, type Map as MlMap } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import { MARKER } from '@/shared/styles/palette'
import { attachLabelImages, labelImageName, type LabelStyle } from './labelImage'

export interface MapPoint {
  id: number
  lng: number
  lat: number
  name: string
  color: string
  /** 원 안 글자 (급경사지 등급) */
  inner?: string
  /** 이 점만 이름표 켜고 끄기 (레이어마다 라벨보기가 따로) — 없으면 showLabels */
  label?: boolean
}

interface Props {
  map: MlMap
  points: readonly MapPoint[]
  /** 이름표 — 없으면 원만 */
  labelStyle?: LabelStyle
  showLabels?: boolean
  /** 'area' — 30px 큰 원 (처음 모양으로 고정, 바꾸려면 key 로 새로) */
  variant?: 'dot' | 'area'
  /** 원 둘레 두 겹으로 강조할 것 */
  emphasizedIds?: ReadonlySet<number>
  /** 주면 누를 수 있다 (올리면 이름 풍선) */
  onSelect?: (id: number) => void
}

const valid = (p: MapPoint) => Number.isFinite(p.lng) && Number.isFinite(p.lat)

export function PointLayer({ map, points, labelStyle = 'plain', showLabels = false, variant = 'dot', emphasizedIds, onSelect }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const ids = useMemo(() => {
    const p = `pt-${uid}`
    return { src: p, halo: `${p}-halo`, glow: `${p}-glow`, dot: `${p}-dot`, inner: `${p}-inner`, label: `${p}-label` }
  }, [uid])
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  })
  const clickable = !!onSelect

  // 레이어 — 처음 한 번
  useEffect(() => {
    const area = variant === 'area'
    const below = area || labelStyle === 'boxed'
    map.addSource(ids.src, { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, promoteId: 'id' })
    const state = (k: string): ExpressionSpecification => ['boolean', ['feature-state', k], false]
    // 강조 두 겹 — 바깥 20(20%) 위에 안쪽 14(40%)를 겹친 것과 같게
    map.addLayer({
      id: ids.halo,
      type: 'circle',
      source: ids.src,
      paint: {
        'circle-radius': 20,
        'circle-color': ['get', 'color'],
        'circle-opacity': ['case', state('em'), 0.2, 0],
        'circle-stroke-width': 0,
      },
    })
    map.addLayer({
      id: ids.glow,
      type: 'circle',
      source: ids.src,
      paint: {
        'circle-radius': ['case', state('em'), 14, area ? 17 : 11],
        'circle-color': ['case', state('em'), ['get', 'color'], MARKER.stroke],
        // 강조 안쪽 40%, 올렸을 때 흰 빛(옛 drop-shadow 흰 4px)
        'circle-opacity': ['case', state('em'), 0.4, state('hover'), 0.6, 0],
        'circle-blur': ['case', state('em'), 0, 0.8],
      },
    })
    map.addLayer({
      id: ids.dot,
      type: 'circle',
      source: ids.src,
      // 옛 svg 는 테두리가 원 둘레 가운데에 걸친다 — 엔진 테두리는 바깥에 붙으므로 반지름을 테두리 반만큼 줄인다
      paint: area
        ? { 'circle-radius': 12, 'circle-color': ['get', 'color'], 'circle-opacity': 0.9, 'circle-stroke-color': MARKER.stroke, 'circle-stroke-width': 2 }
        : { 'circle-radius': 7.5, 'circle-color': ['get', 'color'], 'circle-stroke-color': MARKER.stroke, 'circle-stroke-width': 1.5 },
    })
    map.addLayer({
      id: ids.inner,
      type: 'symbol',
      source: ids.src,
      filter: ['has', 'innerImg'],
      layout: { 'icon-image': ['get', 'innerImg'], 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'symbol-z-order': 'source' },
    })
    map.addLayer({
      id: ids.label,
      type: 'symbol',
      source: ids.src,
      filter: ['has', 'labelImg'],
      layout: {
        'icon-image': ['get', 'labelImg'],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        // 겹치면 뒤에 온 점이 위 (옛 HTML 마커 순서와 같게)
        'symbol-z-order': 'source',
        'icon-anchor': below ? 'top' : 'bottom',
        // 원 반(9, area 15) + 사이(boxed 6 / plain 4, 글씨 둘레 여백 2 를 뺌). boxed 는 상자 테두리 반 칸만큼 옛 화면과 맞춰 1 뺌
        'icon-offset': area ? [0, 17] : labelStyle === 'boxed' ? [0, 14] : [0, -11],
      },
    })
    const detach = attachLabelImages(map)
    return () => {
      detach()
      try {
        for (const l of [ids.label, ids.inner, ids.dot, ids.glow, ids.halo]) if (map.getLayer(l)) map.removeLayer(l)
        if (map.getSource(ids.src)) map.removeSource(ids.src)
      } catch {
        // 지도가 먼저 사라짐
      }
    }
    // 이름표 자리는 처음 모양으로 고정 — 모양이 바뀌면 부르는 쪽이 key 로 새로 만든다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ids])

  // 자료
  useEffect(() => {
    const fc: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: points.filter(valid).map((p) => ({
        type: 'Feature',
        properties: {
          id: p.id,
          name: p.name,
          color: p.color,
          ...(p.inner ? { innerImg: labelImageName('plain', p.color, p.inner, 'inner') } : {}),
          ...((p.label ?? showLabels) ? { labelImg: labelImageName(labelStyle, p.color, p.name) } : {}),
        },
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      })),
    }
    ;(map.getSource(ids.src) as GeoJSONSource | undefined)?.setData(fc)
    // 점이 없으면 레이어를 끈다 — 빈 레이어도 화면을 그릴 때마다 한 번씩 돌아서 (메뉴마다 레이어가 여러 벌)
    const vis = fc.features.length > 0 ? 'visible' : 'none'
    for (const l of [ids.halo, ids.glow, ids.dot, ids.inner, ids.label]) if (map.getLayer(l) && map.getLayoutProperty(l, 'visibility') !== vis) map.setLayoutProperty(l, 'visibility', vis)
  }, [map, ids, points, showLabels, labelStyle])

  // 강조 — 바뀐 것만 상태를 바꾼다
  const prevEm = useRef<ReadonlySet<number>>(new Set())
  useEffect(() => {
    const next = emphasizedIds ?? new Set<number>()
    for (const id of prevEm.current) if (!next.has(id)) map.setFeatureState({ source: ids.src, id }, { em: false })
    for (const id of next) map.setFeatureState({ source: ids.src, id }, { em: true })
    prevEm.current = next
  }, [map, ids, emphasizedIds, points])

  // 누르기·올리기
  useEffect(() => {
    if (!clickable) return
    const canvas = map.getCanvas()
    const tip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, anchor: 'bottom', offset: [0, -12], className: 'cctv-tip-popup', maxWidth: 'none' })
    let hovered: string | number | undefined
    const unhover = () => {
      tip.remove()
      if (hovered !== undefined) map.setFeatureState({ source: ids.src, id: hovered }, { hover: false })
      hovered = undefined
    }
    const onMove = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (f?.id === undefined) return
      canvas.style.cursor = 'pointer'
      if (f.id === hovered) return
      unhover()
      hovered = f.id
      map.setFeatureState({ source: ids.src, id: hovered }, { hover: true })
      tip.setText(String(f.properties?.name ?? '')).setLngLat((f.geometry as Point).coordinates as [number, number]).addTo(map)
    }
    const onLeave = () => {
      canvas.style.cursor = ''
      unhover()
    }
    const onClick = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (!f) return
      tip.remove()
      onSelectRef.current?.(Number(f.properties?.id))
    }
    map.on('mousemove', ids.dot, onMove)
    map.on('mouseleave', ids.dot, onLeave)
    map.on('click', ids.dot, onClick)
    return () => {
      map.off('mousemove', ids.dot, onMove)
      map.off('mouseleave', ids.dot, onLeave)
      map.off('click', ids.dot, onClick)
      unhover()
      try {
        canvas.style.cursor = ''
      } catch {
        // 무시
      }
    }
  }, [map, ids, clickable])

  return null
}
