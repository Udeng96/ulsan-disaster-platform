// cctv-sync 모듈(8083) — CCTV 시설물 배정 / 재해문자전광판 ↔ CCTV 1:1 연결.
//   경로는 /cctv-sync 로 시작한다 (운영 nginx · vite 모두 prefix 를 떼고 8083 으로 넘긴다).
//   실패 응답 본문은 { message } — 화면에 그대로 띄울 수 있게 Error 메시지로 올린다.

import type { CctvFacility } from './cctv'

const BASE = '/cctv-sync/api'

async function send<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string
      signboardId?: number
    } | null
    throw new CctvSyncError(
      body?.message ?? `${res.status} ${res.statusText}`,
      res.status,
      body?.signboardId,
    )
  }
  return (await res.json()) as T
}

export class CctvSyncError extends Error {
  readonly status: number
  /** 409 — 그 CCTV 가 이미 붙어 있는 전광판. */
  readonly signboardId?: number

  constructor(message: string, status: number, signboardId?: number) {
    super(message)
    this.status = status
    this.signboardId = signboardId
  }
}

// --- 시설물 배정 ---------------------------------------------------------------

/** 배정 통째 교체. 빈 배열이면 미분류. */
export function saveCctvMapps(cctvId: string, mapps: CctvFacility[]) {
  return send<unknown>(`${BASE}/cctv/${encodeURIComponent(cctvId)}/mapp`, {
    method: 'PUT',
    body: JSON.stringify({ mapps }),
  })
}

/** 여러 CCTV 에 같은 배정을 덧붙인다 (기존 배정 유지). */
export function addCctvMapps(cctvIds: string[], mapps: CctvFacility[]) {
  return send<unknown>(`${BASE}/cctv/mapp`, {
    method: 'POST',
    body: JSON.stringify({ cctvIds, mapps }),
  })
}

/** 배정 1건 삭제. */
export function deleteCctvMapp(cctvId: string, facClfy: string, facSubClfy: string) {
  const q = new URLSearchParams({ facClfy, facSubClfy })
  return send<unknown>(
    `${BASE}/cctv/${encodeURIComponent(cctvId)}/mapp?${q.toString()}`,
    { method: 'DELETE' },
  )
}

// --- 재해문자전광판 ↔ CCTV ------------------------------------------------------

export interface SignboardCctv {
  signboardId: number
  cctvId: string | null
}

/** 전광판 전체의 연결 상태 (미연결은 cctvId null). */
export async function fetchSignboardCctv(): Promise<SignboardCctv[]> {
  const res = await fetch(`${BASE}/signboard-cctv`)
  if (!res.ok) {
    throw new Error(`fetchSignboardCctv failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as SignboardCctv[]
}

/** 연결·교체. cctvId null 이면 해제. 다른 전광판에 붙은 CCTV 면 409(CctvSyncError.signboardId). */
export function linkSignboardCctv(signboardId: number, cctvId: string | null) {
  return send<SignboardCctv>(`${BASE}/signboard-cctv/${signboardId}`, {
    method: 'PUT',
    body: JSON.stringify({ cctvId }),
  })
}
