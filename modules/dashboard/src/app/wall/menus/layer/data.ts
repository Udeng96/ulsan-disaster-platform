// 레이어 메뉴 데이터 — 레이어 목록(/api/layers), 행정동(/api/regions), CCTV 행정동별 묶음.
import { useEffect, useMemo } from 'react'
import { fetchRegions } from './api'
import { CCTV_ETC_REGION_ID, CCTV_ETC_REGION_NAME, CCTV_LAYER_CODE } from '@/features/menus/layer/cctvLayer'
import { usePolling } from '@/shared/hooks'
import { cctv, dash, type CctvRegion } from '../../dashboard/state'

/** CCTV 를 행정동별로 센 목록 (가나다순, '기타' 맨 뒤) */
function useCctvRegions(): { regions: CctvRegion[]; named: boolean } {
  const { data: regions } = usePolling((signal) => fetchRegions(signal))
  const list = cctv.use((s) => s.list)
  const counted = useMemo(() => {
    const nameById = new Map((regions ?? []).map((r) => [r.id, r.name]))
    const by = new Map<number, number>()
    for (const c of list) {
      const id = c.regionId != null && nameById.has(c.regionId) ? c.regionId : CCTV_ETC_REGION_ID
      by.set(id, (by.get(id) ?? 0) + 1)
    }
    return [...by]
      .map(([id, count]) => ({ id, name: nameById.get(id) ?? CCTV_ETC_REGION_NAME, count }))
      .sort((a, b) => (a.id === CCTV_ETC_REGION_ID ? 1 : b.id === CCTV_ETC_REGION_ID ? -1 : a.name.localeCompare(b.name, 'ko')))
  }, [list, regions])
  return { regions: counted, named: !!regions }
}

/** 행정동 목록을 저장소에 두고, 처음 채워지면 전부 체크로 시작 (옛 화면과 같음). 대시보드에 한 번 둔다.
 *  행정동 이름 목록이 오기 전엔 CCTV 가 전부 '기타'로 묶이므로, 이름 목록이 온 뒤에 시작한다
 *  (CCTV 목록이 먼저 오면 '기타'만 체크된 채 굳던 것). */
export function LayerSync() {
  const { regions, named } = useCctvRegions()
  useEffect(() => {
    cctv.set({ regions })
    if (named && regions.length && dash.get().cctvRegions === null) dash.set({ cctvRegions: new Set(regions.map((r) => r.id)) })
  }, [regions, named])
  return null
}

/** 지도에 보일 CCTV id — 체크한 행정동만. 목록 전(null)이면 undefined(전체) */
export function useCctvVisibleIds(): ReadonlySet<number> | undefined {
  const checked = dash.use((s) => s.cctvRegions)
  const list = cctv.use((s) => s.list)
  return useMemo(() => {
    if (!checked) return undefined
    return new Set(list.filter((c) => checked.has(c.regionId ?? CCTV_ETC_REGION_ID)).map((c) => c.id))
  }, [checked, list])
}

// ── 바꾸기 ──
export function setLayerChecked(code: string, on: boolean, allRegionIds: readonly number[]) {
  dash.set((s) => ({
    layerChecked: { ...s.layerChecked, [code]: on },
    // CCTV 는 아래 행정동과 같이 켜고 끈다
    ...(code === CCTV_LAYER_CODE ? { cctvRegions: new Set(on ? allRegionIds : []) } : {}),
  }))
}
export function setLabelOn(code: string, on: boolean) {
  dash.set((s) => ({ layerLabelOn: { ...s.layerLabelOn, [code]: on } }))
}
export function setRegions(ids: readonly number[], on: boolean) {
  dash.set((s) => {
    const next = new Set(s.cctvRegions ?? [])
    for (const id of ids) {
      if (on) next.add(id)
      else next.delete(id)
    }
    // 하나도 없으면 CCTV 레이어도 꺼진 것으로
    return { cctvRegions: next, layerChecked: { ...s.layerChecked, [CCTV_LAYER_CODE]: next.size > 0 } }
  })
}
