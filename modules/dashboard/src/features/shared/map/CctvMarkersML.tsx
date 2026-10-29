// CCTV 마커 (MapLibre) — 약 1,600건.
//   건수가 많아 DOM 마커(maplibregl.Marker) 대신 GeoJSON circle 레이어로 렌더 (성능).
//   비주얼은 공통 마커(markerElement 18×18 원)와 동일: r 7.5 + 흰 stroke 1.5.
//   가까이 모인 마커는 클러스터로 묶어 개수 배지(32×32)로 표출 — 클릭 시 펼쳐짐.
//
// 사용처: 메인 지도 (MapSection).

import { useCallback, useEffect, useRef } from 'react'
import maplibregl, {
  type FilterSpecification,
  type Map as MlMap,
  type GeoJSONSource,
} from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import type { FacilityListItem } from '@/api/facility'

const SRC_ID = 'cctv-points'
const LAYER_ID = 'cctv-points'
// 클러스터 조회 전용 레이어 (투명) — 실제 그림은 DOM 배지가 담당.
//   querySourceFeatures 는 화면 밖/이전 줌의 캐시 타일까지 돌려줘서 배지가 남는다.
//   렌더된 것만 보려면 레이어 기준 queryRenderedFeatures 를 써야 한다.
const CLUSTER_LAYER_ID = 'cctv-clusters'

// 클러스터링 — 화면상 반경 30px 안의 점을 묶고, 이 줌을 넘으면 개별 마커로 펼친다.
//   반경은 미터가 아니라 화면 픽셀이라 줌마다 실거리가 달라진다 (울산 위도 기준):
//   z12 ≈ 470m / z12.74(메뉴 기본) ≈ 280m / z14 ≈ 117m / z15 ≈ 58m / z17 ≈ 15m
//   50 → 30 : 한 덩어리에 수백 개가 묶여 배지 숫자가 커지던 것을 완화 (덩어리는 늘어난다).
//   maxZoom 을 낮게 두면 확대했을 때 붙어 있는 마커들이 그대로 겹쳐 보여 17 까지 묶는다.
const CLUSTER_RADIUS = 30
const CLUSTER_MAX_ZOOM = 17
// 이 개수 이하로 묶인 클러스터는 클릭해도 더 확대하지 않고 목록을 띄운다.
const CLUSTER_LIST_MAX = 6

// hover / active 테두리 색 — Primary.
const HOVER_STROKE = '#1EA7FF'
const ACTIVE_STROKE = '#1EA7FF'

// 클러스터 배지 32×32 — 바깥 링(#1B1B1C 25%) / 본체(#B2B4B8 75% + 흰 테두리) / 개수.
const CLUSTER_BADGE_SIZE = 32
// active(물방울) 배지 높이 — 끝점 보정에 사용.
const CLUSTER_PIN_HEIGHT = 40
// reticle 의 바깥 링 지름(56 박스 안에서 40px) — 배지 크기에 맞출 때의 기준.
const RETICLE_RING_SIZE = 40

type MarkerState = 'normal' | 'hover' | 'active'

