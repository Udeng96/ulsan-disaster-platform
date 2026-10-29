// CCTV 마커 — 지도 엔진이 직접 그린다 (약 1,600건, 마커 하나마다 HTML 을 만들지 않는다).
//   낱개 점·묶음(숫자 원)은 엔진 레이어, 하나뿐인 것(고른 5개 둘레 원·번호, 재생 중 물방울, 목록 창)만 HTML (10-20 '섞어 쓰기').
//   묶음은 확대 13 미만에서만, 20px 안에 3개 이상일 때만 (10-20 사용자 결정 — 옛 화면은 30px·확대 17까지라 덩어리에 수백 개).
//   고른 5개·재생 중인 것은 묶지 않고 따로 그린다 — 늘 보이고, 묶음 소속을 따로 찾지 않아도 된다.
//   고른 게 있으면 나머지는 흐리게, 고른 5개는 바뀔 때만 두 번 반짝 (수정사항 4, 10-20 '둘 다').
//   옛 CctvMarkersML 과 같은 값을 받는다 — 지도 새로 만들기 8단계까지는 옛 MapSection 이 이걸 그린다.
import { useEffect, useId, useMemo, useRef } from 'react'
import maplibregl, { type ExpressionSpecification, type GeoJSONSource, type MapLayerMouseEvent, type Map as MlMap } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import type { FacilityListItem } from '@/api/facility'
import type { SelectedCctv } from '@/features/shared/map/CctvMarkersML'
import { CCTV_MAP } from '@/shared/styles/palette'
import { badgeOffsets } from './badgeLayout'
import { openClusterList, type ListLeaf } from './clusterList'

const CLUSTER_RADIUS = 20
const CLUSTER_MAX_ZOOM = 12
const CLUSTER_MIN_POINTS = 3
/** 이 개수보다 많이 묶였으면 누를 때 한 단계 확대, 아니면 목록 */
const CLUSTER_LIST_MAX = 6
/** 고른 게 있을 때 나머지 진하기 */
const DIM = 0.5
/** 재생 중 물방울 높이 — 영상 창 윗변 기준 */
const PIN_HEIGHT = 30

interface Props {
  map: MlMap
  items: readonly FacilityListItem[]
  /** 오른쪽 패널에 나온 5개 */
  selected?: readonly FacilityListItem[]
  color?: string
  onSelectCctv?: (cctv: SelectedCctv) => void
  /** 바뀌면 열린 목록을 닫는다 (영상 창을 닫을 때) */
  deactivateSeq?: number
  onCloseCctv?: (cctvId: number) => void
  /** 옛 값 — 새 지도는 늘 같은 규칙으로 묶는다 */
  cluster?: boolean
  /** 주면 이 id 만 (레이어 메뉴 행정동) */
  visibleIds?: ReadonlySet<number>
  /** 잘린 지도에서 보이는 곳 가운데로 옮기는 보정 */
  cameraOffset?: [number, number]
  /** 영상이 떠 있는 CCTV */
  activeIds?: ReadonlySet<number>
}

const toFC = (items: readonly FacilityListItem[]): FeatureCollection<Point> => ({
  type: 'FeatureCollection',
  features: items.map((c) => ({
    type: 'Feature',
    properties: { id: c.id, name: c.name, cctvId: c.cctvId ?? '' },
    geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
  })),
})

const valid = (c: FacilityListItem) => Number.isFinite(c.lat) && Number.isFinite(c.lng)

/** 고른 CCTV 둘레 원 — 옛 reticle 에서 번호 상자·꺾은 줄을 뺀 것 (가운데 점은 같이 그린다) */
const ringSvg = (color: string) => `
<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
  <circle cx="28" cy="28" r="20" fill="${CCTV_MAP.reticle}" fill-opacity="0.2"/>
  <circle cx="28" cy="28" r="14" fill="${CCTV_MAP.reticle}" fill-opacity="0.4"/>
  <circle cx="28" cy="28" r="9" stroke="${CCTV_MAP.stroke}" stroke-width="1"/>
  <circle cx="28" cy="28" r="7.5" fill="${color}" stroke="${CCTV_MAP.stroke}" stroke-width="1.5"/>
</svg>`

/** 재생 중 물방울 (옛 화면과 같음) */
const PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30" fill="none" style="display:block">
  <path d="M12 30C12 30 22.5 18.5 22.5 11.25C22.5 5.31 17.8 0.75 12 0.75C6.2 0.75 1.5 5.31 1.5 11.25C1.5 18.5 12 30 12 30Z" fill="${CCTV_MAP.reticle}" stroke="${CCTV_MAP.stroke}" stroke-width="1"/>
