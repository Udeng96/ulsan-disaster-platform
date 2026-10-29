// 배수구역 폴리곤 + 라벨 (MapLibre).
//   - 8개 구역 (PUMP_REGIONS 보존 좌표 + 색상)
//   - mode 'interactive' : hover 시 fill-extrusion 솟아오름 + cursor + hover event
//   - mode 'flat'        : 평면 + hover 없음 (레이어 메뉴 용도)
//   - 라벨 : 구역 이름 HTML Marker (.marker-label-content.is-plain 공유 CSS)
//
// 좌표/색상 원본: src/features/menus/pump-station/PumpRegionOverlay.tsx 의 PUMP_REGIONS
// (geojson.io 실측 boundary, .claude/rules/stability.md 보존 규칙).

import { useEffect, useRef } from 'react'
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import { PUMP_REGIONS } from '@/features/menus/pump-station/PumpRegionOverlay'

// PUMP_REGIONS.positions 는 Leaflet LatLngExpression[] 타입이지만,
// 실제 값은 [lat, lng] tuple 배열. MapLibre 헬퍼들이 인덱스로 직접 접근하므로 캐스팅.
type LatLngTuple = readonly [number, number]
function asTuples(positions: unknown): readonly LatLngTuple[] {
  return positions as readonly LatLngTuple[]
}

// hover 시 솟아오를 최대 높이 (m). 0 = 평면.
const HOVER_EXTRUDE_HEIGHT = 280
// mouseleave debounce — 작은 polygon 안정성 (커서 진동에 따른 깜빡임 방지).
const MOUSELEAVE_DEBOUNCE_MS = 350
// 폴리곤 fill 기본 opacity (일반 타일). 위성/지형도 등 어두운 배경에선 부모가 더 진하게 override.
const DEFAULT_FILL_OPACITY = 0.28

interface Props {
  map: MlMap
  /** 'interactive' : hover 동작. 'flat' : 평면 only, hover 없음. */
  mode: 'interactive' | 'flat'
  /** 외부 hover 상태 (단방향) — interactive 모드에서만 동작. 부모가 마커 강조 등 연계용. */
  onHoverRegionChange?: (regionName: string | null) => void
  /** 폴리곤 fill opacity (0~1). 미지정 시 DEFAULT_FILL_OPACITY. */
  fillOpacity?: number
}

// 라벨 위치 미세조정 (px) — 작은 polygon 은 안에 못 들어가니 약간 아래로.
const LABEL_OFFSET_BY_NAME: Record<string, [number, number]> = {
  가상시설0523: [0, 35],
  가상시설0291: [-28, 35],
  가상시설0472: [28, 35],
  가상시설0502: [0, 35],
}

// Leaflet [lat, lng] → MapLibre [lng, lat] swap.
function toMaplibreCoords(positions: readonly LatLngTuple[]): number[][] {
  return positions.map(([lat, lng]) => [lng, lat])
}

// 단순 평균 centroid (라벨 anchor). 반환: [lng, lat]
function polygonCentroid(positions: readonly LatLngTuple[]): [number, number] {
  let sumLat = 0
  let sumLng = 0
  let n = 0
  for (const [lat, lng] of positions) {
    sumLat += lat
    sumLng += lng
    n += 1
  }
  return [sumLng / n, sumLat / n]
}

function buildGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: PUMP_REGIONS.filter((r) => !r.lineOnly).map((r, i) => ({
      type: 'Feature',
      id: i,
      properties: {
        name: r.name,
        color: r.color,
        // z-fighting 회피용 stagger — 각 polygon 이 약간 다른 baseHeight 시작 (i*0.5m).
        baseHeight: i * 0.5,
        topHeight: i * 0.5 + 0.5, // 평소 두께 0.5m (시각상 평면).
      },
      geometry: {
        type: 'Polygon',
        coordinates: [toMaplibreCoords(asTuples(r.positions))],
      },
    })),
  }
}

