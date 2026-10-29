// 현장(망 분리 환경) 자가 진단 — 브라우저 콘솔에서 `__diag()` 실행.
//   외부 도움 없이 "어디서 막혔는지" 를 한 번에 확인하기 위한 도구.
//
// 확인 항목:
//   1) 접속 설정값 (Xeus WS URL / userId, SSE URL)
//   2) REST API 응답 코드 (gis / owl / weather)
//   3) Xeus 게이트 WebSocket 핸드셰이크 성공 여부
//   4) 부엉이 SSE 연결 + 첫 수신 여부
//
// 사용법:
//   __diag()            — 전체 점검
//   __xeusCheck()       — Xeus WebSocket 만 점검
//   localStorage.setItem('xeusDebug','1') 후 새로고침 → Xeus 내부 상세 로그 활성화

import { XEUS_STREAM_URL, XEUS_USER_ID } from '@/config/xeus'

const SSE_URL = '/owl/events/stream'
const WS_TIMEOUT_MS = 8000
const SSE_TIMEOUT_MS = 8000

type Result = { ok: boolean; detail: string }

// WebSocket 핸드셰이크 확인 — open 되면 성공, 에러/타임아웃이면 실패.
export function checkXeusSocket(url = XEUS_STREAM_URL): Promise<Result> {
  return new Promise((resolve) => {
    const started = Date.now()
    let ws: WebSocket
    try {
      ws = new WebSocket(url)
    } catch (e) {
      resolve({ ok: false, detail: `생성 실패: ${String(e)}` })
      return
    }
    const done = (r: Result) => {
      try {
        ws.close()
      } catch {
        /* noop */
      }
      resolve(r)
    }
    const timer = window.setTimeout(
      () =>
        done({
          ok: false,
          detail: `${WS_TIMEOUT_MS}ms 무응답 (readyState=${ws.readyState}) — 서버 도달 불가 또는 경로 오류`,
        }),
      WS_TIMEOUT_MS,
    )
    ws.onopen = () => {
      window.clearTimeout(timer)
      done({ ok: true, detail: `핸드셰이크 성공 (${Date.now() - started}ms)` })
    }
    ws.onerror = () => {
      window.clearTimeout(timer)
      done({
        ok: false,
        detail: `연결 오류 (readyState=${ws.readyState}) — 주소/방화벽/nginx 확인`,
      })
    }
  })
}

// SSE 연결 확인 — onopen 또는 첫 메시지 수신이면 성공.
function checkSse(url = SSE_URL): Promise<Result> {
  return new Promise((resolve) => {
    const started = Date.now()
    const es = new EventSource(url)
    const done = (r: Result) => {
      es.close()
      resolve(r)
    }
    const timer = window.setTimeout(
      () =>
        done({
          ok: false,
          detail: `${SSE_TIMEOUT_MS}ms 무응답 (readyState=${es.readyState}) — 서버가 응답 헤더를 안 보냄`,
        }),
      SSE_TIMEOUT_MS,
    )
    es.onopen = () => {
      window.clearTimeout(timer)
      done({ ok: true, detail: `연결 성공 (${Date.now() - started}ms)` })
    }
    es.onerror = () => {
      window.clearTimeout(timer)
      done({ ok: false, detail: `연결 오류 (readyState=${es.readyState})` })
    }
  })
}

async function checkApi(url: string): Promise<Result> {
  try {
    const res = await fetch(url)
    return { ok: res.ok, detail: `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, detail: `요청 실패: ${String(e)}` }
  }
}

const mark = (ok: boolean) => (ok ? '✅' : '❌')

/** 전체 자가 진단 — 콘솔에서 `__diag()`. */
export async function runDiagnostics() {
  console.log('%c=== 통합 진단 시작 ===', 'font-weight:bold')
  console.log('[설정] 페이지 주소   :', window.location.href)
  console.log('[설정] Xeus WS URL   :', XEUS_STREAM_URL)
  console.log('[설정] Xeus userId   :', XEUS_USER_ID)
  console.log('[설정] SSE URL       :', SSE_URL)

  const apis: [string, string][] = [
    ['gis   /api/cctv', '/api/cctv'],
    ['owl   /owl/events', '/owl/events'],
    ['owl   /owl/event-types', '/owl/event-types'],
    ['gis   /api/regions', '/api/regions'],
    ['weather /weather/api/summary', '/weather/api/summary'],
  ]
  for (const [label, url] of apis) {
    const r = await checkApi(url)
    console.log(`${mark(r.ok)} [API] ${label} → ${r.detail}`)
  }

  const ws = await checkXeusSocket()
  console.log(`${mark(ws.ok)} [Xeus WS] ${XEUS_STREAM_URL} → ${ws.detail}`)

  const sse = await checkSse()
  console.log(`${mark(sse.ok)} [SSE] ${SSE_URL} → ${sse.detail}`)

  console.log('%c=== 진단 끝 ===', 'font-weight:bold')
  console.log(
    'CCTV 영상이 안 나오면: Xeus WS 가 ❌ → 주소/nginx 문제, ✅ 인데 화면이 검으면 → cctvMgrNo/userId 확인',
  )
}

/** 콘솔에서 바로 부를 수 있게 전역 등록 (망 분리 환경 디버깅용). */
export function registerDiagnostics() {
  const w = window as unknown as Record<string, unknown>
  w.__diag = runDiagnostics
  w.__xeusCheck = checkXeusSocket
  console.log(
    '[진단] 콘솔에서 __diag() 실행 시 접속 상태를 점검합니다. ' +
      "(Xeus 상세 로그: localStorage.setItem('xeusDebug','1') 후 새로고침)",
  )
}
