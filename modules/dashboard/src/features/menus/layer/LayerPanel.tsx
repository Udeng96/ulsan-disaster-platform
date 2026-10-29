// 레이어 사이드 패널 — 검색 + 항목 리스트 (체크박스 + 색 dot + 라벨 + 라벨보기 토글).
//   모든 레이어 색 변경 가능 (dot 클릭 → ColorPickerPopup). 변경분은 store 가 캐시 후 polling 저장.

import { COLORS } from '@/styles/designTokens'
import { Fragment, useMemo, useRef, useState } from 'react'
import { Checkbox } from '@/components/inputs/Checkbox'
import { useLayers } from './useLayers'
import { useLayerColorMap, setLayerColor } from './layerColorStore'
import { LayerDot } from './LayerDot'
import { LabelToggle } from './LabelToggle'
import { ColorPickerPopup } from './ColorPickerPopup'
import { BulkControl } from './BulkControl'
import { CCTV_LAYER, CCTV_LAYER_CODE } from './cctvLayer'
import { TreeSelect } from '@/features/menus/disaster-alert/TreeSelect'
import { getAllLeafIds, type TreeNode } from '@/features/menus/disaster-alert/tree'

interface LayerPanelProps {
  /** CCTV 하위 트리 — 행정동 목록(이름순, '기타' 는 맨 뒤)과 건수. */
  cctvRegions?: ReadonlyArray<{ id: number; name: string; count: number }>
  /** 체크된 행정동 id. 로드 전이면 null. */
  cctvRegionChecked?: ReadonlySet<number> | null
  onCctvRegionChange?: (id: number, next: boolean) => void
  /** 항목별 체크 상태 (code → checked) — 부모 (DashboardPage) state */
  checked: Record<string, boolean>
  onCheckedChange: (code: string, next: boolean) => void
  /** 라벨보기 상태 (code → on) — 부모 state. 지도 마커 라벨 표시 여부와 sync. */
  labelOn: Record<string, boolean>
  onLabelOnChange: (code: string, next: boolean) => void
}
export function LayerPanel({
  checked,
  onCheckedChange,
  labelOn,
  onLabelOnChange,
  cctvRegions = [],
  cctvRegionChecked,
  onCctvRegionChange,
}: LayerPanelProps) {
  // CCTV 하위(동) 트리 펼침.
  const [cctvOpen, setCctvOpen] = useState(false)
  // 행정동 목록 → TreeSelect 노드 (leaf id = 행정동 id). 라벨에 건수를 붙인다.
  const cctvTree = useMemo<TreeNode[]>(
    () =>
      cctvRegions.map((r) => ({
        id: String(r.id),
        label: `${r.name} (${r.count.toLocaleString()})`,
      })),
    [cctvRegions],
  )
  // 유효 색 (override ?? 백엔드색) — dot 표시 + 피커 초기값.
  const colorMap = useLayerColorMap()
  // 컬러 피커 — 열린 레이어 code + 클릭된 dot button (anchor).
  const pickerAnchorRef = useRef<HTMLButtonElement | null>(null)
  const [pickerCode, setPickerCode] = useState<string | null>(null)
  // 최근 색상 stack
  const [recentColors, setRecentColors] = useState<string[]>([
    '#EA3654',
    '#F4A834',
    '#FFD600',
    '#45E36C',
    '#5D96FF',
    '#333596',
  ])
  // 레이어 목록 검색 — 검색 버튼 클릭 또는 Enter 키 입력 시 필터 적용 (입력 즉시 X).
  //   searchQuery   : input 의 현재 값 (typing 마다 갱신)
  //   appliedQuery  : 실제 필터링에 쓰이는 키워드 — submit (Enter / 버튼) 시점에만 update
  // 공백 제거 + lowercase 매칭 (예: "대기질 센서" / "대기질센서" 둘 다 매칭).
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const submitSearch = () => setAppliedQuery(searchQuery)
  const normalizedQuery = appliedQuery.replace(/\s/g, '').toLowerCase()
  // 백엔드 레이어 목록 (displayOrder 순) — 모듈 캐시라 메뉴 재진입 시 즉시 표출.
  //   CCTV 는 /api/layers 에 없는 항목이라 프론트에서 합성해 맨 앞에 추가 (체크박스만, 라벨 없음).
  const layers = useLayers()
  //   CCTV 는 검색/정렬 대상이 아니라 항상 맨 위 고정 — 백엔드 목록만 필터링한 뒤 앞에 붙인다.
  const filteredLayers = useMemo(() => {
    const rest = normalizedQuery
      ? layers.filter((l) =>
          l.name.replace(/\s/g, '').toLowerCase().includes(normalizedQuery),
        )
      : layers
    return [CCTV_LAYER, ...rest]
  }, [layers, normalizedQuery])
  return (
    /* h-full → 부모 (SidePanel body, H 784) 채워서 하위 flex: 1 항목 영역이 일정 높이 유지.
       필터링으로 항목이 줄어도 컨테이너 높이 그대로. */
    <div className="flex h-full w-full flex-col">
      {/* 목록 영역 — H 76, padding 0 20, items/justify-center, shrink-0, self-stretch
          border-bottom Neutral-400, bg Neutral-800 */}
      <div
        className="flex shrink-0 items-center justify-center self-stretch"
        style={{
          height: '76px',
          padding: '0 20px',
          borderBottom: `1px solid ${COLORS.neutral450}`,
          background: COLORS.neutral800,
        }}
      >
        {/* 목록 input — H 56, padding 0 20 0 24, items-center, gap 8, flex 1
            radius 99, bg white 10%, backdrop-blur 4 */}
        <div
          className="flex items-center"
          style={{
            height: '56px',
            padding: '0 20px 0 24px',
            gap: '8px',
            flex: '1 0 0',
            borderRadius: '99px',
            background: 'rgba(255, 255, 255, 0.10)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitSearch()
              }
            }}
            placeholder="목록 입력"
            className="flex-1 bg-transparent outline-none text-white placeholder:text-white placeholder:opacity-75"
            style={{
              fontFamily: 'Roboto',
              fontSize: '18px',
              fontWeight: 500,
              lineHeight: '20px',
            }}
          />
          {/* 찾기 button — 40×40 (헤더 주소 입력 찾기 button 과 동일 아이콘) */}
          <button
            type="button"
            onClick={submitSearch}
            className="flex h-10 w-10 shrink-0 items-center justify-center"
            aria-label="찾기"
          >
            <img
              src="/btc/btc_search_normal_24x24.svg"
              alt="찾기"
              width={24}
              height={24}
            />
          </button>
        </div>
      </div>

      {/* 목록 영역 — row (좌: 체크박스 영역 + 우: 스크롤바 영역), padding-left 20, items-start
          gap 16 (좌↔우 사이), flex 1, self-stretch, bg Neutral-800 */}
      <div
        className="flex items-start self-stretch"
        style={{
          padding: '0 20px',
          gap: '16px',
          flex: '1 0 0',
          background: COLORS.neutral800,
        }}
      >
        {/* 체크박스 영역 — W 430, col, padding 0 0 20 0 (top 은 헤더가 차지), items-center, gap 4, self-stretch
            14 항목 stack. 항목이 많아 영역 초과 시 세로 스크롤 (.scrollbar-custom). */}
        <div
          className="flex flex-col self-stretch"
          style={{ width: '430px', minHeight: 0, flex: '1 0 0' }}
        >
          {/* 전체선택 / 전체해제 헤더 — 아이콘 column (체크박스) + 라벨 column 각각 별도. */}
          <div
            className="flex shrink-0 items-center self-stretch"
            style={{
              padding: '12px 0 8px',
              gap: '8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* 아이콘 (체크박스) bulk control */}
            <BulkControl
              onSelectAll={() =>
                filteredLayers.forEach((l) => onCheckedChange(l.code, true))
              }
              onDeselectAll={() =>
                filteredLayers.forEach((l) => onCheckedChange(l.code, false))
              }
            />
            <div style={{ flex: 1 }} />
            {/* 라벨보기 bulk control */}
            <BulkControl
              onSelectAll={() =>
                filteredLayers
                  .filter((l) => l.code !== CCTV_LAYER_CODE)
                  .forEach((l) => onLabelOnChange(l.code, true))
              }
              onDeselectAll={() =>
                filteredLayers
                  .filter((l) => l.code !== CCTV_LAYER_CODE)
                  .forEach((l) => onLabelOnChange(l.code, false))
              }
            />
          </div>
          {/* 항목 stack — 스크롤 영역 */}
          <div
            className="scrollbar-custom flex flex-col items-center self-stretch overflow-y-auto"
            style={{
              padding: '12px 0 20px',
              gap: '4px',
              minHeight: 0,
              flex: '1 0 0',
            }}
          >
          {filteredLayers.map((layer) => {
          const isCctv = layer.code === CCTV_LAYER_CODE
          return (
          <Fragment key={layer.code}>
          {/* 한 항목 row — padding 10 0, items-center, gap 10, self-stretch */}
          <div
            className="flex items-center self-stretch"
            style={{ padding: '10px 0', gap: '10px' }}
          >
            {/* CCTV — 행정동 하위 트리 펼침 (다른 레이어는 자리만 비움) */}
            {isCctv && cctvRegions.length > 0 ? (
              <button
                type="button"
                className="layer-tree-caret shrink-0"
                onClick={() => setCctvOpen((v) => !v)}
                aria-label={cctvOpen ? '접기' : '펼치기'}
              >
                {cctvOpen ? '▾' : '▸'}
              </button>
            ) : (
              <span className="shrink-0" style={{ width: '24px' }} />
            )}
            {/* 체크박스 — 부모 state (code 별) 와 동기 */}
            <button
              type="button"
              className="shrink-0"
              onClick={() => onCheckedChange(layer.code, !checked[layer.code])}
              aria-pressed={checked[layer.code]}
            >
              <Checkbox state={checked[layer.code] ? 'checked' : 'unchecked'} />
            </button>
            {/* 색 dot — 클릭 시 컬러 피커. CCTV 는 백엔드 레이어가 아니라 색 고정 (피커 없음). */}
            {layer.code === CCTV_LAYER_CODE ? (
              <span className="shrink-0">
                <LayerDot color={layer.color} />
              </span>
            ) : (
              <button
                type="button"
                className="shrink-0"
                onClick={(e) => {
                  pickerAnchorRef.current = e.currentTarget
                  setPickerCode(layer.code)
                }}
                aria-label={`${layer.name} 색상 변경`}
              >
                <LayerDot color={colorMap[layer.code] ?? layer.color} />
              </button>
            )}
            {/* 라벨 — B3 16/500/20 white */}
            <span
              className="text-b3"
              style={{ color: COLORS.white, flex: '1 0 0' }}
            >
              {layer.name}
            </span>
            {/* 라벨보기 토글 + 텍스트 — CCTV 는 라벨 개념이 없어 비활성(자리만 유지). */}
            {layer.code === CCTV_LAYER_CODE ? (
              <span
                className="text-b3 shrink-0"
                style={{ color: COLORS.neutral200, opacity: 0.35 }}
              >
                라벨보기
              </span>
            ) : (
              <>
                <LabelToggle
                  on={labelOn[layer.code] ?? false}
                  onChange={(v) => onLabelOnChange(layer.code, v)}
                />
                <span
                  className="text-b3 shrink-0"
                  style={{
                    color: labelOn[layer.code]
                      ? COLORS.white
                      : COLORS.neutral200,
                    opacity: labelOn[layer.code] ? 1 : 0.75,
                  }}
                >
                  라벨보기
                </span>
              </>
            )}
          </div>

          {/* CCTV 하위 — 동별. 재난 예·경보 전파 대상과 같은 TreeSelect 를 그대로 쓴다.
              체크한 동만 지도에 표출하고, 하나도 안 고르면 전체. */}
          {isCctv && cctvOpen && cctvTree.length > 0 && (
            <div className="flex flex-col self-stretch">
              <TreeSelect
                startLevel={1}
                data={cctvTree}
                // TreeSelect 는 id 가 string 이라 행정동 id 를 문자열로 다룬다.
                checked={new Set([...(cctvRegionChecked ?? [])].map(String))}
                onToggle={(node) => {
                  const leafs = getAllLeafIds(node)
                  const on = leafs.every((id) =>
                    cctvRegionChecked?.has(Number(id)),
                  )
                  leafs.forEach((id) => onCctvRegionChange?.(Number(id), !on))
                }}
              />
            </div>
          )}
          </Fragment>
          )
        })}
          </div>
        </div>

        {/* (구) 우측 장식용 스크롤바 영역은 제거 — 체크박스 영역에 실제 스크롤바 (.scrollbar-custom)
            적용으로 대체. 필요 시 디자인 추후 보강. */}
      </div>

      {/* 컬러 피커 popup — dot 클릭 시 좌측 10px 떨어진 곳.
          적용 시 store 에 캐시 (setLayerColor) → dot / 마커 / 범례 즉시 반영, DB 는 polling 저장. */}
      {pickerCode !== null && (
        <ColorPickerPopup
          anchorRef={pickerAnchorRef}
          initialColor={colorMap[pickerCode] ?? '#000000'}
          recentColors={recentColors}
          onApply={(c) => {
            if (pickerCode) setLayerColor(pickerCode, c)
            setRecentColors((prev) =>
              [c, ...prev.filter((p) => p !== c)].slice(0, 6),
            )
            setPickerCode(null)
          }}
          onClose={() => setPickerCode(null)}
        />
      )}
    </div>
  )
}