export function PumpRegionPolygons({
  map,
  mode,
  onHoverRegionChange,
  fillOpacity = DEFAULT_FILL_OPACITY,
}: Props) {
  // 라벨 marker 들 — cleanup 용 ref.
  const labelMarkersRef = useRef<maplibregl.Marker[]>([])
  // 부모 콜백 ref — listener 안에서 최신 값 참조 (closure 회피).
  const onHoverRef = useRef<typeof onHoverRegionChange>(onHoverRegionChange)
  useEffect(() => {
    onHoverRef.current = onHoverRegionChange
  }, [onHoverRegionChange])

  // source / layers / 라벨 추가 (mode 변경 시 fill-extrusion paint 만 갱신).
  useEffect(() => {
    // GeoJSON source 추가
    map.addSource('pump-regions', {
      type: 'geojson',
      data: buildGeoJSON(),
    })

    // fill-extrusion layer (평소 두께 0.5m, hover 시 360m).
    //   mode='flat' → hover 분기 식 무시되도록 paint 가 단순 (그래도 hover state 가 false 유지)
    map.addLayer({
      id: 'pump-regions-fill',
      type: 'fill-extrusion',
      source: 'pump-regions',
      paint: {
        'fill-extrusion-color': ['get', 'color'],
        'fill-extrusion-opacity': fillOpacity,
        'fill-extrusion-base': ['get', 'baseHeight'],
        'fill-extrusion-height':
          mode === 'interactive'
            ? [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                HOVER_EXTRUDE_HEIGHT,
                ['get', 'topHeight'],
              ]
            : ['get', 'topHeight'],
        'fill-extrusion-vertical-gradient': true,
        'fill-extrusion-height-transition': { duration: 400 },
      },
    })

    // outline (line)
    map.addLayer({
      id: 'pump-regions-outline',
      type: 'line',
      source: 'pump-regions',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 2,
        'line-opacity': 0.9,
      },
    })

    // 구역 이름 라벨 — HTML Marker.
    PUMP_REGIONS.filter((r) => !r.lineOnly).forEach((r) => {
      const [lng, lat] = polygonCentroid(asTuples(r.positions))
      const offset = LABEL_OFFSET_BY_NAME[r.name] ?? [0, 0]
      const el = document.createElement('div')
      el.style.pointerEvents = 'none'
      el.innerHTML = `<div class="marker-label-content is-plain">${r.name}</div>`
      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
        offset,
      })
        .setLngLat([lng, lat])
        .addTo(map)
      labelMarkersRef.current.push(marker)
    })

    // hover 인터랙션 (interactive 모드만).
    let hoveredId: number | null = null
    let leaveTimer: ReturnType<typeof setTimeout> | null = null
    const cancelLeave = () => {
      if (leaveTimer) {
        clearTimeout(leaveTimer)
        leaveTimer = null
      }
    }

    const onMouseMove = (
      e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] },
    ) => {
      if (!e.features || e.features.length === 0) return
      cancelLeave()
      // 가장 작은 polygon (id 큰 게 면적 작음 — PUMP_REGIONS 가 area DESC 정렬) 우선.
      const sorted = [...e.features].sort(
        (a, b) => (b.id as number) - (a.id as number),
      )
      const feature = sorted[0]
      const id = feature.id as number
      if (hoveredId !== id) {
        if (hoveredId !== null) {
          map.setFeatureState(
            { source: 'pump-regions', id: hoveredId },
            { hover: false },
          )
        }
        hoveredId = id
        map.setFeatureState(
          { source: 'pump-regions', id: hoveredId },
          { hover: true },
        )
        const regionName = feature.properties?.name as string | undefined
        onHoverRef.current?.(regionName ?? null)
        map.getCanvas().style.cursor = 'pointer'
      }
    }

    const onMouseLeave = () => {
      cancelLeave()
      leaveTimer = setTimeout(() => {
        if (hoveredId !== null) {
          map.setFeatureState(
            { source: 'pump-regions', id: hoveredId },
            { hover: false },
          )
          hoveredId = null
        }
        onHoverRef.current?.(null)
        map.getCanvas().style.cursor = ''
        leaveTimer = null
      }, MOUSELEAVE_DEBOUNCE_MS)
    }

    if (mode === 'interactive') {
      map.on('mousemove', 'pump-regions-fill', onMouseMove)
      map.on('mouseleave', 'pump-regions-fill', onMouseLeave)
    }

    return () => {
      cancelLeave()
      labelMarkersRef.current.forEach((m) => m.remove())
      labelMarkersRef.current = []
      // 부모(MapBaseML) cleanup 이 먼저 실행되면 map.remove() 로 style 이 destroyed.
      // 이후 getLayer/off 등 호출 시 throw → try/catch 로 무시 (어차피 GC 됨).
      try {
        if (mode === 'interactive') {
          map.off('mousemove', 'pump-regions-fill', onMouseMove)
          map.off('mouseleave', 'pump-regions-fill', onMouseLeave)
          map.getCanvas().style.cursor = ''
        }
        if (map.getLayer('pump-regions-outline'))
          map.removeLayer('pump-regions-outline')
        if (map.getLayer('pump-regions-fill'))
          map.removeLayer('pump-regions-fill')
        if (map.getSource('pump-regions')) map.removeSource('pump-regions')
      } catch {
        // map 이 이미 removed — 무시.
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mode])

  // opacity 동적 변경 — layer 재생성 없이 paint property 만 갱신 (타일 전환 등에서 부드러움).
  useEffect(() => {
    if (!map.getLayer('pump-regions-fill')) return
    map.setPaintProperty(
      'pump-regions-fill',
      'fill-extrusion-opacity',
      fillOpacity,
    )
  }, [map, fillOpacity])

  return null
}
