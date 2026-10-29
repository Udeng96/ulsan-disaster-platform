// 지도 버튼 (지도 종류·거리·면적·투망·초기화·확대·축소) 과 도구 안내 — 모양은 옛 MapControls 와 같다.
import { useEffect, useMemo, type ReactElement } from 'react'
import type { TileType, ToolId } from '@/features/shared/map/MapControls'
import { centerStyle, edgeAttr, edgeStyle, type MapEdge } from '@/features/shared/map/edge'
import { useAreaMeasure } from '@/features/shared/map/useAreaMeasure'
import { useDistanceMeasure } from '@/features/shared/map/useDistanceMeasure'
import { dash } from '../dashboard/state'
import { cn } from '@/shared/ui'
import { AreaIcon, DistanceIcon, NetIcon, ResetIcon, ZoomInIcon, ZoomOutIcon } from './icons'
import { mapState, tileOf } from './state'

/** 도구별 커서 (14px, 끝점 1,1). 선명하게 1x·2x 그림 */
const CURSORS: Partial<Record<ToolId, string>> = {
  distance: "image-set(url('/cursors/distance.png') 1x, url('/cursors/demo@example.com') 2x) 1 1, crosshair",
  area: "image-set(url('/cursors/area.png') 1x, url('/cursors/demo@example.com') 2x) 1 1, crosshair",
  net: 'crosshair',
}

const TILES: { id: TileType; label: string }[] = [
  { id: 'normal', label: '일반' },
  { id: 'satellite', label: '위성' },
  { id: 'terrain', label: '지형도' },
]
const TOOLS: { id: ToolId; label: string; Icon: () => ReactElement }[] = [
  { id: 'distance', label: '거리', Icon: DistanceIcon },
  { id: 'area', label: '면적', Icon: AreaIcon },
  { id: 'net', label: '투망', Icon: NetIcon },
  { id: 'reset', label: '초기화', Icon: ResetIcon },
]

/** 옛 버튼 글씨 — 한글은 시스템 글꼴로 (font-sans 의 한글 글꼴 순서와 달라 따로 적는다) */
const LABEL = 'font-[Roboto,system-ui,sans-serif] font-medium tracking-[0.22px]'
/** 세로 묶음 버튼 (44×44) — 켜진 것은 누르거나 올려도 그대로 */
const btn = (on: boolean) =>
  cn(
    'flex size-11 flex-col items-center justify-center border',
    on
      ? 'border-primary-light bg-primary-dark text-white'
      : 'border-neutral-200 bg-white text-neutral-900 hover:border-primary-light hover:text-primary active:border-primary-dark active:bg-neutral-100 active:text-primary-dark',
  )
/** 세로 묶음의 처음·끝만 둥글게 */
const corner = (i: number, n: number) => (i === 0 ? 'rounded-t-[10px]' : i === n - 1 ? 'rounded-b-[10px]' : '')

const zoomIn = () => mapState.get().map?.zoomIn()
const zoomOut = () => mapState.get().map?.zoomOut()
const pickTile = (tile: TileType) =>
  mapState.set({ picked: { tile, forSatellite: dash.get().satellite } })
const pickTool = (tool: ToolId | null) => {
  // 투망을 켜면 주소 검색은 비운다 (같은 핀을 쓰므로)
  if (tool === 'net' && mapState.get().tool !== 'net') dash.set((s) => ({ searchTarget: null, searchKey: s.searchKey + 1 }))
  mapState.set({ tool })
}
/** 초기화 — 지도 종류는 메뉴 기본으로, 검색·투망 핀을 지우고 카메라를 기본으로 */
const reset = () => {
  mapState.set({ picked: null })
  dash.set((s) => ({ searchTarget: null, netTarget: null, searchKey: s.searchKey + 1, resetSeq: s.resetSeq + 1 }))
}

interface Props {
  /** 오른쪽을 가린 폭 — 버튼을 보이는 지도 오른쪽 끝에 붙인다 */
  inset: number
  /** CCTV 접기 때 오른쪽 끝을 따라 움직임 (edge.ts) */
  edge: MapEdge
  /** 지도가 가려지는 화면(하천) — 버튼을 숨기고 켜 둔 도구를 끈다 */
  hidden: boolean
  /** 투망을 못 쓰는 때 (이벤트 투망 중, 레이어 메뉴) */
  netDisabled: boolean
}

