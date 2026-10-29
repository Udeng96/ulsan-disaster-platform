// Xeus-Gate Player 접속 설정.
//   게이트 서버 WebSocket 은 nginx reverse proxy 경유 — nginx 의 location 과 같은 경로로 접속.
//     nginx(192.0.2.179): location /xeus-gate/ { proxy_pass http://xeus_gw; ... }
//     upstream xeus_gw = Xeus 게이트 서버 192.0.2.47:8080
//     최종 형태: ws://<nginx host>/xeus-gate/stream
//
// ⚠️ 라우트별로 접속 경로가 다르다.
//   /wall   : IP월 전용 화면 — 게이트(192.0.2.47:8080) 에 '직접' 붙는다.
//             nginx 를 한 번 더 타면 영상 지연이 커져서, 같은 내부망인 IP월에서는 직행한다.
//   /tablet : 접속한 호스트(= nginx) 를 그대로 따라간다. 태블릿은 게이트에 직접 못 붙을 수 있다.
//   dev     : vite proxy 가 /xeus-gate → 게이트로 forward (ws: true).
//
//   VITE_XEUS_STREAM_URL 을 주면 라우트와 무관하게 그 주소를 쓴다 (디버깅/예외용).

/** nginx location 과 동일한 경로 (뒤에 붙는 /stream 까지 포함). */
const XEUS_PATH = '/xeus-gate/stream'

/** IP월(/wall) 이 직접 붙는 게이트 주소. 환경이 바뀌면 env 로 덮어쓴다. */
const WALL_DIRECT_URL = String(
  import.meta.env.VITE_XEUS_WALL_STREAM_URL ?? 'ws://192.0.2.47:8080/xeus-gate/stream',
)

/** IP월 화면인지 — 경로 기준 (/wall, /wall/...). */
function isWallRoute(): boolean {
  return /^\/wall(\/|$)/.test(window.location.pathname)
}

/** 같은 화면에서 경로를 바꿔 비교하기 위한 런타임 스위치.
 *    ?xeusDirect=1 → 게이트 직접 / ?xeusDirect=0 → nginx(접속 호스트) 경유
 *    localStorage 'xeusDirect' 로도 지정 가능 (새로고침해도 유지).
 *    지정이 없으면 라우트 기본값(/wall 직접, 그 외 접속 호스트)을 따른다. */
function directOverride(): boolean | null {
  try {
    const q = new URLSearchParams(window.location.search).get('xeusDirect')
    const v = q ?? window.localStorage.getItem('xeusDirect')
    if (v === '1') return true
    if (v === '0') return false
  } catch {
    // 접근 불가 환경 — 기본값 사용
  }
  return null
}

/** nginx(접속 호스트) 경유 주소. */
function proxyUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}${XEUS_PATH}`
}

export const XEUS_STREAM_URL = (() => {
  const env = import.meta.env.VITE_XEUS_STREAM_URL
  if (env) return String(env)
  const override = directOverride()
  if (override !== null) return override ? WALL_DIRECT_URL : proxyUrl()
  // IP월 — nginx 를 거치지 않고 게이트에 직접 (dev 는 vite proxy 를 타야 하므로 제외).
  if (import.meta.env.PROD && isWallRoute()) return WALL_DIRECT_URL
  return proxyUrl()
})()

/** 지금 쓰는 경로가 게이트 직접인지 — 측정 로그 표기용. */
export const XEUS_IS_DIRECT = XEUS_STREAM_URL === WALL_DIRECT_URL

/**
 * Xeus 내부 상세 로그 토글 — 재빌드 없이 현장에서 켤 수 있게 런타임 플래그.
 *   localStorage.setItem('xeusDebug','1') 후 새로고침, 또는 URL 에 ?xeusDebug=1
 *   켜면 WebSocket 연결/전송 cmd/에러가 콘솔에 모두 찍힘 (평상시엔 조용).
 */
export const XEUS_DEBUG = (() => {
  try {
    if (new URLSearchParams(window.location.search).get('xeusDebug') === '1') {
      return true
    }
    return window.localStorage.getItem('xeusDebug') === '1'
  } catch {
    return false
  }
})()

/** 게이트 접속 사용자 id — 정상 동작 캡처 기준 'longbiggun'. env 로 교체 가능. */
export const XEUS_USER_ID = String(
  import.meta.env.VITE_XEUS_USER_ID ?? 'longbiggun',
)
