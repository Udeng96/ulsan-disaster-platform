// 자동 음성 통보 메시지 유형(템플릿) CRUD.
//   GET    /api/broadcast/templates        → [{id, title, content}] (8종 시드)
//   POST   /api/broadcast/templates        { title, content } → 생성된 항목
//   PUT    /api/broadcast/templates/{id}   { title, content } → 수정된 항목
//   DELETE /api/broadcast/templates/{id}

export interface BroadcastTemplate {
  id: number
  /** 칩 라벨 = 제목. */
  title: string
  /** 내용 (선택 시 자동 입력). */
  content: string
}

export interface TemplateBody {
  title: string
  content: string
}

const BASE = '/api/broadcast/templates'

export async function fetchTemplates(): Promise<BroadcastTemplate[]> {
  const res = await fetch(BASE)
  if (!res.ok) {
    throw new Error(`fetchTemplates failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as BroadcastTemplate[]
}

export async function createTemplate(
  body: TemplateBody,
): Promise<BroadcastTemplate> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`createTemplate failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as BroadcastTemplate
}

export async function updateTemplate(
  id: number,
  body: TemplateBody,
): Promise<BroadcastTemplate> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`updateTemplate failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as BroadcastTemplate
}

export async function deleteTemplate(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(`deleteTemplate failed: ${res.status} ${res.statusText}`)
  }
}
