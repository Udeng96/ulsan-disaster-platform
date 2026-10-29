// 레이어 목록과 색 — 레이어 패널·범례·지도 마커가 같이 쓴다.
//   색 = 바꾼 색 ?? 서버 색. 바꾼 색은 바로 화면에 보이고, 저장은 모아 두었다가 60초마다·창을 닫을 때 한 번에.
//   서버는 잘못된 색을 에러 없이 건너뛰므로 #RRGGBB 만 받는다.
import { useEffect, useMemo } from 'react'
import { once } from '@/shared/api'
import { createStore } from '@/shared/store'
import { fetchAirStations, fetchLayers, fetchShelters, saveLayerColors, type AirStation, type CoolingShelter, type LayerMeta } from './api'

/** 서버 목록에는 있지만 그리지 않는 레이어 — 토양함수계는 따로 있는 장비가 아니라 경사계가 같이 재는 값이라
 *  지도에 따로 그릴 자리가 없다 (사용자 10-21: 목록·범례에서 뺌, 함수비는 계측 상세 차트에서) */
const HIDDEN = new Set(['SLOPE_MOISTURE'])

export const layers = once<readonly LayerMeta[]>(async () => (await fetchLayers()).filter((l) => !HIDDEN.has(l.code)), [], 'layers')
export const shelters = once<readonly CoolingShelter[]>(() => fetchShelters(), [], 'shelters')
export const airStations = once<readonly AirStation[]>(() => fetchAirStations(), [], 'air-stations')

const SAVE_MS = 60_000
const HEX = /^#[0-9a-fA-F]{6}$/

/** 바꾼 색 (code → color) */
const overrides = createStore<{ map: Readonly<Record<string, string>> }>({ map: {} })
/** 아직 저장 안 한 code */
const dirty = new Set<string>()

/** 색 바꾸기 — 바로 보이고, 저장은 다음 주기에 */
export function setLayerColor(code: string, color: string) {
  if (!HEX.test(color)) return
  overrides.set((s) => ({ map: { ...s.map, [code]: color } }))
  dirty.add(code)
}

/** code → 지금 색. 서버 색이 비어 있으면 넣지 않는다 (쓰는 곳이 기본색으로) */
export function useLayerColorMap(): Record<string, string> {
  const list = layers.use()
  const ov = overrides.use((s) => s.map)
  return useMemo(() => {
    const m: Record<string, string> = {}
    for (const l of list) if (l.color) m[l.code] = l.color
    return { ...m, ...ov }
  }, [list, ov])
}

/** 저장 안 한 색을 한 번에 보낸다. 실패하면 다음 주기에 다시 */
export async function flushLayerColors(keepalive = false) {
  if (dirty.size === 0) return
  const codes = [...dirty]
  dirty.clear()
  const map = overrides.get().map
  try {
    await saveLayerColors(
      codes.map((code) => ({ code, color: map[code] })),
      keepalive,
    )
  } catch (err) {
    console.warn('[layer-colors] 저장 실패 — 다음 주기에 다시', err)
    for (const c of codes) dirty.add(c)
  }
}

/** 60초마다·창을 닫거나 숨길 때 저장. 대시보드에 한 번 둔다 */
export function useLayerColorSync() {
  useEffect(() => {
    const id = setInterval(() => void flushLayerColors(), SAVE_MS)
    const onHide = () => void flushLayerColors(true)
    const onVisibility = () => document.visibilityState === 'hidden' && onHide()
    window.addEventListener('beforeunload', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(id)
      window.removeEventListener('beforeunload', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}
