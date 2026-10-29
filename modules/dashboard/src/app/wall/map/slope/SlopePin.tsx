// 급경사지에서 고른 곳 — 물방울 + 아래 이름표 (하나뿐이라 HTML, 옛 createPinEl 그대로).
//   총괄·관제는 관리지역 등급 색·등급 글자, 계측 상세는 고른 계측기 자리.
import { useEffect } from 'react'
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import { createPinEl } from '@/features/shared/map/markerElement'

interface Props {
  map: MlMap
  lng: number
  lat: number
  name: string
  color: string
  /** 물방울 안 글자 (등급) */
  inner?: string
}

export function SlopePin({ map, lng, lat, name, color, inner }: Props) {
  useEffect(() => {
    const { element, anchor, offset } = createPinEl(color, name, inner)
    const marker = new maplibregl.Marker({ element, anchor, offset }).setLngLat([lng, lat]).addTo(map)
    return () => {
      marker.remove()
    }
  }, [map, lng, lat, name, color, inner])
  return null
}
