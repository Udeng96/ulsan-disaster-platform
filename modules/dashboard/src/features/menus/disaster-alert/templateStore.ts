// 메시지 유형(템플릿) 모듈 캐시 — 세션 내 최초 1회만 GET, 이후 재사용.
//   VoiceComposer 가 voice 모드마다 remount 돼도 재호출 안 함 (구독만).
//   CRUD 는 서버 반영 후 캐시도 갱신 → 모든 구독자에 반영.

import { useSyncExternalStore } from 'react'
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type BroadcastTemplate,
  type TemplateBody,
} from '@/api/broadcastTemplate'

let snapshot: BroadcastTemplate[] = []
let loaded = false
let inflight = false
const listeners = new Set<() => void>()

function set(next: BroadcastTemplate[]) {
  snapshot = next
  listeners.forEach((l) => l())
}

// 최초 구독 시 1회 fetch (이미 로드/진행 중이면 skip).
function ensureLoaded() {
  if (loaded || inflight) return
  inflight = true
  fetchTemplates()
    .then((data) => {
      loaded = true
      inflight = false
      set(data)
    })
    .catch((err) => {
      inflight = false
      console.warn('[templates] fetch 실패', err)
    })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  ensureLoaded()
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot() {
  return snapshot
}

/** 템플릿 목록 (캐시 구독). */
export function useTemplates(): BroadcastTemplate[] {
  return useSyncExternalStore(subscribe, getSnapshot)
}

// ── CRUD (서버 반영 + 캐시 갱신) ──
export async function addTemplate(body: TemplateBody): Promise<BroadcastTemplate> {
  const created = await createTemplate(body)
  set([...snapshot, created])
  return created
}

export async function editTemplate(
  id: number,
  body: TemplateBody,
): Promise<BroadcastTemplate> {
  const updated = await updateTemplate(id, body)
  set(snapshot.map((t) => (t.id === updated.id ? updated : t)))
  return updated
}

export async function removeTemplate(id: number): Promise<void> {
  await deleteTemplate(id)
  set(snapshot.filter((t) => t.id !== id))
}
