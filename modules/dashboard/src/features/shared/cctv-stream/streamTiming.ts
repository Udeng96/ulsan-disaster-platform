// CCTV 표출 소요 시간 측정 — 두 구간으로 나눠 어디서 느린지 가른다.
//   소켓   : WebSocket 핸드셰이크 완료까지 (경로 차이 = nginx 경유 vs 게이트 직접)
//   첫프레임: 영상이 실제로 뜰 때까지 (화면 부하·디코딩 영향 포함)
//
// Xeus 플레이어(vendor)가 소켓을 직접 만들기 때문에, 게이트 URL 로 열리는 WebSocket 만
// 감싸서 open 시각을 기록한다. 다른 WebSocket 은 손대지 않는다.

import { XEUS_IS_DIRECT, XEUS_STREAM_URL } from '@/config/xeus'

/** 소켓 open 까지 걸린 시간(ms) — 생성 순서대로 큐에 쌓고 플레이어가 하나씩 가져간다. */
const socketOpenMs: number[] = []
const MAX_QUEUE = 20
let patched = false

/** 게이트 WebSocket 만 감싸 open 시각을 기록한다. */
export function installStreamTiming(): void {
  if (patched) return
  patched = true
  const Original = window.WebSocket
  const Wrapped = function (this: unknown, url: string | URL, protocols?: string | string[]) {
    const ws = new Original(url, protocols as never)
    if (String(url) === XEUS_STREAM_URL) {
      const started = performance.now()
      ws.addEventListener('open', () => {
        socketOpenMs.push(performance.now() - started)
        // 영상이 안 오는 카메라는 다시 붙을 때마다 하나씩 쌓이기만 한다 — 최근 것만 둔다
        if (socketOpenMs.length > MAX_QUEUE) socketOpenMs.shift()
      })
    }
    return ws
  } as unknown as typeof WebSocket
  Wrapped.prototype = Original.prototype
  Object.assign(Wrapped, Original)
  window.WebSocket = Wrapped
}

/** 이번 플레이어가 쓴 소켓의 open 소요(ms). 없으면 null. */
export function takeSocketOpenMs(): number | null {
  return socketOpenMs.length > 0 ? (socketOpenMs.shift() ?? null) : null
}

/** 경로 표기 — 로그에서 두 방식을 구분하기 위해. */
export const STREAM_ROUTE = XEUS_IS_DIRECT ? '직접' : 'nginx'
