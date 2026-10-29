// 바탕 지도(타일) 깔기·바꾸기.
//   새 지도를 이전 지도 '아래'에 깔고, 지금 보이는 곳의 새 조각을 다 받으면 이전 것을 지운다 (수정사항 25).
//   이전 것을 먼저 지우면 받는 동안 빈 바탕이 보여 번쩍인다. 너무 오래 걸리면(KEEP_OLD_MAX_MS) 그냥 지운다.
//   source 는 매번 새로 만든다 — setTiles 는 이미 그린 조각을 남겨 특정 줌에서 이전 지도가 섞여 보인다.
import type { Map as MlMap, MapSourceDataEvent } from 'maplibre-gl'
import type { TileType } from '@/features/shared/map/MapControls'
import { TERRAIN_MAX_NATIVE_ZOOM, TILE_URLS } from '@/features/shared/map/tileUrls'

const KEEP_OLD_MAX_MS = 5000
const PREFIX = 'basemap-'
let seq = 0

/** 지도 종류를 바꾼다. 돌려준 함수는 기다리던 정리를 그만둔다 (다음에 바꿀 때 같이 지운다) */
export function swapBasemap(map: MlMap, type: TileType): () => void {
  const layers = map.getStyle().layers
  const olds = layers.filter((l) => l.id.startsWith(PREFIX)).map((l) => l.id)
  const id = `${PREFIX}${++seq}`
  map.addSource(id, {
    type: 'raster',
    tiles: [TILE_URLS[type]],
    tileSize: 256,
    // 지형도는 17 까지만 있어 그 위는 17 조각을 키운다
    ...(type === 'terrain' ? { maxzoom: TERRAIN_MAX_NATIVE_ZOOM } : {}),
  })
  // 이전 지도 아래, 없으면 바탕(bg) 바로 위 — 폴리곤·마커 레이어보다 아래
  const before = olds[0] ?? layers.find((l) => l.id !== 'bg')?.id
  // 받은 조각은 바로 보인다 (기본 0.3초 서서히 나타남 없음)
  map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-fade-duration': 0 } }, before)
  if (!olds.length) return () => {}

  const removeOld = () => {
    for (const o of olds) {
      if (map.getLayer(o)) map.removeLayer(o)
      if (map.getSource(o)) map.removeSource(o)
    }
  }
  const stop = () => {
    map.off('sourcedata', onData)
    window.clearTimeout(timer)
  }
  const onData = (e: MapSourceDataEvent) => {
    if (e.sourceId !== id || !map.isSourceLoaded(id)) return
    stop()
    removeOld()
  }
  map.on('sourcedata', onData)
  const timer = window.setTimeout(() => {
    stop()
    removeOld()
  }, KEEP_OLD_MAX_MS)
  return stop
}
