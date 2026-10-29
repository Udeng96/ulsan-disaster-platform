// MapLibre + V-World 타일 베이스맵 — 메인 대시보드 지도 영역.
//
// 베이스맵(타일/줌/3D/지형) 만 책임. 마커는 onReady 콜백으로 map instance 받아
// 외부(부모) 가 별도 컴포넌트(PumpMarkers 등)로 add/remove.
//
// center 는 울산 남구청.

import { useCallback, useEffect, useRef, useState } from 'react'
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapControls, type TileType, type ToolId } from './MapControls'
import { TILE_URLS, TERRAIN_MAX_NATIVE_ZOOM } from './tileUrls'
import { useDistanceMeasure } from './useDistanceMeasure'
import { useAreaMeasure } from './useAreaMeasure'
import { centerStyle, edgeAttr, type MapEdge } from './edge'

// 울산 남구청 — center 기준점. MapLibre 는 [lng, lat] 순서 (Leaflet 의 [lat, lng] 반대).
const NAMGU_OFFICE: [number, number] = [129.33, 0.0]

// 기능 툴별 커스텀 커서 (14px, hotspot 좌상단 1,1). retina 대비 1x/2x PNG image-set.
const TOOL_CURSORS: Partial<Record<ToolId, string>> = {
  distance:
    "image-set(url('/cursors/distance.png') 1x, url('/cursors/demo@example.com') 2x) 1 1, crosshair",
  area:
    "image-set(url('/cursors/area.png') 1x, url('/cursors/demo@example.com') 2x) 1 1, crosshair",
  net: 'crosshair',
}
const DEFAULT_ZOOM = 14

// basemap raster source / layer 를 새로 생성 (초기 + maxzoom 그룹 변경 시).
//   terrain(OpenTopoMap) 은 zoom 17 까지만 native 제공 → maxzoom 17 로 두어
//   18+ 줌에서 overzoom(17 타일 확대)되게 한다. 그 외(V-World) 는 maxzoom 미제한.
//   maxzoom 은 source 생성 시 고정값이라, terrain ↔ 그 외 전환 시에만 재생성한다.
//
// ※ layer 순서 보존: basemap-layer 는 항상 background('bg') 바로 위 (= 폴리곤/마커 layer 아래).
//    재생성 시 그냥 addLayer 하면 stack 맨 위로 들어가서 위 layer 들(예: pump-regions-fill) 을 가림.
//    → 다른 layer 있으면 그 앞(`beforeId`) 에 삽입.
function createBasemap(map: MlMap, type: TileType) {
  if (map.getLayer('basemap-layer')) map.removeLayer('basemap-layer')
  if (map.getSource('basemap')) map.removeSource('basemap')
  map.addSource('basemap', {
    type: 'raster',
    tiles: [TILE_URLS[type]],
    tileSize: 256,
    ...(type === 'terrain' ? { maxzoom: TERRAIN_MAX_NATIVE_ZOOM } : {}),
  })
  // basemap 위에 있어야 할 첫 layer (background/basemap 제외 = 폴리곤/마커 등).
  const beforeLayer = map
    .getStyle()
    .layers.find((l) => l.id !== 'bg' && l.id !== 'basemap-layer')
  // raster-fade-duration 0 — 타일 로드 즉시 표시 (기본 300ms fade 대기 제거).
  map.addLayer(
    {
      id: 'basemap-layer',
      type: 'raster',
      source: 'basemap',
      paint: { 'raster-fade-duration': 0 },
    },
    beforeLayer?.id,
  )
}

