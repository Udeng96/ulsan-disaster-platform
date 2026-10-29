// 자동음성통보 송출 — POST /api/broadcast/dispatches (JSON).

export interface DispatchBody {
  title: string
  content: string
  alertSound: string // 알림음 코드 "0"|"1"|"9"
  terminalIds: number[] // 송출 대상 단말 id
}

// 송출 이력 응답. status FAILED 여도(모듈 거부/연결 실패) 이력은 저장돼 200 으로 옴.
export interface DispatchResult {
  id: number
  status: 'SUCCESS' | 'FAILED'
  castId: string | null
  title: string
  alertSound: string
  targets: { id: number; name: string }[]
  createdAt: string
}

// 송출 요청. HTTP 실패 시 throw, 성공 시 이력 응답(status 로 성공/실패 구분).
export async function dispatchBroadcast(
  body: DispatchBody,
): Promise<DispatchResult> {
  const res = await fetch('/api/broadcast/dispatches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`dispatch failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as DispatchResult
}
