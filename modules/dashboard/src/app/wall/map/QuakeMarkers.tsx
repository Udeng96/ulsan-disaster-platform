// 지진가속도 메뉴 — 계측기 마커 (지도 새로 만들기 4단계 5). 2곳뿐이라 옛 화면과 같은 HTML 그대로.
//   같은 건물의 여러 센서는 같은 자리로 와서 자리마다 하나로 묶고 이름을 이어 붙인다. 이름표는 원 위(plain).
import { useEffect, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import { createLabeledCircleEl } from '@/features/shared/map/markerElement'
import { LAYER_FALLBACK } from '@/shared/styles/palette'
import { dash, MENU } from '../dashboard/state'
import { instrumentLabel, instrumentList } from '../menus/earthquake/api'
import { useLayerColorMap } from '../menus/layer/colors'
import { mapState } from './state'

export function QuakeMarkers() {
  const map = mapState.use((s) => s.map)
  const on = dash.use((s) => s.menu === MENU.earthquake)
  const instruments = instrumentList.use()
  const colors = useLayerColorMap()
  const color = colors.SEISMOMETER ?? LAYER_FALLBACK.SEISMOMETER

  const spots = useMemo(() => {
    const byPos = new Map<string, { name: string; lat: number; lng: number }>()
    for (const i of instruments) {
      if (!Number.isFinite(i.lat) || !Number.isFinite(i.lng)) continue
      const key = `${i.lat},${i.lng}`
      const prev = byPos.get(key)
      if (prev) prev.name = `${prev.name}, ${instrumentLabel(i)}`
      else byPos.set(key, { name: instrumentLabel(i), lat: i.lat, lng: i.lng })
    }
    return [...byPos.values()]
  }, [instruments])

  useEffect(() => {
    if (!map || !on) return
    const markers = spots.map((s) => {
      const { element, anchor, offset } = createLabeledCircleEl(color, s.name, 'plain')
      element.style.zIndex = '2'
      return new maplibregl.Marker({ element, anchor, offset }).setLngLat([s.lng, s.lat]).addTo(map)
    })
    return () => markers.forEach((m) => m.remove())
  }, [map, on, spots, color])

  return null
}
