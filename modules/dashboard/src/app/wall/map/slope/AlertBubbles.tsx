// 급경사지 조기경보·통계 — 지역별 발령 빈도 버블 (옛 SlopeAlertBubbles 와 같은 모양).
//   건수가 많을수록 원이 커지고 색이 위험 단계 쪽으로. 원 아래 지역명(plain).
//   지역명도 지도 엔진이 그린다 (옛 화면은 HTML 마커). 버블은 시설 점(pt-*) 아래 — 옛 화면에서 HTML 마커가 늘 위였던 것과 같게.
import { useEffect, useId, useMemo } from 'react'
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import { BUBBLE_STEPS, type AlertBubble } from '@/features/shared/map/SlopeAlertBubbles'
import { MARKER } from '@/shared/styles/palette'
import { attachLabelImages, labelImageName } from '../points/labelImage'

const RADIUS_MIN = 14
const RADIUS_MAX = 40

/** 기간 안 가장 많은 건수를 RADIUS_MAX 에 맞춘다 (넓이 비례 = 제곱근). 0건은 RADIUS_MIN */
function radiusOf(count: number, max: number): number {
  if (max <= 0 || count <= 0) return RADIUS_MIN
  return RADIUS_MIN + (RADIUS_MAX - RADIUS_MIN) * Math.sqrt(count / max)
}

const stepOf = (count: number) => [...BUBBLE_STEPS].reverse().find((s) => count >= s.min) ?? BUBBLE_STEPS[0]

export function AlertBubbles({ map, bubbles }: { map: MlMap; bubbles: readonly AlertBubble[] }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const ids = useMemo(() => ({ src: `bubble-${uid}`, circle: `bubble-${uid}-circle`, count: `bubble-${uid}-count`, label: `bubble-${uid}-label` }), [uid])

  useEffect(() => {
    map.addSource(ids.src, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
    const before = map.getLayersOrder().find((l) => l.startsWith('pt-'))
    map.addLayer(
      {
        id: ids.circle,
        type: 'circle',
        source: ids.src,
        paint: { 'circle-radius': ['get', 'radius'], 'circle-color': ['get', 'color'], 'circle-opacity': 0.6, 'circle-stroke-width': 3, 'circle-stroke-color': MARKER.stroke },
      },
      before,
    )
    map.addLayer(
      {
        id: ids.count,
        type: 'symbol',
        source: ids.src,
        layout: { 'text-field': ['get', 'label'], 'text-size': ['get', 'textSize'], 'text-allow-overlap': true },
        paint: { 'text-color': ['get', 'textColor'] },
      },
      before,
    )
    map.addLayer(
      {
        id: ids.label,
        type: 'symbol',
        source: ids.src,
        layout: {
          'icon-image': ['get', 'labelImg'],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-anchor': 'top',
          // 반지름 + 6 - 글씨 둘레 여백 2. 옛 화면은 이름표를 감싼 div 의 줄 높이만큼 3px 더 내려가 있어 그만큼 더한다 (화면 재서 맞춤)
          'icon-offset': ['get', 'labelOffset'],
        },
      },
      before,
    )
    const detach = attachLabelImages(map)
    return () => {
      detach()
      try {
        for (const l of [ids.label, ids.count, ids.circle]) if (map.getLayer(l)) map.removeLayer(l)
        if (map.getSource(ids.src)) map.removeSource(ids.src)
      } catch {
        // 지도가 먼저 사라짐
      }
    }
  }, [map, ids])

  useEffect(() => {
    const max = Math.max(...bubbles.map((b) => b.count), 0)
    const fc: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: bubbles.map((b) => {
        const step = stepOf(b.count)
        const radius = radiusOf(b.count, max)
        return {
          type: 'Feature',
          properties: {
            radius,
            // 원 크기에 맞춘 글씨 (반지름의 약 0.8배)
            textSize: Math.round(radius * 0.8),
            color: step.color,
            textColor: step.text,
            label: `${b.count}`,
            labelImg: labelImageName('plain', MARKER.stroke, b.name),
            labelOffset: [0, radius + 6 - 2 + 3],
          },
          geometry: { type: 'Point', coordinates: [b.lng, b.lat] },
        }
      }),
    }
    ;(map.getSource(ids.src) as GeoJSONSource | undefined)?.setData(fc)
  }, [map, ids, bubbles])

  return null
}
