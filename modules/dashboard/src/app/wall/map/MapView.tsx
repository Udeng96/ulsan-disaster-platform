// 새 지도 본체 — 지도 엔진 띄우기, 바탕 지도 종류.
//   지도 칸은 MAP_CANVAS_W×MAP_CANVAS_H 로 고정해 그리고 부모가 오른쪽·아래를 가린다 (크기가 안 바뀌니 다시 맞추지 않는다).
//   다 뜨면 mapState.map 에 넣는다 — 마커·카메라·버튼은 그걸 받아 붙는다.
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { dash, MAP_CANVAS_W } from '../dashboard/state'
import { swapBasemap } from './basemap'
import { MAP_CANVAS_H, mapState, tileOf } from './state'

/** 울산 남구청 — 처음 자리 */
const START_CENTER: [number, number] = [129.33, 0.0]
const START_ZOOM = 14

/** 지도 엔진은 CSS 변수를 못 읽어서 값을 꺼내 준다 — 조각을 받는 동안 드러나는 바탕 = 화면 바탕 (수정사항 23) */
const screenBg = () => getComputedStyle(document.documentElement).getPropertyValue('--color-neutral-900').trim()

export function MapView() {
  const boxRef = useRef<HTMLDivElement>(null)
  const map = mapState.use((s) => s.map)
  const error = mapState.use((s) => s.error)
  const picked = mapState.use((s) => s.picked)
  // 위성은 움직임이 끝난 뒤 켜진다 (dashboard/state satellite, 수정사항 24)
  const satellite = dash.use((s) => s.satellite)
  const tile = tileOf(picked, satellite)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    // 화면을 채우는 조각을 한꺼번에 더 많이 받는다 (기본 16) — 엔진 전체 설정
    maplibregl.config.MAX_PARALLEL_IMAGE_REQUESTS = 32
    let m: maplibregl.Map
    try {
      m = new maplibregl.Map({
        container: box,
        // 바탕 지도는 아래 효과에서 깐다 — 처음엔 바탕색만
        style: { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': screenBg() } }] },
        center: START_CENTER,
        zoom: START_ZOOM,
        attributionControl: false,
      })
    } catch (e) {
      mapState.set({ error: e instanceof Error ? e.message : '지도를 띄우지 못함' })
      return
    }
    m.on('load', () => mapState.set({ map: m }))
    return () => {
      mapState.set({ map: null })
      m.remove()
    }
  }, [])

  useEffect(() => {
    if (map) return swapBasemap(map, tile)
  }, [map, tile])

  return (
    <div className="absolute top-0 left-0 bg-neutral-900" style={{ width: MAP_CANVAS_W, height: MAP_CANVAS_H }}>
      <div ref={boxRef} className="size-full" />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-900 p-5 text-center font-sans text-white/70">
          <div className="text-[18px] font-medium">지도 초기화 실패</div>
          <div className="max-w-[500px] text-[13px] text-white/50">
            WebGL 가속을 사용할 수 없는 환경입니다. (sandboxed / HW accel disabled / 비호환 브라우저)
            <br />
            브라우저 설정에서 하드웨어 가속 활성화 후 새로고침해주세요.
          </div>
          <div className="text-[11px] text-white/30">{error}</div>
        </div>
      )}
    </div>
  )
}