</svg>`

/** 목록이 열린 묶음 — 아래가 뾰족한 물방울 (옛 화면과 같음) */
const clusterPinSvg = (count: number) => `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40" fill="none" style="display:block;translate:0 -20px">
  <path d="M16 40C16 40 30 24.6 30 15C30 7.27 23.73 1 16 1C8.27 1 2 7.27 2 15C2 24.6 16 40 16 40Z" fill="${CCTV_MAP.clusterBody}" fill-opacity="0.9" stroke="${CCTV_MAP.hover}" stroke-width="2.5"/>
  <text x="16" y="15" text-anchor="middle" dominant-baseline="central" fill="${CCTV_MAP.clusterText}" font-family="Roboto, system-ui, sans-serif" font-size="13" font-weight="700">${count}</text>
</svg>`

/** 묶음 숫자 그림 — 지도에 글꼴이 없어 숫자마다 그림을 그려 넣는다 */
function countImage(count: number): ImageData {
  const ratio = 2
  const size = 32 * ratio
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.scale(ratio, ratio)
  ctx.font = '700 13px Roboto, system-ui, sans-serif'
  ctx.fillStyle = CCTV_MAP.clusterText
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(count), 16, 16.5)
  return ctx.getImageData(0, 0, size, size)
}

export function CctvLayer({ map, items, selected = [], color = CCTV_MAP.point, onSelectCctv, deactivateSeq = 0, onCloseCctv, visibleIds, cameraOffset, activeIds }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const ids = useMemo(() => {
    const p = `cctv-${uid}`
    return { src: p, ring: `${p}-ring`, body: `${p}-body`, count: `${p}-count`, point: `${p}-point`, image: `${p}-n-` }
  }, [uid])

  // 이벤트 처리기에서 최신 값을 쓰려고 담아 둔다 (처리기를 다시 붙이지 않게)
  const latest = useRef({ onSelectCctv, onCloseCctv, cameraOffset, activeIds })
  useEffect(() => {
    latest.current = { onSelectCctv, onCloseCctv, cameraOffset, activeIds }
  })

  // 같은 5개면 다시 만들지 않는다 — 다시 만들면 반짝인다
  const pickedKey = selected.filter(valid).slice(0, 5).map((c) => c.id).join()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const picked = useMemo(() => selected.filter(valid).slice(0, 5), [pickedKey])
  const dim = picked.length > 0

  // 레이어 — 처음 한 번. 맨 위로 (나중에 붙는 다른 레이어보다 위)
  useEffect(() => {
    map.addSource(ids.src, {
      type: 'geojson',
      data: toFC([]),
      // 올리기·목록 표시(feature-state)용 번호 — 묶음은 묶음 번호가 붙는다
      generateId: true,
      cluster: true,
      clusterRadius: CLUSTER_RADIUS,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterMinPoints: CLUSTER_MIN_POINTS,
      // 묶음이 풀린 다음 줌의 조각을 키워 쓴다 — 확대해도 이전 줌 묶음이 남지 않게 (옛 화면과 같음)
      maxzoom: CLUSTER_MAX_ZOOM + 1,
    })
    const isCluster: ExpressionSpecification = ['has', 'point_count']
    const hover: ExpressionSpecification = ['boolean', ['feature-state', 'hover'], false]
    map.addLayer({
      id: ids.ring,
      type: 'circle',
      source: ids.src,
      filter: isCluster,
      paint: { 'circle-radius': 14, 'circle-color': 'transparent', 'circle-stroke-width': 2, 'circle-stroke-color': ['case', hover, CCTV_MAP.hover, CCTV_MAP.clusterRing] },
    })
    map.addLayer({
      id: ids.body,
      type: 'circle',
      source: ids.src,
      filter: isCluster,
      paint: { 'circle-radius': 12, 'circle-color': CCTV_MAP.clusterBody, 'circle-stroke-width': 2, 'circle-stroke-color': ['case', hover, CCTV_MAP.hover, CCTV_MAP.stroke] },
    })
    map.addLayer({
      id: ids.count,
      type: 'symbol',
      source: ids.src,
      filter: isCluster,
      layout: { 'icon-image': ['concat', ids.image, ['get', 'point_count']], 'icon-allow-overlap': true, 'icon-ignore-placement': true },
    })
    map.addLayer({
      id: ids.point,
      type: 'circle',
      source: ids.src,
      filter: ['!', isCluster],
      paint: { 'circle-radius': 7.5, 'circle-color': color, 'circle-stroke-color': ['case', hover, CCTV_MAP.hover, CCTV_MAP.stroke], 'circle-stroke-width': ['case', hover, 2.25, 1.5] },
    })

    const onMissing = (e: { id: string }) => {
      if (!e.id.startsWith(ids.image) || map.hasImage(e.id)) return
      map.addImage(e.id, countImage(Number(e.id.slice(ids.image.length))), { pixelRatio: 2 })
    }
    const order = [ids.ring, ids.body, ids.count, ids.point]
    const keepOnTop = () => {
      const all = map.getLayersOrder()
      if (all.slice(-order.length).join() !== order.join()) for (const l of order) map.moveLayer(l)
    }
    map.on('styleimagemissing', onMissing)
    map.on('styledata', keepOnTop)
    return () => {
      map.off('styleimagemissing', onMissing)
      map.off('styledata', keepOnTop)
      // 지도가 먼저 사라졌으면 style 이 없다 — 어차피 같이 사라짐
      try {
        for (const l of order) if (map.getLayer(l)) map.removeLayer(l)
        if (map.getSource(ids.src)) map.removeSource(ids.src)
      } catch {
        // 무시
      }
    }
    // color 는 아래 효과가 바꾼다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ids])

  useEffect(() => {
    if (map.getLayer(ids.point)) map.setPaintProperty(ids.point, 'circle-color', color)
  }, [map, ids, color])

  // 고른 게 있으면 나머지를 흐리게. 목록이 열린 묶음은 물방울이 대신 그린다
  useEffect(() => {
    const o = dim ? DIM : 1
    const shown: ExpressionSpecification = ['case', ['boolean', ['feature-state', 'open'], false], 0, o]
    for (const l of [ids.ring, ids.body]) {
      map.setPaintProperty(l, 'circle-opacity', shown)
      map.setPaintProperty(l, 'circle-stroke-opacity', shown)
    }
    map.setPaintProperty(ids.count, 'icon-opacity', shown)
    map.setPaintProperty(ids.point, 'circle-opacity', o)
    map.setPaintProperty(ids.point, 'circle-stroke-opacity', o)
  }, [map, ids, dim])

  // 점 — 고른 것·재생 중인 것은 따로 그리므로 뺀다
  useEffect(() => {
    const apart = new Set([...picked.map((c) => c.id), ...(activeIds ?? [])])
    const rest = items.filter((c) => valid(c) && !apart.has(c.id) && (!visibleIds || visibleIds.has(c.id)))
    ;(map.getSource(ids.src) as GeoJSONSource | undefined)?.setData(toFC(rest))
  }, [map, ids, items, picked, activeIds, visibleIds])

  // 낱개·묶음 올리기·누르기, 묶음 목록
  const closeListRef = useRef<() => void>(() => {})
  useEffect(() => {
    const canvas = map.getCanvas()
    const src = () => map.getSource(ids.src) as GeoJSONSource | undefined
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
      // 이름 풍선은 낱개만
      if (f.properties?.point_count === undefined) {
        const [lng, lat] = (f.geometry as Point).coordinates
        tip.setText(String(f.properties?.name ?? '')).setLngLat([lng, lat]).addTo(map)
      }
    }
    const onLeave = () => {
      canvas.style.cursor = ''
      unhover()
    }

    const pick = (c: ListLeaf) => {
      latest.current.onSelectCctv?.({ ...c, markerHeight: PIN_HEIGHT })
    }
    const onPoint = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (!f) return
      const [lng, lat] = (f.geometry as Point).coordinates
      // 고른 마커를 보이는 곳 가운데로
      map.easeTo({ center: [lng, lat], offset: latest.current.cameraOffset, duration: 400 })
      pick({ id: Number(f.properties?.id), name: String(f.properties?.name ?? ''), cctvId: String(f.properties?.cctvId ?? '') || undefined, lng, lat })
    }

    // 목록이 열린 묶음 — 물방울 하나
    let open: { id: number; pin: maplibregl.Marker; close: () => void } | null = null
    const closeList = () => {
      if (!open) return
      const o = open
      open = null
      o.close()
      o.pin.remove()
      map.setFeatureState({ source: ids.src, id: o.id }, { open: false })
    }
    closeListRef.current = closeList
    const onCluster = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (!f) return
      const id = Number(f.properties?.cluster_id)
      const count = Number(f.properties?.point_count)
      const at = (f.geometry as Point).coordinates as [number, number]
      const offset = latest.current.cameraOffset
      if (count > CLUSTER_LIST_MAX) {
        map.easeTo({ center: at, zoom: map.getZoom() + 1, offset })
        return
      }
      map.easeTo({ center: at, offset, duration: 400 })
      src()
        ?.getClusterLeaves(id, count, 0)
        .then((leaves) => {
          closeList()
          const el = document.createElement('div')
          el.innerHTML = clusterPinSvg(count)
          const pin = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(at).addTo(map)
          map.setFeatureState({ source: ids.src, id }, { open: true })
          const close = openClusterList(map, {
            at,
            leaves: leaves.map((l) => {
              const [lng, lat] = (l.geometry as Point).coordinates
              return { id: Number(l.properties?.id), name: String(l.properties?.name ?? ''), cctvId: String(l.properties?.cctvId ?? '') || undefined, lng, lat }
            }),
            playing: latest.current.activeIds ?? new Set(),
            onPick: (leaf) => {
              // 영상 창으로 바꾼다 — 물방울은 그 CCTV 가 맡는다
              if (open) open.close = () => {}
              closeList()
              pick(leaf)
            },
            onClose: () => {
              if (open) open.close = () => {}
              closeList()
            },
          })
          open = { id, pin, close }
        })
        .catch(() => {})
    }

    for (const l of [ids.point, ids.body]) {
      map.on('mousemove', l, onMove)
      map.on('mouseleave', l, onLeave)
    }
    map.on('click', ids.point, onPoint)
    map.on('click', ids.body, onCluster)
    return () => {
      for (const l of [ids.point, ids.body]) {
        map.off('mousemove', l, onMove)
        map.off('mouseleave', l, onLeave)
      }
      map.off('click', ids.point, onPoint)
      map.off('click', ids.body, onCluster)
      closeList()
      tip.remove()
      try {
        canvas.style.cursor = ''
      } catch {
        // 무시
      }
    }
  }, [map, ids])

  // 영상 창을 닫으면 열린 목록도 닫는다 (처음 값은 건너뜀)
  const firstSeq = useRef(deactivateSeq)
  useEffect(() => {
    if (deactivateSeq !== firstSeq.current) closeListRef.current()
  }, [deactivateSeq])

  // 재생 중 물방울 — 한 번 더 누르면 영상 창 닫기
  useEffect(() => {
    const pins = [...(activeIds ?? [])].flatMap((id) => {
      const c = items.find((x) => x.id === id)
      if (!c || !valid(c)) return []
      const el = document.createElement('div')
      el.innerHTML = PIN_SVG
      el.style.cursor = 'pointer'
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        latest.current.onCloseCctv?.(id)
      })
      return [new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([c.lng, c.lat]).addTo(map)]
    })
    return () => pins.forEach((p) => p.remove())
  }, [map, items, activeIds])

  // 고른 5개 — 둘레 원은 자기 자리, 번호 상자는 겹치면 n각형 꼭짓점으로 (badgeLayout)
  useEffect(() => {
    if (picked.length === 0) return
    const rows = picked.map((c, i) => {
      const ringEl = document.createElement('div')
      ringEl.className = 'pointer-events-none animate-blink-twice'
      ringEl.innerHTML = ringSvg(color)
      // 다른 마커보다 위 — 번호 상자가 둘레 원보다 위
      ringEl.style.zIndex = '10'
      const ring = new maplibregl.Marker({ element: ringEl, anchor: 'center' }).setLngLat([c.lng, c.lat]).addTo(map)

      const badgeEl = document.createElement('div')
      badgeEl.className = 'pointer-events-none size-0 animate-blink-twice'
      badgeEl.style.zIndex = '11'
      // 꺾은 줄 — 둘레 가운데 원(9)에서 번호 상자 쪽으로
      const line = document.createElement('div')
      line.className = 'absolute top-0 left-0 h-px origin-left bg-white'
      // 번호 상자 — 오른쪽 CCTV 칸의 번호(NumberBadge small)와 같은 크기·글씨 (수정사항 5)
      const box = document.createElement('div')
      box.className = 'absolute top-0 left-0 flex size-[18px] items-center justify-center rounded-[4px] border border-white bg-reticle'
      const num = document.createElement('span')
      num.className = 'text-center font-sans text-[15px] leading-none font-semibold text-white'
      num.textContent = String(i + 1)
      box.appendChild(num)
      badgeEl.append(line, box)
      const badge = new maplibregl.Marker({ element: badgeEl, anchor: 'center' }).setLngLat([c.lng, c.lat]).addTo(map)
      return { c, ring, badge, line, box }
    })

    let frame = 0
    const place = () => {
      frame = 0
      const offs = badgeOffsets(rows.map((r) => map.project([r.c.lng, r.c.lat])))
      rows.forEach((r, i) => {
        const { x, y } = offs[i]
        r.box.style.translate = `${x - 9}px ${y - 9}px`
        // 줄은 가운데 원 둘레(9)부터 상자 둘레(약 9) 앞까지
        const len = Math.max(0, Math.hypot(x, y) - 18)
        r.line.style.width = `${len}px`
        r.line.style.transform = `rotate(${Math.atan2(y, x)}rad) translateX(9px)`
      })
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place)
    }
    place()
    map.on('move', schedule)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      map.off('move', schedule)
      rows.forEach((r) => {
        r.ring.remove()
        r.badge.remove()
      })
    }
  }, [map, picked, color])

  return null
}
