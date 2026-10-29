// 급경사지 메뉴 API — slope 모듈 (답: notes/gis-front/api-질문/2-급경사지-답-slope.md, 10-21).
//   숫자는 JSON 숫자, 시각은 시간대 없는 KST 문자('2026-10-21T14:05:00').
//   실패는 Spring 기본 모양이라 code·message 가 없다 → 공통 함수가 HTTP_<상태> 로 채운다.
import { request } from '@/shared/api'

/** 총괄·관제 관리지역 — mgmtNo 순으로 온다 */
export interface ManagedArea {
  id: number
  /** 관리번호 */
  mgmtNo: string
  /** 급경사지명 */
  name: string
  /** A~E. 지금 시드는 전부 A */
  grade: string | null
  /** 관리기관 ('울산남구청' 글자는 서버가 지우고 준다) */
  org: string | null
  /** 관리부서. 쉼표가 섞일 수 있고, 교육청 건은 null */
  department: string | null
  lat: number | null
  lng: number | null
  /** 주소는 화면이 legalDong + jibun 으로 만든다 */
  legalDong: string | null
  legalDongCode: string | null
  jibun: string | null
}

export type SlopeCategory = 'INCLINOMETER' | 'SOIL_MOISTURE' | 'ROCKFALL_DETECTOR' | 'RAIN_GAUGE'

/** 계측기의 값 하나 — 경사계는 X축 → Y축 → 함수비 순 */
export interface ObservationValue {
  /** 차트 부를 때 쓰는 id */
  observationItemId: number
  type: SlopeCategory
  /** U081 X축 / U082 Y축 / U040 함수비 / U210 감지 / U010 강우량 */
  unitType: string
  label: string
  /** 경사계는 부호가 있는 원래 값 (차트는 절댓값) */
  value: number | null
  unit: string
  /** 장애면 null */
  level: string | null
  measuredAt: string | null
}

export interface SlopeInstrument {
  id: number
  /** 표기명 ('수집2 - 1') */
  displayName: string
  /** 업체 이름 — 발령 필요 cause 와 같은 이름 */
  sourceName: string
  /** 토양함수계는 따로 오지 않는다 (경사계 values 안의 함수비) */
  category: Exclude<SlopeCategory, 'SOIL_MOISTURE'>
  /** 장애면 null */
  level: string | null
  lastMeasuredAt: string | null
  /** 국가지점번호 */
  spotNo: string | null
  address: string | null
  installedAt: string | null
  lat: number | null
  lng: number | null
  values: ObservationValue[]
}

/** 상시계측 지구 — id 순 */
export interface SlopeArea {
  id: number
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  /** 채우는 기능이 없어 null 로 본다 */
  grade: string | null
  /** 정상~심각, '장애', 모르는 코드(그대로), null */
  level: string | null
  lastMeasuredAt: string | null
  instruments: SlopeInstrument[]
}

/** 지구 배지용 — /areas 에서 계측기만 뺀 것 */
export type AreaSummary = Pick<SlopeArea, 'id' | 'name' | 'grade' | 'level' | 'lastMeasuredAt'>

export type ChartRange = 'realtime' | 'hour' | 'day' | 'month'

export interface ChartPoint {
  /** realtime 은 측정 시각, 나머지는 칸 시작 */
  at: string
  value: number | null
  /** 원본이 칸의 80% 미만이면 false. realtime 은 항상 true */
  complete: boolean
}

export interface ChartSeries {
  unitType: string
  label: string
  /** 막대로 그릴지 — 시리즈마다 온다 */
  bar: boolean
  /** at 순. 빈 칸은 점이 없다 */
  points: ChartPoint[]
}

export interface ChartThreshold {
  level: string | null
  value: number
}

export interface ObservationChart {
  observationItemId: number
  category: SlopeCategory
  unit: string
  range: ChartRange
  /** 값 순. 낙석·강우량은 [] */
  thresholds: ChartThreshold[]
  series: ChartSeries[]
}

/** 발령 필요 — 지구당 최대 1건. 해제 필요 건도 섞여 온다 (cause 가 null 이고 level 이 낮아지는 쪽) */
export interface AlarmPending {
  areaName: string
  /** 발령(또는 해제해서 갈) 단계 */
  level: string | null
  /** 지금 지구 상태 (해제 필요면 발령된 단계) */
  fromLevel: string | null
  /** 그 단계 이상 업체 문자의 최근 발송 시각 */
  occurredAt: string | null
  /** 원인 계측기 업체 이름 (', ' 구분). 해제 필요면 null */
  cause: string | null
  /** 서버가 싣지 않아 항상 null */
  causeUnitType: string | null
  causeValue: number | null
  causeUnit: string | null
}

/** 발령 이력 — 한 줄 = 한 지구가 한 단계에 머문 구간 (실제 발령 기록 아님). issuedAt 최근순, 기간 거르기 없음 */
export interface AlarmHistory {
  areaName: string
  /** 그 구간에 실제 발령이 있었을 때만 */
  issuer: string | null
  fromLevel: string | null
  level: string | null
  /** 이 단계가 된 시각 */
  issuedAt: string | null
  /** 항상 null — 원인은 causes */
  message: string | null
  direction: 'UP' | 'DOWN'
  lastSentAt: string | null
  sendCount: number
  /** 진행 중이면 null */
  endedAt: string | null
  /** 원인 계측기 업체 이름 (', ' 구분) */
  causes: string | null
}

/** 기간 통계 — byLevel·neededByLevel 은 있는 단계만 키로 온다 */
export interface AlarmStats {
  issued: number
  released: number
  byLevel: Record<string, number>
  /** 발령 필요 건수 (기간 안에 시작한 단계 구간 수) */
  needed: number
  neededByLevel: Record<string, number>
  /** 올해 1~12월 고정 (기간과 무관) */
  monthly: { month: string; count: number; needed: number }[]
}

/** 지도 발령 빈도 — 지구 3곳이 다 온다 */
export interface AlarmMapPoint {
  areaId: number
  name: string
  lat: number | null
  lng: number | null
  /** 실제 발령 */
  count: number
  /** 발령 필요 (구간 수) */
  needed: number
}

/** 기간 — 'YYYY-MM-DD', to 날짜 포함 */
export interface Period {
  from: string
  to: string
}

export const fetchManagedAreas = (signal?: AbortSignal) => request<ManagedArea[]>('slope', '/managed-areas', { signal })
export const fetchAreas = (signal?: AbortSignal) => request<SlopeArea[]>('slope', '/areas', { signal })
export const fetchAreaSummary = (signal?: AbortSignal) => request<AreaSummary[]>('slope', '/areas/summary', { signal })

/** period 는 서버가 아직 지원하지 않아 무시된다 (급경사지 스레드에 요청함, 수정 15) */
export const fetchObservationChart = (id: number, range: ChartRange, period?: Period, signal?: AbortSignal) =>
  request<ObservationChart>('slope', `/observations/${id}/chart`, { query: { range, from: period?.from, to: period?.to }, signal })

export const fetchAlarmPending = (signal?: AbortSignal) => request<AlarmPending[]>('slope', '/alarms/pending', { signal })
export const fetchAlarmHistory = (signal?: AbortSignal) => request<AlarmHistory[]>('slope', '/alarms/history', { signal })
export const fetchAlarmStats = ({ from, to }: Period, signal?: AbortSignal) => request<AlarmStats>('slope', '/alarms/stats', { query: { from, to }, signal })
export const fetchAlarmMap = ({ from, to }: Period, signal?: AbortSignal) => request<AlarmMapPoint[]>('slope', '/alarms/map', { query: { from, to }, signal })