// 이전 지도를 남긴 채 새 지도로 바꾼다 (새 화면 /v2/wall 수정사항 25).
//   새 source·layer 를 이전 지도 '아래'에 깔고, 지금 보이는 곳의 새 조각을 다 받으면 이전 것을 지운다.
//   이전 것을 먼저 지우면 받는 동안 빈 바탕이 보여 번쩍인다. 너무 오래 걸리면(KEEP_OLD_MAX_MS) 그냥 지운다.
//   빠르게 또 바꾸면 남아 있던 이전 것들은 다음 새 지도가 다 깔릴 때 같이 지운다.
const KEEP_OLD_MAX_MS = 5000
let basemapSeq = 0
function swapBasemap(map: MlMap, type: TileType): () => void {
  const layers = map.getStyle().layers
  const olds = layers.filter((l) => l.id.startsWith('basemap')).map((l) => l.id)
  const id = `basemap-${++basemapSeq}`
  map.addSource(id, {
    type: 'raster',
    tiles: [TILE_URLS[type]],
    tileSize: 256,
    ...(type === 'terrain' ? { maxzoom: TERRAIN_MAX_NATIVE_ZOOM } : {}),
  })
  // 이전 지도가 있으면 그 아래, 없으면 폴리곤·마커 등 첫 layer 아래 (createBasemap 과 같은 자리)
  const before = olds[0] ?? layers.find((l) => l.id !== 'bg')?.id
  map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-fade-duration': 0 } }, before)
  const removeOld = () => {
    for (const o of olds) {
      if (map.getLayer(o)) map.removeLayer(o)
      if (map.getSource(o)) map.removeSource(o)
    }
  }
  if (!olds.length) return () => {}
  const done = () => {
    map.off('sourcedata', onData)
    window.clearTimeout(timer)
    removeOld()
  }
  const onData = (e: maplibregl.MapSourceDataEvent) => {
    if (e.sourceId === id && map.isSourceLoaded(id)) done()
  }
  map.on('sourcedata', onData)
  const timer = window.setTimeout(done, KEEP_OLD_MAX_MS)
  return () => {
    map.off('sourcedata', onData)
    window.clearTimeout(timer)
  }
}

interface Props {
  /** 지도 load 완료 후 호출 — 부모가 map instance 받아 마커 등 추가.
   *  cleanup 시 (부모 unmount) 알아서 마커 remove. */
  onReady?: (map: MlMap) => void
  /** 현재 타일 변경 통보 — 부모가 폴리곤 opacity 등 타일별 스타일 조정용. */
  onTileTypeChange?: (next: TileType) => void
  /** 지도 영역 우측 crop 폭 — 컨트롤을 그만큼 왼쪽으로 밀어 visible 우측 고정. */
  controlsRightInset?: number
  /** 새 화면 전용 — 컨트롤 자리 고정 + translate 이동 (edge.ts) */
  controlsEdge?: MapEdge
  /** 지도가 다른 화면(상세/오버레이)으로 가려질 때 — 컨트롤/측정 숨김 + 활성 툴 초기화. */
  hideControls?: boolean
  /** 초기화 버튼 — 지도 카메라 기본값(center/zoom) 복귀 요청. */
  onResetView?: () => void
  /** 투망 툴 클릭 불가 (이벤트 투망 활성 중) — 버튼 흐리게 + 이미 켜져 있으면 해제. */
  netDisabled?: boolean
  /** 투망 지점 선택 — 지도 클릭 좌표. 툴 해제 시 null 로 통보. */
  onNetPick?: (target: { lng: number; lat: number } | null) => void
  /** 투망 툴 활성화 시점 — 부모가 주소 검색 상태를 초기화. */
  onNetActivate?: () => void
  /** 기본 타일 — 바뀔 때마다 그 타일로 (메뉴마다 기본이 다를 때). 초기화 버튼도 이 타일로 돌아간다. */
  defaultTileType?: TileType
  /** 타일이 아직 안 깔린 곳의 바탕색 — 어두운 화면에서 밝은 회색이 번쩍이지 않게 바꿀 수 있다 (새 화면 /v2/wall 수정사항 23) */
  background?: string
  /** 지도 종류를 바꿀 때 새 조각이 다 깔릴 때까지 이전 지도를 남긴다 (새 화면 /v2/wall 수정사항 25) */
  keepOldTiles?: boolean
}

