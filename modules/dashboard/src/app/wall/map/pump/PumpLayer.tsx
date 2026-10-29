// 배수펌프장 — 배수구역 폴리곤 + 펌프장 마커 12곳 (지도 새로 만들기 4단계 5).
//   배수펌프장 메뉴: 지도가 다 기울어진 뒤 붙인다. 구역에 올리면 그 구역 펌프장 마커가 커진다
//   레이어 메뉴(배수펌프장 체크): 평면 폴리곤 + 마커, 라벨보기면 이름표(boxed)
//   마커는 수가 적어 옛 화면과 같은 HTML 그대로 (.pump-marker CSS 가 커지기를 맡음).
import { useEffect, useRef, useState } from 'react'
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import { fetchPumpStations, type PumpStation } from '@/api/pumpStation'
import { circleSvg, createLabeledCircleEl } from '@/features/shared/map/markerElement'
import { LAYER_FALLBACK } from '@/shared/styles/palette'
import { dash, MENU } from '../../dashboard/state'
import { useLayerColorMap } from '../../menus/layer/colors'
import { mapState, tileOf } from '../state'
import { PumpRegions } from './PumpRegions'

const CODE = 'PUMP_STATION'
/** 폴리곤 진하기 — 일반 지도 / 위성·지형도 (어두운 바탕) */
const OPACITY_NORMAL = 0.28
const OPACITY_DARK = 0.5

export function PumpLayer() {
  const map = mapState.use((s) => s.map)
  const pumpMenu = dash.use((s) => s.menu === MENU.pump)
  const settled = mapState.use((s) => s.settledMenu === MENU.pump)
  const inLayer = dash.use((s) => s.menu === MENU.layer && s.layerChecked[CODE] === true)
  const labelOn = dash.use((s) => s.layerLabelOn[CODE] === true)
  const tile = mapState.use((s) => s.picked)
  const satellite = dash.use((s) => s.satellite)
  const colors = useLayerColorMap()
  const [stations, setStations] = useState<readonly PumpStation[]>([])
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    fetchPumpStations()
      .then(setStations)
      .catch((err) => console.warn('[pump-stations] fetch 실패', err))
  }, [])

  const interactive = pumpMenu && settled
  if (!map || !(interactive || inLayer)) return null
  const opacity = tileOf(tile, satellite) === 'normal' ? OPACITY_NORMAL : OPACITY_DARK
  return (
    <>
      {/* 폴리곤 먼저 — 마커가 위 */}
      <PumpRegions key={interactive ? 'i' : 'f'} map={map} mode={interactive ? 'interactive' : 'flat'} fillOpacity={opacity} onHover={interactive ? setHovered : undefined} />
      <PumpMarkers
        map={map}
        stations={stations}
        color={colors[CODE] ?? LAYER_FALLBACK[CODE]}
        emphasizedRegion={interactive ? hovered : null}
        // 배수펌프장 메뉴는 이름표 없음, 레이어 메뉴는 라벨보기
        showLabels={!interactive && labelOn}
      />
    </>
  )
}

/** 메뉴용 펌프 마커 — .pump-marker > .pump-marker-content > svg (가운데 기준, 커지기 대상) */
function pumpEl(color: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'pump-marker'
  el.style.pointerEvents = 'auto'
  el.innerHTML = `<div class="pump-marker-content">${circleSvg(color)}</div>`
  return el
}

interface MarkersProps {
  map: MlMap
  stations: readonly PumpStation[]
  color: string
  emphasizedRegion: string | null
  showLabels: boolean
}

function PumpMarkers({ map, stations, color, emphasizedRegion, showLabels }: MarkersProps) {
  // 커질 수 있는 마커 (이름표 없는 것만) — 구역 이름으로 찾는다
  const zoned = useRef<{ el: HTMLDivElement; zone: string }[]>([])

  useEffect(() => {
    const list: { el: HTMLDivElement; zone: string }[] = []
    const markers = stations.flatMap((s) => {
      if (typeof s.lat !== 'number' || typeof s.lng !== 'number') return []
      if (showLabels) {
        const { element, anchor, offset } = createLabeledCircleEl(color, s.name, 'boxed')
        return [new maplibregl.Marker({ element, anchor, offset }).setLngLat([s.lng, s.lat]).addTo(map)]
      }
      const el = pumpEl(color)
      list.push({ el, zone: s.drainageZone })
      return [new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([s.lng, s.lat]).addTo(map)]
    })
    zoned.current = list
    return () => {
      markers.forEach((m) => m.remove())
      zoned.current = []
    }
  }, [map, stations, color, showLabels])

  useEffect(() => {
    for (const { el, zone } of zoned.current) el.classList.toggle('pump-marker-emphasized', emphasizedRegion !== null && zone === emphasizedRegion)
  }, [emphasizedRegion, stations, showLabels])

  return null
}
