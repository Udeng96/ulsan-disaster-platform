// 레이어 색 편집 store — 컬러 피커 변경분을 캐시 + polling 으로 DB flush.
//   요구사항: "한번 누를때마다 업데이트 X, 캐시했다가 polling 으로 db 저장" (변경 후 60초 + 페이지 이탈).
//
//   overrides : 사용자가 바꾼 색 (code → color). 백엔드 색 위에 덮어씀 → 즉시 화면 반영.
//   dirty     : 마지막 flush 이후 바뀐 code — DB 저장 대상.
//   flush     : dirty 를 PUT /api/layers/colors 로 한 번에 전송 (60초 interval + unload keepalive).
//
//   유효 색 (useLayerColorMap) = override ?? 백엔드색 — 마커 / dot / 범례 공용 소스.

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { putLayerColors, type LayerColorUpdate } from '@/api/layer'
import { useLayers } from './useLayers'

// 사용자 편집 색 (module-level — 컴포넌트 mount/unmount 넘어 유지).
let overrides: Record<string, string> = {}
// flush 대기 중인 변경 code.
const dirty = new Set<string>()
// useSyncExternalStore 용 — emit 마다 새 참조로 교체 (변경 시에만 리렌더).
let snapshot: Record<string, string> = overrides
const listeners = new Set<() => void>()

function emit() {
  snapshot = { ...overrides }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/**
 * 색 변경 (컬러 피커 '적용') — 즉시 화면 반영 + dirty 표시.
 *   실제 DB 저장은 polling(60초) / 페이지 이탈 시 flush 가 담당.
 */
export function setLayerColor(code: string, color: string): void {
  overrides[code] = color
  dirty.add(code)
  emit()
}

/** override 맵 구독 — 색 변경 시 소비 컴포넌트 리렌더. */
function useColorOverrides(): Record<string, string> {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  )
}

/**
 * 유효 색 맵 (code → color) = override ?? 백엔드색.
 *   마커(MapSection) / dot(LayerPanel) / 범례(MapLegend) 공용.
 */
export function useLayerColorMap(): Record<string, string> {
  const layers = useLayers()
  const ov = useColorOverrides()
  return useMemo(() => {
    const m: Record<string, string> = {}
    for (const l of layers) m[l.code] = ov[l.code] ?? l.color
    // 백엔드 목록엔 없지만 편집된 code 도 반영 (방어적).
    for (const code of Object.keys(ov)) if (!(code in m)) m[code] = ov[code]
    return m
  }, [layers, ov])
}

/**
 * dirty 색을 DB 로 flush. 없으면 no-op.
 *   낙관적으로 dirty 를 비우고, 실패 시 재-add 해 다음 주기에 재시도.
 *   opts.keepalive: 페이지 이탈(unload) 중에도 전송 완료 보장.
 */
export async function flushLayerColors(opts?: {
  keepalive?: boolean
}): Promise<void> {
  if (dirty.size === 0) return
  const codes = [...dirty]
  const payload: LayerColorUpdate[] = codes.map((code) => ({
    code,
    color: overrides[code],
  }))
  codes.forEach((c) => dirty.delete(c))
  try {
    await putLayerColors(payload, opts)
  } catch (err) {
    console.warn('[layer-colors] flush 실패 — 다음 주기 재시도', err)
    codes.forEach((c) => dirty.add(c))
  }
}

/**
 * 60초 polling flush + 페이지 이탈 시 flush.
 *   DashboardPage 에서 1회 mount (앱 수명 동안 단일 타이머).
 */
export function useLayerColorSync(): void {
  useEffect(() => {
    const id = setInterval(() => {
      void flushLayerColors()
    }, 60_000)
    const onHide = () => {
      void flushLayerColors({ keepalive: true })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide()
    }
    window.addEventListener('beforeunload', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(id)
      window.removeEventListener('beforeunload', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}
