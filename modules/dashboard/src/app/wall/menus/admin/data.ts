// 관리자 데이터 — 화면 여러 곳이 같이 쓰는 값. 요청은 한 줄씩 (8-관리자.md 화면 쪽 제안, 사용자 10-23).
//   메인(공지 줄·카드·리스트): /overview 30초 — 서버 판정이 60초라 그보다 잦을 필요 없음
//   고른 장비 상세만: 서버 /servers/{host} · /parts 60초, 방화벽·스위치 요약·포트·최근 활동 10초, 그래프 5분
//   자산대장: 탭 열 때 한 번
import { live, once, type Live } from '@/shared/api'
import * as api from './api'

export const MAIN_MS = 30_000
export const HOST_MS = 60_000
export const DEVICE_MS = 10_000
export const CHART_MS = 5 * 60_000
/** 최근 활동은 한 줄만 보이지만 '외 N건' 을 세려고 넉넉히 받는다 (서버가 전체 건수를 안 줌 — 8-관리자.md 질문 8) */
export const EVENT_LIMIT = 20

export const overview = live<api.Overview | null>(api.fetchOverview, null, { intervalMs: MAIN_MS, label: 'admin-overview' })

export const ledger = once<readonly api.Ledger[]>(api.fetchLedger, [], 'admin-ledger')
export const specs = once<readonly api.Spec[]>(api.fetchSpecs, [], 'admin-specs')

/** 열쇠마다 따로 받는 값 (host · 기간) — 처음 부를 때 만들어 둔다 */
function keyed<K extends string, T>(make: (key: K) => Live<T>) {
  const map = new Map<K, Live<T>>()
  return (key: K) => {
    let l = map.get(key)
    if (!l) {
      l = make(key)
      map.set(key, l)
    }
    return l
  }
}

export const detail = keyed((host: string) => live<api.ServerDetail | null>((s) => api.fetchDetail(host, s), null, { intervalMs: HOST_MS, label: `admin-detail-${host}` }))
export const parts = keyed((host: string) => live<api.HostParts | null>((s) => api.fetchParts(host, s), null, { intervalMs: HOST_MS, label: `admin-parts-${host}` }))

export const firewallSummary = live<api.FirewallSummary | null>(api.fetchFirewallSummary, null, { intervalMs: DEVICE_MS, label: 'admin-fw-summary' })
export const firewallPorts = live<readonly api.FirewallPort[]>(api.fetchFirewallPorts, [], { intervalMs: DEVICE_MS, label: 'admin-fw-ports' })
export const firewallEvents = live<readonly api.DeviceEvent[]>((s) => api.fetchFirewallEvents(EVENT_LIMIT, s), [], { intervalMs: DEVICE_MS, label: 'admin-fw-events' })
export const firewallBlocks = keyed((range: api.Range) => live<api.BlockChart | null>((s) => api.fetchFirewallBlocks(range, s), null, { intervalMs: CHART_MS, label: `admin-fw-blocks-${range}` }))
export const firewallBlockTypes = live<readonly api.BlockType[]>(api.fetchFirewallBlockTypes, [], { intervalMs: CHART_MS, label: 'admin-fw-types' })

export const switchSummary = live<api.SwitchSummary | null>(api.fetchSwitchSummary, null, { intervalMs: DEVICE_MS, label: 'admin-sw-summary' })
export const switchPorts = live<readonly api.SwitchPort[]>(api.fetchSwitchPorts, [], { intervalMs: DEVICE_MS, label: 'admin-sw-ports' })
export const switchEvents = live<readonly api.DeviceEvent[]>((s) => api.fetchSwitchEvents(EVENT_LIMIT, s), [], { intervalMs: DEVICE_MS, label: 'admin-sw-events' })
export const switchTraffic = keyed((range: api.Range) => live<api.TrafficChart | null>((s) => api.fetchSwitchTraffic(range, s), null, { intervalMs: CHART_MS, label: `admin-sw-traffic-${range}` }))

/** 번호 → host. 서버 응답에서 받는다 (1·2·10·11번 host 는 아직 확정 전이라 코드에 박지 않음, 8-관리자.md) */
export function useHost(seq: number): string | null {
  return overview.use('poll')?.cards.find((c) => c.seq === seq)?.host ?? null
}

/** 서버 부품 값 (/servers/{host}/parts) — 고른 장비만 받는다 */
export function useParts(seq: number) {
  const host = useHost(seq)
  return parts(host ?? '').use(host ? 'poll' : 'off')
}