export function MapBaseML({
  onReady,
  onTileTypeChange,
  controlsRightInset = 0,
  controlsEdge,
  hideControls = false,
  onResetView,
  netDisabled = false,
  onNetPick,
  onNetActivate,
  defaultTileType = 'normal',
  background = '#e9e9e9',
  keepOldTiles = false,
}: Props = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MlMap | null>(null)
  const [styleLoaded, setStyleLoaded] = useState(false)
  // WebGL init 실패 시 (sandboxed / hw accel disabled 등) error state.
  const [webglError, setWebglError] = useState<string | null>(null)
  // 활성 타일 (일반 / 위성 / 지형도) — MapControls 타일 그룹으로 교체.
  const [tileType, setTileType] = useState<TileType>(defaultTileType)
  // 기본 타일이 바뀌면(메뉴 전환) 그 타일로 — 렌더 중에 맞춘다 (effect 로 하면 옛 타일이 한 번 그려진다)
  const [lastDefault, setLastDefault] = useState(defaultTileType)
  if (lastDefault !== defaultTileType) {
    setLastDefault(defaultTileType)
    setTileType(defaultTileType)
  }
  // 타일 변경 시 부모에 통보 (controlled 아님 — 단방향 통보만).
  useEffect(() => {
    onTileTypeChange?.(tileType)
  }, [tileType, onTileTypeChange])

  // 활성 기능 툴 (거리/면적/투망) — 커서 + 측정 인터랙션 제어.
  //   툴 해제(null) 시 측정 훅 cleanup 이 선/점/라벨을 정리하므로 별도 clear 신호 불필요.
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)
  // 직전 활성 툴 — handleToolChange 가 state 갱신 전에 전/후를 비교 (투망 진입/이탈 통보).
  const activeToolRef = useRef<ToolId | null>(null)
  // 아래에서 정의되는 handleToolChange 를 위쪽 effect(지도 가림)에서 쓰기 위한 참조.
  const handleToolChangeRef = useRef<(tool: ToolId | null) => void>(() => {})
  // 거리/면적 측정 — 해당 툴 활성 + style 로드 시.
  useDistanceMeasure(mapRef, activeTool === 'distance' && styleLoaded, 0)
  useAreaMeasure(mapRef, activeTool === 'area' && styleLoaded, 0)

  // 지도가 가려지는 화면(상세/오버레이) 진입 → 활성 툴 해제 + 커서 초기화.
  //   activeTool=null 로 측정 훅 cleanup(레이어/핸들러 제거)까지 처리.
  useEffect(() => {
    if (!hideControls) return
    handleToolChangeRef.current(null)
  }, [hideControls])

  // 지도 초기화 (1회)
  useEffect(() => {
    if (!containerRef.current) return
    // 동시 타일 요청 수 ↑ (기본 16) — 화면 채우는 타일이 줄서지 않고 더 빨리 채워짐.
    // 전역 config (Map 옵션 아님). MapLibre 인스턴스 전체에 적용.
    maplibregl.config.MAX_PARALLEL_IMAGE_REQUESTS = 32
    let map: MlMap
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        // 빈 style 로 생성 후 load 에서 basemap 추가 (tileType 별 maxzoom 일관 처리 위해).
        // background layer 를 먼저 깔아 타일 로딩 전/빈 영역이 까맣게 보이지 않게 함
        // (Leaflet 의 밝은 타일 컨테이너 배경과 동일 효과). basemap 타일은 이 위에 그려짐.
        style: {
          version: 8,
          sources: {},
          layers: [
            {
              id: 'bg',
              type: 'background',
              paint: { 'background-color': '#e9e9e9' },
            },
          ],
        },
        center: NAMGU_OFFICE,
        zoom: DEFAULT_ZOOM,
        pitch: 0,
        bearing: 0,
        attributionControl: false, // 우하단 "MapLibre" attribution 숨김
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'WebGL 초기화 실패'
      console.error('[MapBaseML] WebGL init 실패:', err)
      setWebglError(msg)
      return
    }
    mapRef.current = map

    map.on('load', () => {
      // basemap 추가는 아래 tileType useEffect 가 담당 (중복 방지) → styleLoaded 만 set.
      setStyleLoaded(true)
      // 부모에 map instance 전달 (마커 등 추가용).
      onReady?.(map)
    })

    // container size 변동 시 즉시 resize.
    // width transition 제거됐으니 1회만 fire — 짧은 debounce 로 즉시 canvas 동기.
    const container = containerRef.current
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const resizeObs = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        mapRef.current?.resize()
        resizeTimer = null
      }, 30)
    })
    resizeObs.observe(container)

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeObs.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  // 바탕색 — 타일이 안 깔린 곳(로딩 중·타일 교체 중)에 보인다.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleLoaded) return
    map.setPaintProperty('bg', 'background-color', background)
  }, [background, styleLoaded])

  // 타일 적용/교체 — styleLoaded 후 + tileType 변경 시.
  //   source 를 매번 새로 만든다 — setTiles 는 URL 만 바꾸고 이미 그려진 타일 캐시는 남겨서,
  //   특정 줌에서 이전 타일(위성 등)이 새 타일 위에 그대로 남아 보이는 문제가 있다.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleLoaded) return
    if (keepOldTiles) return swapBasemap(map, tileType)
    createBasemap(map, tileType)
  }, [tileType, styleLoaded, keepOldTiles])

  // 기능 툴 활성 변경 → 지도 캔버스 커서 전환.
  //   거리 = 커스텀 자 커서 14px, hotspot 좌상단 1,1.
  //   image-set(1x PNG + 2x PNG) — retina 에서 2x 에셋으로 선명하게 (SVG 는 1x 래스터라 흐림).
  //   투망 = crosshair. 투망 진입 시 부모에 통보(주소 검색 해제), 해제 시 찍힌 지점도 정리.
  const handleToolChange = useCallback(
    (tool: ToolId | null) => {
      const prev = activeToolRef.current
      activeToolRef.current = tool
      setActiveTool(tool)
      if (prev === 'net' && tool !== 'net') onNetPick?.(null)
      if (tool === 'net' && prev !== 'net') onNetActivate?.()
      const canvas = mapRef.current?.getCanvas()
      if (!canvas) return
      canvas.style.cursor = tool ? (TOOL_CURSORS[tool] ?? '') : ''
    },
    [onNetPick, onNetActivate],
  )
  handleToolChangeRef.current = handleToolChange

  // 투망 툴 — 지도 클릭 지점을 부모에 통보 (마커 + 최근접 CCTV 5개 고정).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleLoaded || activeTool !== 'net') return
    const handleClick = (e: maplibregl.MapMouseEvent) => {
      onNetPick?.({ lng: e.lngLat.lng, lat: e.lngLat.lat })
    }
    map.on('click', handleClick)
    return () => {
      map.off('click', handleClick)
    }
  }, [activeTool, styleLoaded, onNetPick])

  // 이벤트 투망이 켜지면 지도 투망 툴은 해제 (버튼도 비활성 — MapControls disabledTools).
  useEffect(() => {
    if (netDisabled && activeTool === 'net') handleToolChange(null)
  }, [netDisabled, activeTool, handleToolChange])
  // 초기화 버튼 — 지도 카메라 기본값 복귀 + 타일 '일반' 으로.
  //   (툴 해제/측정 정리는 MapControls onToolChange(null) 경로)
  const handleReset = () => {
    setTileType(defaultTileType)
    onResetView?.()
  }

  return (
    <div
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          // canvas 렌더 전 순간 + background layer 와 동일 톤 (까만 깜빡임 방지).
          background: '#e9e9e9',
        }}
      />
      {/* 거리/면적 측정 · 투망 안내 배너 — 툴 활성 중 하단 중앙 고지. */}
      {!hideControls && activeTool !== null && activeTool !== 'reset' && (
        <div
          {...edgeAttr(controlsEdge)}
          style={{
            position: 'absolute',
            // 하단 중앙 — 상단 컨트롤과 겹치지 않게.
            bottom: '20px',
            // 지도 좁아지면(우측 crop) visible 영역 중앙으로 — 컨트롤과 동일 inset 보정.
            ...centerStyle(controlsRightInset, controlsEdge, 'left 0.4s cubic-bezier(0.33, 1, 0.68, 1) var(--map-shift-delay, 0s)'),
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '8px 16px',
            borderRadius: '99px',
            border: '1px solid #1EA7FF',
            background: 'rgba(0, 18, 41, 0.90)',
            backdropFilter: 'blur(9px)',
            WebkitBackdropFilter: 'blur(9px)',
            color: '#FFF',
            fontFamily: 'Roboto, sans-serif',
            fontSize: '13px',
            fontWeight: 500,
            lineHeight: '1',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {activeTool === 'net'
            ? '지도를 클릭하면 그 지점에서 가장 가까운 CCTV 5개가 표출됩니다'
            : '지도를 클릭해 점을 추가하고, 더블클릭으로 종료하세요 · Esc 초기화'}
        </div>
      )}
      {webglError && (
        <div
          className="flex h-full w-full flex-col items-center justify-center"
          style={{
            position: 'absolute',
            inset: 0,
            background: '#001229',
            color: 'rgba(255,255,255,0.7)',
            fontFamily: 'Roboto',
            padding: '20px',
            textAlign: 'center',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 500 }}>지도 초기화 실패</div>
          <div
            style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.5)',
              maxWidth: '500px',
            }}
          >
            WebGL 가속을 사용할 수 없는 환경입니다. (sandboxed / HW accel disabled /
            비호환 브라우저)
            <br />
            브라우저 설정에서 하드웨어 가속 활성화 후 새로고침해주세요.
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            {webglError}
          </div>
        </div>
      )}
      {/* 지도 컨트롤 — 줌 +/- + 타일 전환 (일반/위성/지형도). WebGL 에러/지도 가림 시 숨김. */}
      {!webglError && !hideControls && (
        <MapControls
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          tileType={tileType}
          onTileTypeChange={setTileType}
          rightInset={controlsRightInset}
          edge={controlsEdge}
          activeTool={activeTool}
          onToolChange={handleToolChange}
          disabledTools={netDisabled ? ['net'] : []}
          onReset={handleReset}
        />
      )}
    </div>
  )
}
