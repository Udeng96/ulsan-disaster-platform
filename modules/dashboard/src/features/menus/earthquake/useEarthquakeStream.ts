// 지진가속도 실시간 SSE 구독 — 연결 자체는 모듈 싱글턴(earthquakeStream)이 관리한다.
//   화면이 여러 곳에서 구독해도 연결은 1개, 메뉴를 닫아도 유지된다.

import { useSyncExternalStore } from 'react'
import {
  getEarthquakeSnapshot,
  subscribeEarthquakeStream,
  type EarthquakeStreamState,
} from './earthquakeStream'

export type {
  EarthquakeStreamState,
  SeriesByStation,
  SeriesPoint,
} from './earthquakeStream'

export function useEarthquakeStream(): EarthquakeStreamState {
  return useSyncExternalStore(subscribeEarthquakeStream, getEarthquakeSnapshot)
}