// 클러스터 배지.
//   normal/hover — 원형 (테두리 색만 교체)
//   active       — 아래가 뾰족한 물방울 (좌표는 뾰족한 끝점).
const clusterSvg = (count: number, state: MarkerState) => {
  if (state === 'active') {
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40" fill="none">
  <path d="M16 40C16 40 30 24.6 30 15C30 7.27 23.73 1 16 1C8.27 1 2 7.27 2 15C2 24.6 16 40 16 40Z"
        fill="#B2B4B8" fill-opacity="0.9" stroke="${ACTIVE_STROKE}" stroke-width="2.5"/>
  <text x="16" y="15" text-anchor="middle" dominant-baseline="central"
        fill="#1B1B1C" font-family="Roboto, system-ui, sans-serif" font-size="13" font-weight="700">${count}</text>
</svg>`
  }
  const ring =
    state === 'hover'
      ? `<circle cx="16" cy="16" r="15" stroke="${HOVER_STROKE}" stroke-width="2"/>`
      : `<circle cx="16" cy="16" r="15" stroke="#1B1B1C" stroke-opacity="0.25" stroke-width="2"/>`
  const body =
    state === 'hover'
      ? `<circle cx="16" cy="16" r="13" fill="#B2B4B8" fill-opacity="0.75" stroke="${HOVER_STROKE}" stroke-width="2"/>`
      : `<circle cx="16" cy="16" r="13" fill="#B2B4B8" fill-opacity="0.75" stroke="white" stroke-width="2"/>`
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
  ${ring}
  ${body}
  <circle opacity="0.75" cx="16" cy="16" r="12" fill="black" fill-opacity="0.01"/>
  <text x="16" y="16" text-anchor="middle" dominant-baseline="central"
        fill="#1B1B1C" font-family="Roboto, system-ui, sans-serif" font-size="13" font-weight="700">${count}</text>
</svg>`
}

// 팝업 닫기 아이콘 (목록/영상 공통).
export const CLOSE_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <circle cx="10" cy="10" r="10" fill="white" fill-opacity="0.2"/>
  <path opacity="0.5" d="M12.9629 7.03906L13.335 7.41016L10.7441 10L13.335 12.5908L12.9629 12.9619L12.5918 13.334L10.001 10.7432L7.41016 13.334L6.66797 12.5918L9.25879 10L6.66797 7.40918L7.41016 6.66699L10.001 9.25684L12.5918 6.66699L12.9629 7.03906Z" fill="white"/>
</svg>`

// 닫기 아이콘 hover — 크기는 그대로(20), 원/✕ 만 밝아진다.
export const CLOSE_ICON_HOVER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <circle cx="10" cy="10" r="10" fill="white" fill-opacity="0.33"/>
  <path d="M12.9629 7.03906L13.335 7.41016L10.7441 10L13.335 12.5908L12.9629 12.9619L12.5918 13.334L10.001 10.7432L7.41016 13.334L6.66797 12.5918L9.25879 10L6.66797 7.40918L7.41016 6.66699L10.001 9.25684L12.5918 6.66699L12.9629 7.03906Z" fill="white"/>
</svg>`

// 개별 CCTV active 마커 높이 — 팝업 상단 정렬 기준.
const PIN_HEIGHT = 30

// 개별 CCTV active 마커 — 원 대신 물방울. 뾰족한 끝(아래)이 좌표에 오도록 anchor 'bottom'.
// 활성(영상 재생 중) CCTV 물방울 — 시안 지정 색.
const ACTIVE_PIN_FILL = 'rgba(137, 37, 203, 0.85)'
const ACTIVE_PIN_STROKE = '#FFF'

const pinSvg = (_fill?: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30" fill="none">
  <path d="M12 30C12 30 22.5 18.5 22.5 11.25C22.5 5.31 17.8 0.75 12 0.75C6.2 0.75 1.5 5.31 1.5 11.25C1.5 18.5 12 30 12 30Z"
        fill="${ACTIVE_PIN_FILL}" stroke="${ACTIVE_PIN_STROKE}" stroke-width="1"/>
</svg>`

// 선택된 5개 CCTV 의 투망 reticle — 56×56, 중앙(28,28)이 좌표. 우상단에 순위 배지 1~5.
//   구 Leaflet CctvMarkers 의 reticle 을 MapLibre 마커로 포팅.
//   우측 CCTV 그리드의 순번 배지(NumberBadge) 와 같은 색을 쓴다.
const RETICLE = {
  ring: 'rgba(137, 37, 203, 0.85)',
  stroke: '#FFF',
  badgeFill: 'rgba(137, 37, 203, 0.85)',
  badgeStroke: '#FFF',
  badgeText: '#FFF',
} as const

const reticleSvg = (rank: number) => `
<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8 28C8 16.9543 16.9543 8 28 8C39.0457 8 48 16.9543 48 28C48 0.0 0.0 48 28 48C16.9543 48 8 0.0 8 28Z" fill="${RETICLE.ring}" fill-opacity="0.2"/>
  <path d="M14 28C14 20.268 20.268 14 28 14C35.732 14 42 20.268 42 28C42 0.0 0.0 42 28 42C20.268 42 14 0.0 14 28Z" fill="${RETICLE.ring}" fill-opacity="0.4"/>
  <path d="M28 19C32.9706 19 37 23.0294 37 28C37 32.9706 32.9706 37 28 37C23.0294 37 19 32.9706 19 28C19 23.0294 23.0294 19 28 19Z" stroke="${RETICLE.stroke}" stroke-width="1"/>
  <path d="M44 12L34.5 21.5" stroke="${RETICLE.stroke}" stroke-width="1"/>
  <rect x="35.5" y="3.5" width="17" height="17" rx="3.5" fill="${RETICLE.badgeFill}" stroke="${RETICLE.badgeStroke}"/>
  <text x="44" y="12" text-anchor="middle" dominant-baseline="central" fill="${RETICLE.badgeText}" font-family="Roboto, system-ui, sans-serif" font-size="12" font-weight="700">${rank}</text>
</svg>`

/** 선택 5개 reticle 마커 상태 (배지 effect 의 draw 가 위치·크기를 갱신). */
interface Reticle {
  item: FacilityListItem
  marker: maplibregl.Marker
  inner: HTMLElement
  scaled: boolean
  /** 묶여 있는 클러스터 id (개별 표출이면 null). */
  clusterId: number | null
}

interface Props {
  /** 지도 instance (MapBaseML onReady 콜백에서 받음). */
  map: MlMap
  /** CCTV 목록. 빈 배열이면 레이어 비움. */
  items: readonly FacilityListItem[]
  /** 우측 패널에 표출 중인 5개 — reticle + 순위 배지로 강조. */
  selected?: readonly FacilityListItem[]
  /** 마커 색 — 범례 CCTV 색 (Neutral-300). */
  color?: string
  /** 마커 / 클러스터 목록에서 CCTV 를 고른 순간 — 부모가 영상 팝업을 띄운다. */
  onSelectCctv?: (cctv: SelectedCctv) => void
  /** 값이 바뀌면 active 마커(물방울) 해제 — 영상 팝업을 닫을 때 부모가 올린다. */
  deactivateSeq?: number
  /** active 마커를 한 번 더 눌러 해제한 순간 — 부모가 그 CCTV 팝업을 닫는다. */
  onCloseCctv?: (cctvId: number) => void
  /** 클러스터링 여부 — 메뉴별 소수 CCTV 는 묶지 않고 낱개로 보여준다. */
  cluster?: boolean
  /** 표시할 CCTV id — 주면 items 는 그대로 두고 레이어 filter 로만 걸러낸다.
   *  items 를 바꾸면 소스가 다시 타일링되며 마커가 통째로 사라졌다 나타난다
   *  (레이어 메뉴의 행정동 체크처럼 자주 바뀌는 필터는 이쪽을 쓴다). */
  visibleIds?: ReadonlySet<number>
  /** 카메라 보정 offset [x, y] — canvas 가 잘린 화면에서 '보이는 영역' 중앙에 맞추기 위함.
   *  주지 않으면 canvas 중앙 기준(기존 동작). */
  cameraOffset?: [number, number]
  /** 영상이 재생 중인 CCTV id — 그 마커는 물방울(active) 로 유지되고, 목록에서도 다시 못 고른다. */
  activeIds?: ReadonlySet<number>
}

/** 지도에서 고른 CCTV — 영상 팝업 표출에 필요한 최소 정보. */
export interface SelectedCctv {
  id: number
  name: string
  cctvId?: string
  /** 영상 팝업을 붙일 기준 좌표 (개별 마커면 그 CCTV, 클러스터 목록에서 고르면 배지 위치). */
  lng: number
  lat: number
  /** 기준 마커 높이 — 팝업 윗변을 마커 윗변에 맞추는 데 사용. */
  markerHeight: number
}

const toFC = (items: readonly FacilityListItem[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features: items.map((c) => ({
    type: 'Feature',
    properties: {
      name: c.name,
      id: c.id,
      cctvId: c.cctvId ?? '',
    },
    geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
  })),
})

export function CctvMarkersML({
  map,
  items,
  selected = [],
  color = '#7F97AF',
  onSelectCctv,
  deactivateSeq = 0,
  onCloseCctv,
  cluster = true,
  visibleIds,
  cameraOffset,
  activeIds,
}: Props) {
  // 이벤트 핸들러가 항상 최신 보정값을 쓰도록 ref 로 참조.
  const cameraOffsetRef = useRef(cameraOffset)
  cameraOffsetRef.current = cameraOffset
  // active 물방울 마커 — 재생 중인 CCTV 마다 하나씩 (부모 activeIds 와 동기화).
  //   clusterId 가 있으면 그 CCTV 는 클러스터에 묶인 상태 → 물방울을 감추고 배지를 active 로.
  const pinsRef = useRef<
    Map<
      number,
      {
        marker: maplibregl.Marker
        lng: number
        lat: number
        clusterId: number | null
      }
    >
  >(new Map())
  // 목록 등 이벤트 핸들러에서 최신 activeIds 를 보기 위한 보관.
  const activeIdsRef = useRef<ReadonlySet<number>>(activeIds ?? new Set())
  activeIdsRef.current = activeIds ?? new Set()
  // 최신 콜백을 effect 재구독 없이 쓰기 위한 보관.
  const onSelectRef = useRef(onSelectCctv)
  onSelectRef.current = onSelectCctv
  const onCloseRef = useRef(onCloseCctv)
  onCloseRef.current = onCloseCctv
  // 소스를 다시 만들 때(cluster 전환) 비어 있지 않도록 최신 목록·표시 필터를 보관.
  const itemsRef = useRef(items)
  itemsRef.current = items
  const visibleIdsRef = useRef(visibleIds)
  visibleIdsRef.current = visibleIds

  // 원본 점 레이어 필터 — 클러스터가 아닌 점만. (재생 중 CCTV 도 숨기지 않는다:
  //   숨기면 '낱개인지 클러스터에 묶였는지' 판정을 할 수 없다. 물방울이 그 위를 덮는다.)
  //   visibleIds 가 있으면 그 id 만 (레이어 메뉴 행정동 체크). 두 조건을 여기서만 합친다 —
  //   따로 setFilter 하면 activeIds 갱신 때마다 visibleIds 필터가 지워진다.
  const applyActiveFilter = useCallback(() => {
    if (!map.getLayer(LAYER_ID)) return
    const base: FilterSpecification = ['!', ['has', 'point_count']]
    const ids = visibleIdsRef.current
    map.setFilter(
      LAYER_ID,
      ids ? ['all', base, ['in', ['get', 'id'], ['literal', [...ids]]]] : base,
    )
  }, [map])

  /** 카메라 이동 + 부모에 통보. 물방울 표시는 activeIds 동기화 effect 가 맡는다. */
  const activateCctv = useCallback(
    (cctv: SelectedCctv) => {
      // 선택한 마커를 '보이는 영역' 중앙으로 (canvas 가 잘린 화면은 offset 보정).
      map.easeTo({
        center: [cctv.lng, cctv.lat],
        offset: cameraOffsetRef.current,
        duration: 400,
      })
      onSelectRef.current?.(cctv)
    },
    [map],
  )

  // 재생 중인 CCTV → 물방울 마커. 부모가 팝업을 닫으면 여기서 같이 사라진다.
  useEffect(() => {
    const ids = activeIds ?? new Set<number>()
    const pins = pinsRef.current
    // 사라진 것 제거.
    for (const [id, p] of pins) {
      if (ids.has(id)) continue
      p.marker.remove()
      pins.delete(id)
    }
    // 새로 생긴 것 추가.
    for (const id of ids) {
      if (pins.has(id)) continue
      const item = items.find((c) => c.id === id)
      if (!item) continue
      const el = document.createElement('div')
      el.innerHTML = pinSvg(color)
      el.style.cursor = 'pointer'
      // 활성 마커를 한 번 더 누르면 영상 팝업 닫기와 동일하게 동작.
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        onCloseRef.current?.(id)
      })
      pins.set(id, {
        marker: new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([item.lng, item.lat])
          .addTo(map),
        lng: item.lng,
        lat: item.lat,
        clusterId: null,
      })
    }
    applyActiveFilter()
    // 새로 열리거나 닫히면 배지 상태(재생 포함 여부)도 다시 계산한다.
    requestDrawRef.current()
  }, [map, items, color, activeIds, applyActiveFilter])

  // unmount 시 남은 물방울 정리 (메뉴 전환 등으로 컴포넌트가 사라질 때).
  useEffect(() => {
    const pins = pinsRef.current
    return () => {
      pins.forEach((p) => p.marker.remove())
      pins.clear()
    }
  }, [])

  // 클러스터 배지 active 해제 — 배지 effect 안에서 실제 함수를 대입한다.
  const resetClusterActiveRef = useRef(() => {})
  // 우측 패널 5개 reticle — 순환으로 자주 바뀌므로 배지/팝업 effect 와 분리한다.
  //   (같이 묶으면 순환할 때마다 배지가 다시 만들어져 active 상태가 풀린다.)
  const reticlesRef = useRef<Reticle[]>([])
  // 배지 effect 의 draw 를 외부에서 부르기 위한 참조.
  const requestDrawRef = useRef(() => {})

  useEffect(() => {
    const picked = selected
      .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng))
      .slice(0, 5)
    reticlesRef.current = picked.map((c, i) => {
      const el = document.createElement('div')
      el.style.pointerEvents = 'none'
      // 다른 마커(펌프/쉼터/방송장비 등)보다 위에 — 선택 CCTV 가 가려지지 않게.
      el.style.zIndex = '10'
      // 축소는 안쪽 div 에 — 마커 root 의 transform 은 maplibre 가 위치 계산에 쓴다.
      const inner = document.createElement('div')
      inner.style.transformOrigin = 'center'
      inner.innerHTML = reticleSvg(i + 1)
      el.appendChild(inner)
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([c.lng, c.lat])
        .addTo(map)
      return { item: c, marker, inner, scaled: false, clusterId: null }
    })
    requestDrawRef.current()
    return () => {
      reticlesRef.current.forEach((r) => r.marker.remove())
      reticlesRef.current = []
    }
  }, [map, selected])

  // 부모 신호(deactivateSeq) — 열린 클러스터 목록만 닫는다.
  //   물방울(active) 은 activeIds 가 진실이라 여기서 건드리지 않는다.
  //   (전부 지우면 여러 개 재생 중일 때 하나만 닫아도 나머지가 같이 풀린다.)
  const firstDeactivate = useRef(true)
  useEffect(() => {
    if (firstDeactivate.current) {
      firstDeactivate.current = false
      return
    }
    resetClusterActiveRef.current()
  }, [deactivateSeq])
  // 소스/레이어 생성 — mount 시 1회. unmount 시 제거.
  useEffect(() => {
    if (!map.getSource(SRC_ID)) {
      map.addSource(SRC_ID, {
        type: 'geojson',
        // 빈 데이터로 만들면 cluster 전환으로 소스를 다시 만들 때 items 가 그대로라
        //   데이터 effect 가 다시 안 돌아 마커가 통째로 빈다 — 현재 목록으로 바로 채운다.
        data: toFC(itemsRef.current),
        // feature-state(hover) 를 쓰려면 피처마다 id 가 있어야 한다.
        generateId: true,
        cluster,
        clusterRadius: CLUSTER_RADIUS,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        // 타일 최대 줌 = 클러스터 해제 줌 + 1.
        //   이보다 확대하면 이 타일(클러스터 없음)을 그대로 확대해 쓰므로,
        //   높은 줌에서 이전 줌의 클러스터가 남아 보이는 문제가 없다.
        maxzoom: CLUSTER_MAX_ZOOM + 1,
      })
    }
    if (!map.getLayer(CLUSTER_LAYER_ID)) {
      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: 'circle',
        source: SRC_ID,
        filter: ['has', 'point_count'],
        // 보이지 않게 — 조회용. 반경은 배지 크기와 맞춰 hit 영역만 유지.
        paint: { 'circle-radius': CLUSTER_BADGE_SIZE / 2, 'circle-opacity': 0 },
      })
    }
    if (!map.getLayer(LAYER_ID)) {
      map.addLayer({
        id: LAYER_ID,
        type: 'circle',
        source: SRC_ID,
        // 묶이지 않은 점만 개별 마커로 — 클러스터는 DOM 배지로 그린다.
        //   (visibleIds 필터는 아래 effect 가 setFilter 로 얹는다.)
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 7.5,
          'circle-color': color,
          // hover 시 테두리 색 교체 (feature-state).
          'circle-stroke-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            HOVER_STROKE,
            '#FFFFFF',
          ],
          'circle-stroke-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            2.25,
            1.5,
          ],
        },
      })
    }
    // 레이어를 새로 만들었으면 기본 필터만 걸려 있다 — visibleIds 까지 합쳐 다시 건다.
    applyActiveFilter()
    return () => {
      // 부모(MapBaseML) 가 먼저 map.remove() 한 뒤 이 cleanup 이 돌면 style 이 없어
      //   getLayer 에서 throw — 어차피 지도째 사라지므로 무시. (PumpRegionPolygons 와 동일 처리)
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
        if (map.getLayer(CLUSTER_LAYER_ID)) map.removeLayer(CLUSTER_LAYER_ID)
        if (map.getSource(SRC_ID)) map.removeSource(SRC_ID)
      } catch {
        // map 이 이미 removed — 무시.
      }
    }
  }, [map, color, cluster, applyActiveFilter])

  // 데이터 갱신.
  useEffect(() => {
    const src = map.getSource(SRC_ID) as GeoJSONSource | undefined
    src?.setData(toFC(items))
  }, [map, items])

  // 표시 필터 — visibleIds 가 있으면 그 id 만 그린다.
  //   items 를 갈아끼우지 않으므로 소스 재타일링이 없고, 마커가 깜빡이지 않는다.
  useEffect(() => {
    applyActiveFilter()
  }, [visibleIds, applyActiveFilter])

  // 클러스터 배지 + 선택 reticle — 한 번의 프레임에서 같이 갱신.
  //   · 배지는 개수 텍스트가 필요해 DOM 마커로 그린다 (style 에 glyphs 가 없어 symbol 텍스트 불가).
  //   · 이동/줌 중에도 따라오도록 'move' 에 붙이되, rAF 로 프레임당 1회만 계산한다.
  //   · 마커는 재사용 — 매 프레임 DOM 을 새로 만들면 렌더가 밀린다.
  useEffect(() => {
    const badges = new Map<
      number,
      { marker: maplibregl.Marker; count: number; state: MarkerState }
    >()
    // 목록 팝업이 열린 클러스터 = active. 하나만 유지.
    let activeClusterId: number | null = null
    // 배지 다시 그리기 — 물방울(active) 은 끝점이 좌표라 anchor 도 같이 바꾼다.
    const paintBadge = (id: number) => {
      const b = badges.get(id)
      if (!b) return
      const el = b.marker.getElement()
      el.innerHTML = clusterSvg(b.count, b.state)
      // 마커 anchor 는 'center' 고정(원형 기준). active 물방울은 뾰족한 끝이 좌표여야 하므로
      //   높이의 절반만큼 위로 올려 끝점을 좌표에 맞춘다.
      const svg = el.firstElementChild as HTMLElement | null
      if (svg) {
        svg.style.display = 'block'
        svg.style.transform =
          b.state === 'active' ? `translateY(-${CLUSTER_PIN_HEIGHT / 2}px)` : ''
      }
    }

    // 현재 화면의 클러스터 id → 좌표. draw 때마다 새로 채운다.
    const clusterPos = new Map<number, [number, number]>()
    // 소속 판정 중복 실행 방지 (비동기라 결과 오기 전 재요청 방지).
    const resolving = new Set<number>()
    // 판정이 끝나면 그 결과를 화면에 반영하기 위해 다시 그린다 (아래에서 실제 함수 대입).
    let requestDraw = () => {}

    // 이 CCTV 가 실제로 어느 클러스터에 들어갔는지 — 화면상 가까운 후보부터 구성원 확인.
    //   (reticle / 재생 중 물방울이 같은 판정을 쓴다.)
    const resolveClusterOf = (
      cctvId: number,
      lng: number,
      lat: number,
      apply: (clusterId: number | null) => void,
    ) => {
      if (resolving.has(cctvId)) return
      const src = map.getSource(SRC_ID) as GeoJSONSource | undefined
      if (!src) return
      const p = map.project([lng, lat])
      const candidates = [...clusterPos.entries()]
        .map(([id, at]) => {
          const q = map.project(at)
          return { id, d: Math.hypot(p.x - q.x, p.y - q.y) }
        })
        .filter((c) => c.d <= CLUSTER_RADIUS * 2)
        .sort((a, b) => a.d - b.d)
        .slice(0, 4)
      if (candidates.length === 0) return
      resolving.add(cctvId)
      Promise.all(
        candidates.map((c) =>
          src
            .getClusterLeaves(c.id, Infinity, 0)
            .then((leaves) => ({
              id: c.id,
              hit: leaves.some((l) => l.properties?.id === cctvId),
            }))
            .catch(() => ({ id: c.id, hit: false })),
        ),
      )
        .then((res) => {
          const found = res.find((x) => x.hit)
          apply(found ? found.id : null)
        })
        .finally(() => resolving.delete(cctvId))
    }

    const resolveCluster = (r: Reticle) => {
      if (resolving.has(r.item.id)) return
      const src = map.getSource(SRC_ID) as GeoJSONSource | undefined
      if (!src) return
      const p = map.project([r.item.lng, r.item.lat])
      const candidates = [...clusterPos.entries()]
        .map(([id, at]) => {
          const q = map.project(at)
          return { id, d: Math.hypot(p.x - q.x, p.y - q.y) }
        })
        .filter((c) => c.d <= CLUSTER_RADIUS * 2)
        .sort((a, b) => a.d - b.d)
        .slice(0, 4)
      if (candidates.length === 0) return
      resolving.add(r.item.id)
      Promise.all(
        candidates.map((c) =>
          src
            .getClusterLeaves(c.id, Infinity, 0)
            .then((leaves) => ({
              id: c.id,
              hit: leaves.some((l) => l.properties?.id === r.item.id),
            }))
            .catch(() => ({ id: c.id, hit: false })),
        ),
      )
        .then((res) => {
          const found = res.find((x) => x.hit)
          const next = found ? found.id : null
          if (next === r.clusterId) return
          r.clusterId = next
          requestDraw()
        })
        .finally(() => resolving.delete(r.item.id))
    }

    // 목록 행 hover 툴팁 — 이름이 잘린 행에서만. 목록 스크롤 영역에 잘리지 않도록 body 에 붙인다.
    let rowTip: HTMLElement | null = null
    const hideRowTip = () => {
      rowTip?.remove()
      rowTip = null
    }
    const showRowTip = (row: HTMLElement, text: string) => {
      hideRowTip()
      const el = document.createElement('div')
      el.className = 'cctv-row-tip'
      el.textContent = text
      document.body.appendChild(el)
      const r = row.getBoundingClientRect()
      const t = el.getBoundingClientRect()
      el.style.left = `${Math.max(4, r.left)}px`
      el.style.top = `${r.top - t.height - 6}px`
      rowTip = el
    }

    // 클러스터 목록 팝업 — 한 번에 하나만.
    let popup: maplibregl.Popup | null = null
    // keepActive — 목록에서 CCTV 를 골라 영상 팝업으로 바꿀 때. 배지는 active 로 둔다.
    const closeList = (keepActive = false) => {
      // remove() 가 'close' 이벤트를 동기로 발생시키므로, 참조를 먼저 끊어
      //   close 핸들러가 다시 closeList() 를 부르지 않게 한다 (keepActive 가 무시되는 문제).
      hideRowTip()
      const p = popup
      popup = null
      p?.remove()
      if (!keepActive && activeClusterId !== null) {
        const prev = activeClusterId
        activeClusterId = null
        const b = badges.get(prev)
        if (b) {
          b.state = 'normal'
          paintBadge(prev)
        }
        // 이 클러스터 안에 재생 중인 CCTV 가 있으면 다시 active 로 돌려놔야 한다.
        requestDraw()
      }
    }
    const showList = (id: number, count: number, at: [number, number]) => {
      const src = map.getSource(SRC_ID) as GeoJSONSource | undefined
      if (!src) return
      src
        .getClusterLeaves(id, count, 0)
        .then((leaves) => {
          closeList()
          activeClusterId = id
          const b = badges.get(id)
          if (b) {
            b.state = 'active'
            paintBadge(id)
          }
          // ── 목록 박스 (시안) — W 280, padding 12, gap 8, radius 12, border Primary.
          const box = document.createElement('div')
          box.style.cssText =
            'display:flex;width:280px;padding:12px;flex-direction:column;' +
            'align-items:flex-start;gap:8px;'

          // 헤더 — 우측 닫기 버튼만.
          const header = document.createElement('div')
          header.style.cssText =
            'display:flex;justify-content:flex-end;align-items:center;gap:8px;align-self:stretch;'
          const closeBtn = document.createElement('button')
          closeBtn.type = 'button'
          closeBtn.setAttribute('aria-label', '닫기')
          closeBtn.innerHTML = CLOSE_ICON_SVG
          closeBtn.style.cssText =
            'display:flex;width:20px;height:20px;padding:0;border:none;background:none;cursor:pointer;'
          closeBtn.addEventListener('click', (ev) => {
            ev.stopPropagation()
            closeList()
          })
          header.appendChild(closeBtn)
          box.appendChild(header)

          // 이름이 잘린 행 — 부착 후 판정해 hover 툴팁 연결.
          const truncCandidates: {
            row: HTMLElement
            text: HTMLElement
            fullName: string
          }[] = []

          // 항목 영역 — 위에서부터 채우고 높이는 내용만큼 (최대 192 = 6개).
          const listEl = document.createElement('div')
          listEl.style.cssText =
            'display:flex;max-height:192px;flex-direction:column;' +
            'justify-content:flex-start;align-items:center;align-self:stretch;'
          leaves.forEach((f, i) => {
            const leafId = Number(f.properties?.id ?? 0)
            // 이미 재생 중이면 활성 표시 + 다시 고를 수 없게.
            const playing = activeIdsRef.current.has(leafId)
            const row = document.createElement('div')
            row.className = playing
              ? 'cctv-cluster-row is-playing'
              : 'cctv-cluster-row'
            if (!playing)
              row.addEventListener('click', () => {
                closeList(true)
                const [lngLeaf, latLeaf] = (
                  f.geometry as GeoJSON.Point
                ).coordinates
                onSelectRef.current?.({
                  id: leafId,
                  name: String(f.properties?.name ?? ''),
                  cctvId: String(f.properties?.cctvId ?? '') || undefined,
                  // 팝업 기준점은 그 CCTV 의 실제 좌표 —
                  //   클러스터 배지 좌표로 두면 줌을 바꿔 클러스터가 흩어져도 팝업만 남는다.
                  lng: lngLeaf,
                  lat: latLeaf,
                  markerHeight: PIN_HEIGHT,
                })
              })
            // 순번 — Primary 색 텍스트 (배지 없음).
            const index = document.createElement('span')
            index.className = 'cctv-cluster-row-index'
            index.textContent = String(i + 1)
            // 이름 — 넘치면 말줄임.
            const fullName = String(f.properties?.name ?? '')
            const text = document.createElement('span')
            text.className = 'cctv-cluster-row-name'
            text.textContent = fullName
            row.append(index, text)
            listEl.appendChild(row)
            // 잘렸는지는 레이아웃 후에만 알 수 있어 팝업 부착 뒤 판정 (아래 rAF).
            truncCandidates.push({ row, text, fullName })
          })
          box.appendChild(listEl)
          popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: true,
            // 마커 오른쪽에 붙이되 윗변을 마커 윗변에 맞춤.
            //   anchor 'top-left' = 팝업의 좌상단이 기준점.
            //   목록이 열린 클러스터는 active(물방울, 높이 40, 끝점이 좌표) 라서
            //   마커 윗변 = 좌표 - 40. 그 지점을 기준으로 오른쪽으로 띄운다.
            anchor: 'top-left',
            offset: [CLUSTER_BADGE_SIZE / 2 + 8, -CLUSTER_PIN_HEIGHT],
            className: 'cctv-cluster-popup',
            maxWidth: 'none',
          })
            .setLngLat(at)
            .setDOMContent(box)
            .addTo(map)
          popup.on('close', () => {
            // 지도 클릭 등으로 닫힌 경우 — 배지도 원래대로.
            if (!popup) return
            popup = null
            closeList()
          })

          // 부착 후 실제 폭으로 잘림 판정 → 잘린 행만 hover 시 전체 이름 툴팁.
          requestAnimationFrame(() => {
            for (const c of truncCandidates) {
              if (c.text.scrollWidth <= c.text.clientWidth) continue
              c.row.addEventListener('mouseenter', () => showRowTip(c.row, c.fullName))
              c.row.addEventListener('mouseleave', hideRowTip)
            }
          })
        })
        .catch(() => {})
    }

    let frame = 0
    const draw = () => {
      frame = 0
      if (!map.getLayer(LAYER_ID)) return

      // 1) 클러스터 배지 — 보이는 것만 유지/갱신.
      const alive = new Set<number>()
      clusterPos.clear()
      for (const f of map.queryRenderedFeatures({
        layers: [CLUSTER_LAYER_ID],
      })) {
        const id = f.properties?.cluster_id as number
        if (id === undefined || alive.has(id)) continue
        alive.add(id)
        const count = f.properties?.point_count as number
        const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates
        clusterPos.set(id, [lng, lat])

        const existing = badges.get(id)
        if (existing) {
          existing.marker.setLngLat([lng, lat])
          const state: MarkerState =
            activeClusterId === id ? 'active' : existing.state === 'hover' ? 'hover' : 'normal'
          if (existing.count !== count || existing.state !== state) {
            existing.count = count
            existing.state = state
            paintBadge(id)
          }
          continue
        }
        const el = document.createElement('div')
        el.innerHTML = clusterSvg(count, 'normal')
        el.style.cursor = 'pointer'
        el.addEventListener('mouseenter', () => {
          const b = badges.get(id)
          if (!b || b.state === 'active') return
          b.state = 'hover'
          paintBadge(id)
        })
        el.addEventListener('mouseleave', () => {
          const b = badges.get(id)
          if (!b || b.state === 'active') return
          b.state = 'normal'
          paintBadge(id)
        })
        // 클릭 — 많이 묶였으면 한 단계 확대, 몇 개 안 되면 목록을 띄운다.
        el.addEventListener('click', () => {
          const at = badges.get(id)?.marker.getLngLat() ?? { lng, lat }
          const n = badges.get(id)?.count ?? count
          if (n > CLUSTER_LIST_MAX) {
            map.easeTo({
              center: at,
              zoom: map.getZoom() + 1,
              offset: cameraOffsetRef.current,
            })
            return
          }
          // 목록을 띄울 때도 그 배지를 보이는 영역 중앙으로.
          map.easeTo({
            center: at,
            offset: cameraOffsetRef.current,
            duration: 400,
          })
          showList(id, n, [at.lng, at.lat])
        })
        badges.set(id, {
          count,
          state: 'normal',
          marker: new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([lng, lat])
            .addTo(map),
        })
      }
      // 소스가 아직 클러스터를 다시 계산 중이면 queryRenderedFeatures 가 빈 결과를 준다.
      //   그때 지워버리면 배지가 전부 사라졌다 다시 생겨 번쩍인다 (체크 토글·목록 교체 시).
      //   로드가 끝나면 sourcedata 에서 drawNow 가 돌아 정리된다.
      if (map.isSourceLoaded(SRC_ID)) {
        for (const [id, b] of badges) {
          if (!alive.has(id)) {
            b.marker.remove()
            badges.delete(id)
          }
        }
      }

      // 화면에 낱개로 보이는 CCTV id (클러스터에 묶이지 않은 것).
      const loose = new Set<number>()
      for (const f of map.queryRenderedFeatures({ layers: [LAYER_ID] })) {
        const id = f.properties?.id as number | undefined
        if (id !== undefined) loose.add(id)
      }

      // 2) 재생 중 CCTV — 낱개면 물방울, 클러스터에 묶였으면 그 배지를 active 로.
      const playingClusters = new Set<number>()
      for (const [id, pin] of pinsRef.current) {
        if (loose.has(id)) {
          pin.clusterId = null
        } else if (pin.clusterId === null || !clusterPos.has(pin.clusterId)) {
          resolveClusterOf(id, pin.lng, pin.lat, (clusterId) => {
            if (pin.clusterId === clusterId) return
            pin.clusterId = clusterId
            requestDraw()
          })
        }
        const inCluster =
          pin.clusterId !== null && clusterPos.has(pin.clusterId)
        // 묶여 있으면 물방울은 감추고 배지가 대신 활성 표시를 한다.
        pin.marker.getElement().style.display = inCluster ? 'none' : ''
        if (inCluster && pin.clusterId !== null)
          playingClusters.add(pin.clusterId)
      }
      // 배지 상태 재적용 — 재생 중 CCTV 를 품은 클러스터는 계속 active.
      for (const [id, b] of badges) {
        const shouldActive = activeClusterId === id || playingClusters.has(id)
        const next: MarkerState = shouldActive
          ? 'active'
          : b.state === 'hover'
            ? 'hover'
            : 'normal'
        if (b.state === next) continue
        b.state = next
        paintBadge(id)
      }

      // 3) 선택 reticle — 묶였으면 그 배지 위에 배지 크기로, 아니면 원래 자리/크기로.
      const reticles = reticlesRef.current
      if (reticles.length === 0) return
      for (const r of reticles) {
        // 개별 마커로 보이면 자기 좌표. 묶였으면 소속 클러스터 배지 좌표.
        //   소속은 화면 거리 추정이 아니라 supercluster 의 실제 구성원 목록으로 판정한다
        //   (가까운 다른 클러스터에 붙어 위치가 어긋나는 문제 방지). 판정은 비동기라
        //   결과가 올 때까지는 직전 판정을 쓰고, 확정되면 다음 draw 에서 반영된다.
        const own: [number, number] = [r.item.lng, r.item.lat]
        if (loose.has(r.item.id)) {
          r.clusterId = null
        } else if (r.clusterId === null || !clusterPos.has(r.clusterId)) {
          resolveCluster(r)
        }
        const at = r.clusterId !== null ? clusterPos.get(r.clusterId) : undefined
        r.marker.setLngLat(at ?? own)
        const scaled = at !== undefined
        if (scaled !== r.scaled) {
          r.inner.style.transform = scaled
            ? `scale(${CLUSTER_BADGE_SIZE / RETICLE_RING_SIZE})`
            : ''
          r.scaled = scaled
        }
      }
    }

    // 이동 중에는 프레임당 1회만 (rAF), 이동이 끝나거나 데이터가 바뀌면 즉시.
    //   rAF 는 탭이 백그라운드면 멈추므로, 확정 시점(moveend/sourcedata)은 직접 호출한다.
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(draw)
    }
    requestDraw = schedule
    requestDrawRef.current = schedule
    const drawNow = () => {
      if (frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
      draw()
    }
    const onData = (e: maplibregl.MapSourceDataEvent) => {
      if (e.sourceId === SRC_ID && e.isSourceLoaded) drawNow()
    }
    resetClusterActiveRef.current = () => closeList()
    map.on('move', schedule)
    map.on('moveend', drawNow)
    map.on('zoomend', drawNow)
    map.on('sourcedata', onData)
    drawNow()
    return () => {
      if (frame) cancelAnimationFrame(frame)
      map.off('move', schedule)
      map.off('moveend', drawNow)
      map.off('zoomend', drawNow)
      map.off('sourcedata', onData)
      closeList()
      badges.forEach((b) => b.marker.remove())

    }
  }, [map, color, activateCctv])

  // 개별 마커 hover / active.
  //   hover  — feature-state 로 테두리 색만 교체 (레이어 paint 표현식).
  //   active — 원 대신 물방울 마커로 교체 + 중심 이동 + 영상 팝업 통보 (activateCctv).
  useEffect(() => {
    let hoverId: number | string | undefined
    const canvas = map.getCanvas()
    // hover 툴팁 — 마커 위에 CCTV 명 전체 표시 (말줄임 없음).
    const tip = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      anchor: 'bottom',
      offset: [0, -12],
      className: 'cctv-tip-popup',
      maxWidth: 'none',
    })

    const clearHover = () => {
      tip.remove()
      if (hoverId === undefined) return
      map.setFeatureState({ source: SRC_ID, id: hoverId }, { hover: false })
      hoverId = undefined
    }

    const onMove = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (!f || f.id === undefined) return
      canvas.style.cursor = 'pointer'
      if (f.id === hoverId) return
      clearHover()
      hoverId = f.id
      map.setFeatureState({ source: SRC_ID, id: hoverId }, { hover: true })
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates
      tip.setText(String(f.properties?.name ?? '')).setLngLat([lng, lat]).addTo(map)
    }
    const onLeave = () => {
      canvas.style.cursor = ''
      clearHover()
    }
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (!f || f.id === undefined) return
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates
      activateCctv(
        {
          id: Number(f.properties?.id ?? 0),
          name: String(f.properties?.name ?? ''),
          cctvId: String(f.properties?.cctvId ?? '') || undefined,
          lng,
          lat,
          markerHeight: PIN_HEIGHT,
        },
      )
    }

    map.on('mousemove', LAYER_ID, onMove)
    map.on('mouseleave', LAYER_ID, onLeave)
    map.on('click', LAYER_ID, onClick)
    return () => {
      map.off('mousemove', LAYER_ID, onMove)
      map.off('mouseleave', LAYER_ID, onLeave)
      map.off('click', LAYER_ID, onClick)
      tip.remove()
      try {
        canvas.style.cursor = ''
      } catch {
        // map 이 이미 removed — 무시.
      }
    }
  }, [map, activateCctv])

  // 색 변경 반영.
  useEffect(() => {
    if (map.getLayer(LAYER_ID)) {
      map.setPaintProperty(LAYER_ID, 'circle-color', color)
    }
  }, [map, color])

  return null
}
