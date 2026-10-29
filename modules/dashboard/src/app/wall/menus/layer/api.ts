// 레이어 메뉴 API — gis 모듈 (답: notes/gis-front/api-질문/1-레이어-답-gis.md, 10-21).
//   레이어 목록·색 저장·행정동·무더위쉼터·대기질 측정소. 실패는 {code, message}.
import { request } from '@/shared/api'

/** 레이어 — 순서(displayOrder)대로 온다. code 는 시설물 응답의 layerCode 와 같다 */
export interface LayerMeta {
  id: number
  code: string
  name: string
  /** #RRGGBB. 비어 있을 수 있다 (화면 기본색) */
  color: string | null
  displayOrder: number
}

export interface LayerColorUpdate {
  code: string
  color: string
}

/** 행정동 — 순서대로 온다. id 는 다른 모듈(CCTV 등)이 주는 행정동 id 와 같다 */
export interface Region {
  id: number
  /** 10자리 행정동 코드 */
  code: string
  name: string
}

export interface CoolingShelter {
  id: number
  name: string
  layerCode: string
  roadAddress: string | null
  parcelDetail: string | null
  lat: number | null
  lng: number | null
  /** 행정동 이름 */
  region: string | null
  /** 경로당·금융기관·기타 */
  facilityType: string | null
  capacity: number | null
  /** HHMM */
  weekdayOpen: string | null
  weekdayClose: string | null
}

export interface AirStation {
  id: number
  name: string
  layerCode: string
  /** URBAN 도시대기 · ROADSIDE 도로변대기 · SUBURBAN 교외대기 */
  networkType: 'URBAN' | 'ROADSIDE' | 'SUBURBAN'
  location: string | null
  address: string | null
  lat: number | null
  lng: number | null
  region: string | null
}

export const fetchLayers = (signal?: AbortSignal) => request<LayerMeta[]>('gis', '/layers', { signal })
export const fetchRegions = (signal?: AbortSignal) => request<Region[]>('gis', '/regions', { signal })
export const fetchShelters = (signal?: AbortSignal) => request<CoolingShelter[]>('gis', '/shelter/cooling', { signal })
export const fetchAirStations = (signal?: AbortSignal) => request<AirStation[]>('gis', '/air/stations', { signal })

/** 레이어 색 여러 개를 한 번에 저장 (성공 200, 본문 없음). 잘못된 색·없는 code 는 서버가 에러 없이 건너뛴다 */
export const saveLayerColors = (updates: readonly LayerColorUpdate[], keepalive = false) =>
  request<void>('gis', '/layers/colors', { method: 'PUT', body: updates, keepalive })