export function Controls({ inset, edge, hidden, netDisabled }: Props) {
  const map = mapState.use((s) => s.map)
  const tool = mapState.use((s) => s.tool)
  const picked = mapState.use((s) => s.picked)
  const satellite = dash.use((s) => s.satellite)
  const tile = tileOf(picked, satellite)
  // 측정 도구는 지도를 ref 로 받는다
  const mapRef = useMemo(() => ({ current: map }), [map])
  useDistanceMeasure(mapRef, tool === 'distance', 0)
  useAreaMeasure(mapRef, tool === 'area', 0)

  // 지도가 가려지거나 투망을 못 쓰게 되면 켜 둔 도구를 끈다
  useEffect(() => {
    if (hidden || (netDisabled && tool === 'net')) mapState.set({ tool: null })
  }, [hidden, netDisabled, tool])

  useEffect(() => {
    if (!map) return
    map.getCanvas().style.cursor = tool ? (CURSORS[tool] ?? '') : ''
    // 투망을 끄면 찍은 곳도 지운다
    if (tool !== 'net') {
      if (dash.get().netTarget) dash.set({ netTarget: null })
      return
    }
    const onClick = (e: { lngLat: { lng: number; lat: number } }) => dash.set({ netTarget: { lng: e.lngLat.lng, lat: e.lngLat.lat } })
    map.on('click', onClick)
    return () => {
      map.off('click', onClick)
    }
  }, [map, tool])

  if (hidden) return null
  return (
    <>
      {/* 도구 안내 — 보이는 지도 아래 가운데 */}
      {tool && tool !== 'reset' && (
        <div
          {...edgeAttr(edge)}
          className="pointer-events-none absolute bottom-5 z-[1000] rounded-full border border-primary bg-neutral-900/90 px-4 py-2 font-sans text-[13px] leading-none font-medium whitespace-nowrap text-white backdrop-blur-[9px]"
          style={{ ...centerStyle(inset, edge, ''), transform: 'translateX(-50%)' }}
        >
          {tool === 'net' ? '지도를 클릭하면 그 지점에서 가장 가까운 CCTV 5개가 표출됩니다' : '지도를 클릭해 점을 추가하고, 더블클릭으로 종료하세요 · Esc 초기화'}
        </div>
      )}
      <div {...edgeAttr(edge)} className="absolute top-5 z-[1000] flex items-start gap-3" style={edgeStyle(inset, edge, '')}>
        {/* 지도 종류 — 하나만 켜짐 */}
        <div className="inline-flex h-10 items-center gap-0.5 rounded-lg border border-neutral-200 bg-tile-group p-[3px]">
          {TILES.map((t) => {
            const on = tile === t.id
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => pickTile(t.id)}
                className={cn(
                  'flex h-[34px] w-14 items-center justify-center rounded-[5px] border px-2.5 py-2 shadow-tile-btn',
                  on ? 'border-neutral-800 bg-neutral-700 text-white' : 'border-transparent text-neutral-900 hover:border-primary-light hover:text-primary',
                )}
              >
                <span className={cn(LABEL, 'text-[14px] leading-[18px] whitespace-nowrap')}>{t.label}</span>
              </button>
            )
          })}
        </div>
        <div className="flex flex-col gap-3">
          {/* 거리·면적·투망은 켜고 끄기, 초기화는 한 번 누름 */}
          <div className="flex flex-col">
            {TOOLS.map(({ id, label, Icon }, i) => {
              const disabled = id === 'net' && netDisabled
              return (
                <button
                  key={id}
                  type="button"
                  disabled={disabled}
                  onClick={() => (id === 'reset' ? (pickTool(null), reset()) : pickTool(tool === id ? null : id))}
                  className={cn(btn(id !== 'reset' && tool === id), corner(i, TOOLS.length), disabled && 'cursor-not-allowed opacity-40')}
                >
                  <Icon />
                  <span className={cn(LABEL, 'text-[13px] leading-none')}>{label}</span>
                </button>
              )
            })}
          </div>
          <div className="flex flex-col">
            <button type="button" onClick={zoomIn} className={cn(btn(false), corner(0, 2))}>
              <ZoomInIcon />
            </button>
            <button type="button" onClick={zoomOut} className={cn(btn(false), corner(1, 2))}>
              <ZoomOutIcon />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
