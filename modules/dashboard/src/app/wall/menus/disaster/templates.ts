// 메시지 유형(템플릿) — 처음 볼 때 한 번만 받고, 추가·수정·삭제는 서버에 반영한 뒤 목록도 바꾼다.
//   목록은 새 broadcast 주소(./api). 추가·수정·삭제는 송출과 함께 나중에 옮긴다 (사용자 10-22)
import { useEffect } from 'react'
import { createTemplate, deleteTemplate, updateTemplate, type TemplateBody } from '@/api/broadcastTemplate'
import { fetchTemplates, type Template as BroadcastTemplate } from './api'
import { createStore } from '@/shared/store'

const store = createStore<{ list: BroadcastTemplate[]; loaded: boolean }>({ list: [], loaded: false })
let inflight = false

function load() {
  if (store.get().loaded || inflight) return
  inflight = true
  fetchTemplates()
    .then((list) => store.set({ list, loaded: true }))
    .catch((err) => console.warn('[templates] fetch 실패', err))
    .finally(() => {
      inflight = false
    })
}

export function useTemplates(): BroadcastTemplate[] {
  useEffect(load, [])
  return store.use((s) => s.list)
}

export async function addTemplate(body: TemplateBody) {
  const t = await createTemplate(body)
  store.set((s) => ({ list: [...s.list, t] }))
}
export async function editTemplate(id: number, body: TemplateBody) {
  const t = await updateTemplate(id, body)
  store.set((s) => ({ list: s.list.map((x) => (x.id === t.id ? t : x)) }))
}
export async function removeTemplate(id: number) {
  await deleteTemplate(id)
  store.set((s) => ({ list: s.list.filter((x) => x.id !== id) }))
}
