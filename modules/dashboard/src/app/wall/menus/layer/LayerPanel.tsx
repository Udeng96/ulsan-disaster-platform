// 레이어 메뉴 패널 — 목록 검색 + 레이어 줄(체크·색 점·이름·라벨보기). CCTV 는 맨 위 고정, 아래에 행정동별 트리.
//   체크·라벨보기·행정동은 대시보드 저장소(state.ts)에 두고 지도가 같이 읽는다.
//   색은 colors.ts (지도 마커·범례도 같이 씀) — 바꾼 색은 모아 두었다가 60초마다 저장.
import { memo, useMemo, useState } from 'react'
import { CCTV_LAYER, CCTV_LAYER_CODE } from '@/features/menus/layer/cctvLayer'
import { DEFAULT_RECENT_COLORS, FALLBACK_COLOR, LAYER_FALLBACK } from '@/shared/styles/palette'
import { Checkbox, leafIds, Toggle, TreeSelect, type TreeNode } from '@/shared/ui'
import { cctv, dash } from '../../dashboard/state'
import type { LayerMeta } from './api'
import { ColorPicker } from './ColorPicker'
import { layers as layerList, setLayerColor, useLayerColorMap } from './colors'
import { setLabelOn, setLayerChecked, setRegions } from './data'

function Dot({ color }: { color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="9" fill={color} className="stroke-white" strokeWidth="2" />
    </svg>
  )
}

function Bulk({ onAll, onNone }: { onAll: () => void; onNone: () => void }) {
  // 한글이 줄 위쪽에 붙어 보여 위 7 / 아래 3 으로 가운데 맞춤 (높이 22)
  const b = 'inline-flex cursor-pointer items-center justify-center rounded-md border border-white/15 bg-white/5 px-2.5 pt-[7px] pb-[3px] font-sans text-[12px] leading-none font-medium text-neutral-100'
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={b} onClick={onAll}>
        전체선택
      </button>
      <button type="button" className={b} onClick={onNone}>
        전체해제
      </button>
    </div>
  )
}

function Search({ onSubmit }: { onSubmit: (q: string) => void }) {
  const [q, setQ] = useState('')
  return (
    <div className="flex h-[76px] shrink-0 items-center justify-center self-stretch border-b border-neutral-450 bg-neutral-800 px-5">
      <div className="flex h-14 flex-[1_0_0] items-center gap-2 rounded-[99px] bg-white/10 pr-5 pl-6 backdrop-blur-[4px]">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSubmit(q)
            }
          }}
          placeholder="목록 입력"
          className="flex-1 bg-transparent font-sans text-[18px] leading-5 font-medium text-white outline-none placeholder:text-white placeholder:opacity-75"
        />
        <button type="button" aria-label="찾기" onClick={() => onSubmit(q)} className="flex size-10 shrink-0 items-center justify-center">
          <img src="/btc/btc_search_normal_24x24.svg" alt="" width={24} height={24} />
        </button>
      </div>
    </div>
  )
}

interface RowProps {
  layer: LayerMeta
  color: string
  checked: boolean
  labelOn: boolean
  /** CCTV 행정동 트리 펼침 화살표 (CCTV 만) */
  caret?: { open: boolean; toggle: () => void }
  regionIds: readonly number[]
  onPickColor: (code: string, anchor: HTMLElement) => void
}

const Row = memo(function Row({ layer, color, checked, labelOn, caret, regionIds, onPickColor }: RowProps) {
  const isCctv = layer.code === CCTV_LAYER_CODE
  return (
    <div className="flex items-center gap-2.5 self-stretch py-2.5">
      {caret ? (
        <button type="button" aria-label={caret.open ? '접기' : '펼치기'} onClick={caret.toggle} className="flex size-6 shrink-0 items-center justify-center text-[26px] leading-[26px] text-white/70">
          {caret.open ? '▾' : '▸'}
        </button>
      ) : (
        <span className="w-6 shrink-0" />
      )}
      <button type="button" aria-pressed={checked} aria-label={`${layer.name} 표시`} className="shrink-0" onClick={() => setLayerChecked(layer.code, !checked, regionIds)}>
        <Checkbox state={checked ? 'checked' : 'unchecked'} />
      </button>
      {isCctv ? (
        // CCTV 는 백엔드 레이어가 아니라 색 고정 (피커 없음)
        <span className="shrink-0">
          <Dot color={color} />
        </span>
      ) : (
        <button type="button" className="shrink-0" aria-label={`${layer.name} 색상 변경`} onClick={(e) => onPickColor(layer.code, e.currentTarget)}>
          <Dot color={color} />
        </button>
      )}
      <span className="flex-[1_0_0] text-b3 text-white">{layer.name}</span>
      {isCctv ? (
        // CCTV 는 라벨이 없어 자리만 (흐리게)
        <span className="shrink-0 text-b3 text-neutral-200 opacity-35">라벨보기</span>
      ) : (
        <>
          <Toggle on={labelOn} onChange={(v) => setLabelOn(layer.code, v)} label={`${layer.name} 라벨보기`} />
          <span className={`shrink-0 text-b3 ${labelOn ? 'text-white' : 'text-neutral-200 opacity-75'}`}>라벨보기</span>
        </>
      )}
    </div>
  )
})

