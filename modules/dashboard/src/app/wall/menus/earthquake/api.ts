// 지진가속도 메뉴 API — earthquake 모듈 (답: notes/gis-front/api-질문/3-지진-답-earthquake.md, 10-21).
//   계측기 목록 1개 + 실시간 SSE 1개. 실패는 Spring 기본 모양이라 code·message 가 없다 → 공통 함수가 HTTP_<상태> 로 채운다.
import { apiUrl, once, request } from '@/shared/api'

/** 계측기 — id 순 (US_NGG, 가상시설0204, 가상시설0205, 가상시설0203). null 인 필드는 없다 */
export interface EarthquakeInstrument {
  id: number
  /** 관측소 코드 (net_obs) — SSE stationCode 와 같은 값 */
  stationCode: string
  net: string
  obs: string
  /** 가상시설0683 · 가상시설0714 · 가상시설0715 */
  installLocation: string
  /** 3축 · 2축(Y,X) · 1축(Y) */
  axis: string
  modelName: string
  serialNo: string
  connectionType: string
  /** 지금은 4대 모두 남구청 임시 좌표 (업체 자료 대기) */
  lat: number
  lng: number
}

/** 실시간 값 1건 — 관측소마다 1초에 1건, 같은 초의 4대는 따로 따로 순서 없이 온다 */
export interface EarthquakeRealtime {
  stationCode: string
  net: string
  obs: string
  /** 업체가 보낸 시각, 시간대 없는 'yyyy-MM-ddTHH:mm:ss' */
  time: string
  /** 수평 2성분 합성 최대가속도 (gal) — 차트·진도에 쓴다 */
  hpga: number
  /** 3성분 합성 최대가속도 (gal) */
  tpga: number
}

/** 업체 연결 상태 — 구독 직후, 바뀔 때, 15초마다(ping) 같은 모양으로 온다 */
export interface EarthquakeStatus {
  sourceConnected: boolean
  /** 서버 시각. 아직 값을 한 번도 못 받았으면 null */
  lastValueAt: string | null
  secondsSinceLastValue: number | null
}

/** 화면 이름 — '가상시설0683(3축)' */
export const instrumentLabel = (i: Pick<EarthquakeInstrument, 'installLocation' | 'axis'>) => (i.axis ? `${i.installLocation}(${i.axis})` : i.installLocation)

export const fetchInstruments = (signal?: AbortSignal) => request<EarthquakeInstrument[]>('earthquake', '/instruments', { signal })

/** 계측기 목록 — 메뉴·지도 마커가 같이 쓴다, 처음 한 번 */
export const instrumentList = once<readonly EarthquakeInstrument[]>(fetchInstruments, [], 'earthquake-instruments')

/** 실시간 SSE — 이벤트: earthquake-realtime(값) · status·ping(EarthquakeStatus) · connect(구독 직후 1번, 내용 없음) */
export const STREAM_URL = apiUrl('earthquake', '/realtime/stream')
export const EVENT = { value: 'earthquake-realtime', status: 'status', ping: 'ping', connect: 'connect' } as const
