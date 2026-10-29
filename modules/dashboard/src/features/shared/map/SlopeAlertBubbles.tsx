// 급경사지 조기경보 통계 — 지역별 발령 빈도 버블 (MapLibre circle layer).
//   건수가 많을수록 원이 커지고 색이 위험 단계 쪽으로 이동한다.
//   ⚠️ 발령 통계 API 가 없어 건수는 호출처에서 주입 (기본 0).

import { useEffect } from 'react'
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import { createMarkerLabelEl } from './markerElement'

const SOURCE_ID = 'slope-alert-bubbles'
const LAYER_CIRCLE = 'slope-alert-bubbles-circle'
const LAYER_LABEL = 'slope-alert-bubbles-label'

/** 건수 구간별 반지름(px) / 색 — 정상 → 심각 팔레트. */
// 반지름은 기간 내 최대 건수를 MAX 에 맞춘 비례 스케일 (원 넓이 비례 = sqrt).
const RADIUS_MIN = 14
const RADIUS_MAX = 40

// 색은 건수 구간 고정. 밝은 색(초록·하늘·노랑) 위에는 검은 글씨가 읽힌다.
export const BUBBLE_STEPS: { min: number; color: string; text: string }[] = [
  { min: 0, color: '#45E36C', text: '#001229' },
  { min: 1, color: '#00D2E0', text: '#001229' },
  { min: 3, color: '#FFD600', text: '#001229' },
  { min: 6, color: '#FF9230', text: '#FFF' },
  { min: 10, color: '#FF4245', text: '#FFF' },
]

/** 최대 건수를 RADIUS_MAX 에 맞춘 반지름. 0건은 RADIUS_MIN. */
function radiusOf(count: number, max: number): number {
  if (max <= 0 || count <= 0) return RADIUS_MIN
  return (
    RADIUS_MIN + (RADIUS_MAX - RADIUS_MIN) * Math.sqrt(count / max)
  )
}

export interface AlertBubble {
  name: string
  lat: number
  lng: number
  /** 기간 내 발령 건수. */
  count: number
}

function stepOf(count: number) {
  return [...BUBBLE_STEPS].reverse().find((s) => count >= s.min) ?? BUBBLE_STEPS[0]
}

interface Props {
  map: MlMap
  bubbles: readonly AlertBubble[]
}

export function SlopeAlertBubbles({ map, bubbles }: Props) {
  useEffect(() => {
    const maxCount = Math.max(...bubbles.map((b) => b.count), 0)
    const data: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: bubbles.map((b) => {
        const step = stepOf(b.count)
        return {
          type: 'Feature',
          properties: {
            name: b.name,
            count: b.count,
            radius: radiusOf(b.count, maxCount),
            // 원 크기에 비례한 글씨 (반지름의 약 0.8배).
            textSize: Math.round(radiusOf(b.count, maxCount) * 0.8),
            color: step.color,
            textColor: step.text,
            label: `${b.count}`,
          },
          geometry: { type: 'Point', coordinates: [b.lng, b.lat] },
        }
      }),
    }

    map.addSource(SOURCE_ID, { type: 'geojson', data })
    map.addLayer({
      id: LAYER_CIRCLE,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['get', 'radius'],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.6,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#FFF',
      },
    })
    map.addLayer({
      id: LAYER_LABEL,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'text-field': ['get', 'label'],
        'text-size': ['get', 'textSize'],
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': ['get', 'textColor'],
      },
    })

    // 버블 아래 지역명 라벨 — 반지름만큼 내려서 원과 안 겹치게.
    const labels = bubbles.map((b) => {
      const el = document.createElement('div')
      el.style.pointerEvents = 'none'
      el.appendChild(createMarkerLabelEl(b.name, 'plain', '#FFF'))
      return new maplibregl.Marker({
        element: el,
        anchor: 'top',
        offset: [0, radiusOf(b.count, maxCount) + 6],
      })
        .setLngLat([b.lng, b.lat])
        .addTo(map)
    })

    return () => {
      labels.forEach((m) => m.remove())
      // 부모가 map.remove() 를 먼저 하면 style 이 없어 throw — 무시.
      try {
        if (map.getLayer(LAYER_LABEL)) map.removeLayer(LAYER_LABEL)
        if (map.getLayer(LAYER_CIRCLE)) map.removeLayer(LAYER_CIRCLE)
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
      } catch {
        // map 이 이미 removed — 무시.
      }
    }
  }, [map, bubbles])

  return null
}