export function LayerPanel() {
  const regions = cctv.use((s) => s.regions)
  const layers = layerList.use()
  const colors = useLayerColorMap()
  const checked = dash.use((s) => s.layerChecked)
  const labelOn = dash.use((s) => s.layerLabelOn)
  const regionChecked = dash.use((s) => s.cctvRegions)

  // 검색은 Enter·찾기 버튼 때만 (공백 무시, 대소문자 무시). CCTV 는 늘 맨 위.
  const [query, setQuery] = useState('')
  const shown = useMemo(() => {
    const q = query.replace(/\s/g, '').toLowerCase()
    return [CCTV_LAYER, ...(q ? layers.filter((l) => l.name.replace(/\s/g, '').toLowerCase().includes(q)) : layers)]
  }, [layers, query])

  const regionIds = useMemo(() => regions.map((r) => r.id), [regions])
  const tree = useMemo<TreeNode[]>(() => regions.map((r) => ({ id: String(r.id), label: `${r.name} (${r.count.toLocaleString()})` })), [regions])
  const treeChecked = useMemo(() => new Set([...(regionChecked ?? [])].map(String)), [regionChecked])
  const [treeOpen, setTreeOpen] = useState(false)
  const caret = useMemo(() => ({ open: treeOpen, toggle: () => setTreeOpen((v) => !v) }), [treeOpen])

  const [picker, setPicker] = useState<{ code: string; anchor: HTMLElement } | null>(null)
  const [recent, setRecent] = useState<string[]>(DEFAULT_RECENT_COLORS)
  const onPickColor = useMemo(() => (code: string, anchor: HTMLElement) => setPicker({ code, anchor }), [])

  const setAll = (on: boolean) => shown.forEach((l) => setLayerChecked(l.code, on, regionIds))
  const setAllLabels = (on: boolean) => shown.filter((l) => l.code !== CCTV_LAYER_CODE).forEach((l) => setLabelOn(l.code, on))

  return (
    <div className="flex size-full flex-col">
      <Search onSubmit={setQuery} />
      <div className="flex flex-[1_0_0] items-start gap-4 self-stretch bg-neutral-800 px-5">
        <div className="flex min-h-0 w-[430px] flex-[1_0_0] flex-col self-stretch">
          <div className="flex shrink-0 items-center gap-2 self-stretch border-b border-line-faint pt-3 pb-2">
            <Bulk onAll={() => setAll(true)} onNone={() => setAll(false)} />
            <div className="flex-1" />
            <Bulk onAll={() => setAllLabels(true)} onNone={() => setAllLabels(false)} />
          </div>
          <div className="flex min-h-0 flex-[1_0_0] flex-col items-center gap-1 self-stretch overflow-y-auto pt-3 pb-5 scroll-slim">
            {shown.map((l) => {
              const isCctv = l.code === CCTV_LAYER_CODE
              return (
                <div key={l.code} className="contents">
                  <Row
                    layer={l}
                    color={colors[l.code] ?? l.color ?? LAYER_FALLBACK[l.code] ?? FALLBACK_COLOR}
                    checked={!!checked[l.code]}
                    labelOn={!!labelOn[l.code]}
                    caret={isCctv && regions.length ? caret : undefined}
                    regionIds={regionIds}
                    onPickColor={onPickColor}
                  />
                  {isCctv && treeOpen && tree.length > 0 && (
                    <div className="flex flex-col self-stretch">
                      <TreeSelect startLevel={1} data={tree} checked={treeChecked} onToggle={(n) => setRegions(leafIds(n).map(Number), !leafIds(n).every((id) => treeChecked.has(id)))} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {picker && (
        <ColorPicker
          anchor={picker.anchor}
          initial={colors[picker.code] ?? FALLBACK_COLOR}
          recent={recent}
          onApply={(c) => {
            setLayerColor(picker.code, c)
            setRecent((p) => [c, ...p.filter((x) => x !== c)].slice(0, 6))
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}
