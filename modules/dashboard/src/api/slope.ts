// 급경사지 API client — slope 모듈 (:8085, context-path /slope).
//   관리지역(총괄·관제) / 계측 상세(areas) / 요약 배지(summary) / 차트(observations).

/** 총괄·관제 관리지역 (89개소). */
export interface ManagedArea {
  /** 원본 관리대장의 법정동·지번. 구버전 서버 응답에는 없을 수 있다. */
  legalDong?: string | null
  legalDongCode?: string | null
  jibun?: string | null
  id: number
  /** 관리번호 */
  mgmtNo: string
  /** 급경사지명 */
  name: string
  /** 등급 A/B/C. 현재 전건 'A' — 안전점검 결과표 업로드 기능 전까지 임시값. */
  grade: string | null
  /** 관리기관 */
  org: string | null
  /** 관리부서. 89건 중 76건만 있다. */
  department: string | null
  lat: number | null
  lng: number | null
}

/** BigDecimal → string 직렬화 대비 number 캐스팅. */
function numOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null
  return typeof v === 'string' ? parseFloat(v) : v
}

export async function fetchManagedAreas(): Promise<ManagedArea[]> {
  const res = await fetch('/slope/api/managed-areas')
  if (!res.ok) {
    throw new Error(`fetchManagedAreas failed: ${res.status} ${res.statusText}`)
  }
  const data = (await res.json()) as ManagedArea[]
  return data.map((a) => ({
    ...a,
    lat: numOrNull(a.lat),
    lng: numOrNull(a.lng),
  }))
}

// --- 계측 상세 (areas) ------------------------------------------------------
// GET /slope/api/areas — 지역 3곳 + 계측기 48. 계측 상세 화면에서 1분 주기 조회.
//   토양함수계는 별도 계측기가 아니라 경사계의 values 안에 함께 온다.

export type SlopeCategory =
  | 'INCLINOMETER' // 경사계
  | 'SOIL_MOISTURE' // 토양함수계
  | 'ROCKFALL_DETECTOR' // 낙석감지기
  | 'RAIN_GAUGE' // 강우량계

/** 계측기의 개별 관측값. 경사계는 X축·Y축·함수비 3개가 온다. */
export interface ObservationValue {
  /** 차트 조회 키. 경사계의 X축·Y축은 같은 id 를 공유하고 함수비는 별도 id. */
  observationItemId: number
  type: SlopeCategory
  /** 업체 측정항목 코드 (U081 X축 / U082 Y축 / U040 함수비 / U010 강우량 / U210 감지). */
  unitType: string
  label: string
  value: number | null
  unit: string
  level: string | null
  measuredAt: string | null
}

export interface SlopeInstrument {
  id: number
  /** 표기명 ('수집2 - 1'). */
  displayName: string
  /** 업체 원본명 ('삼익_수집2_경사_함수-1'). */
  sourceName: string
  category: SlopeCategory
  level: string | null
  lastMeasuredAt: string | null
  /** 국가지점번호. */
  spotNo: string | null
  address: string | null
  installedAt: string | null
  lat: number | null
  lng: number | null
  values: ObservationValue[]
}

export interface SlopeArea {
  id: number
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  grade: string | null
  /** 지역 위험도 표기 (정상/관심/주의/경계/심각). */
  level: string | null
  /** 마지막 관측시각. 계측기가 전부 장애면 null — 단계는 직전 값이 남는다. */
  lastMeasuredAt: string | null
  instruments: SlopeInstrument[]
}

export async function fetchAreas(): Promise<SlopeArea[]> {
  const res = await fetch('/slope/api/areas')
  if (!res.ok) {
    throw new Error(`fetchAreas failed: ${res.status} ${res.statusText}`)
  }
  const data = (await res.json()) as SlopeArea[]
  return data.map((a) => ({
    ...a,
    lat: numOrNull(a.lat),
    lng: numOrNull(a.lng),
    instruments: a.instruments.map((i) => ({
      ...i,
      lat: numOrNull(i.lat),
      lng: numOrNull(i.lng),
      values: i.values.map((v) => ({ ...v, value: numOrNull(v.value) })),
    })),
  }))
}

// --- 요약 바 (areas/summary) ------------------------------------------------
// GET /slope/api/areas/summary — 지역 배지용. 계측 상세 외 화면에서 1분 주기 조회.

export interface AreaSummary {
  id: number
  name: string
  grade: string | null
  level: string | null
  /** 마지막 관측시각. 계측기가 전부 장애면 null — 단계는 직전 값이 남는다. */
  lastMeasuredAt: string | null
}

export async function fetchAreaSummary(): Promise<AreaSummary[]> {
  const res = await fetch('/slope/api/areas/summary')
  if (!res.ok) {
    throw new Error(`fetchAreaSummary failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as AreaSummary[]
}

// --- 차트 (observations) ----------------------------------------------------
// GET /slope/api/observations/{observationItemId}/chart?range=
//   탭·센서 변경 시 조회. 경사계는 X축·Y축 2선, 나머지는 1선.
//   개발 DB 는 스냅샷이라 points 가 비는 게 정상 — 배포 후 채워진다.

export type ChartRange = 'realtime' | 'hour' | 'day' | 'month'

export interface ChartPoint {
  /** ISO. realtime 은 측정 시각, 집계는 구간 시작. */
  at: string
  value: number | null
  /** 원본이 80% 이상 들어왔는지. 진행 중인 구간과 결측이 많은 지난 구간 모두 false. */
  complete: boolean
}

export interface ChartSeries {
  unitType: string
  label: string
  /** 막대로 그릴지. 강우량 realtime 만 [막대(5분 합계), 선(15분 이동합)] 2선이다. */
  bar?: boolean
  points: ChartPoint[]
}

export interface ChartThreshold {
  /** 표기 단계 (정상/관심/주의/경계/심각). */
  level: string | null
  value: number
}

export interface ObservationChart {
  observationItemId: number
  category: SlopeCategory
  /** 표시 단위 — series 공통. */
  unit: string
  /** 막대로 그릴지 — 시리즈 단위(series[].bar) 로 이동 중이라 없을 수 있다. */
  bar?: boolean
  range: ChartRange
  /** 가로 임계선 — series 공통. 없으면 빈 배열. */
  thresholds: ChartThreshold[]
  series: ChartSeries[]
}

export async function fetchObservationChart(
  observationItemId: number,
  range: ChartRange,
  /** 기간설정 — 'YYYY-MM-DD' (끝 날 포함). 칸 단위는 range. slope 서버 지원 전 (수정사항 15번) */
  period?: { from: string; to: string },
): Promise<ObservationChart> {
  const q = period ? `&from=${period.from}&to=${period.to}` : ''
  const res = await fetch(
    `/slope/api/observations/${observationItemId}/chart?range=${range}${q}`,
  )
  if (!res.ok) {
    throw new Error(
      `fetchObservationChart failed: ${res.status} ${res.statusText}`,
    )
  }
  const raw = (await res.json()) as ObservationChart
  return {
    ...raw,
    bar: raw.bar === true,
    thresholds: (raw.thresholds ?? []).map((t) => ({
      ...t,
      value: numOrNull(t.value) ?? 0,
    })),
    series: (raw.series ?? []).map((s) => ({
      ...s,
      // 시리즈 단위 bar 가 기준. 아직 안 오면 차트 단위 값을 따른다.
      bar: s.bar ?? raw.bar === true,
      points: (s.points ?? []).map((p) => ({
        ...p,
        value: numOrNull(p.value),
      })),
    })),
  }
}

// --- 발령 (alarms) ----------------------------------------------------------
// pending  = 업체가 담당자에게 보낸 '발령이 필요합니다' 문자. 지역당 1건. 1분 주기.
// history  = 스피커·전광판으로 실제 송출된 건 (당일). 1분 주기.
// stats/map = 기간 변경 시 조회.

/** 발령 필요 — 지역별 1건. */
export interface AlarmPending {
  areaName: string
  /** 현재 단계 (정상/관심/주의/경계/심각). */
  level: string | null
  /** 직전 단계. 있으면 '경계 → 심각' 으로 표시. */
  fromLevel: string | null
  occurredAt: string | null
  /** 원인 계측기 표기명 ('수집2 - 3'). 없을 수 있다. */
  cause: string | null
  /** 원인이 된 측정항목 코드 (U081 X축 / U082 Y축 / U040 함수비 …). */
  causeUnitType: string | null
  causeValue: number | null
  causeUnit: string | null
}

export async function fetchAlarmPending(): Promise<AlarmPending[]> {
  const res = await fetch('/slope/api/alarms/pending')
  if (!res.ok) {
    throw new Error(`fetchAlarmPending failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as AlarmPending[]
}

/** 발령 이력 — 실제 발령된 건. */
export interface AlarmHistory {
  areaName: string
  /** 발령자 이름. */
  issuer: string | null
  /** 발령 직전 단계. */
  fromLevel: string | null
  level: string | null
  issuedAt: string | null
  /** 발령 내용 — 원인 계측기가 나열돼 길 수 있다. */
  message: string | null
}

export async function fetchAlarmHistory(): Promise<AlarmHistory[]> {
  const res = await fetch('/slope/api/alarms/history')
  if (!res.ok) {
    throw new Error(`fetchAlarmHistory failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as AlarmHistory[]
}

/** 기간 통계. byLevel 키는 표기 단계(한글). */
export interface AlarmStats {
  issued: number
  released: number
  byLevel: Record<string, number>
  monthly: { month: string; count: number }[]
}

export async function fetchAlarmStats(
  from: string,
  to: string,
): Promise<AlarmStats> {
  const res = await fetch(
    `/slope/api/alarms/stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  )
  if (!res.ok) {
    throw new Error(`fetchAlarmStats failed: ${res.status} ${res.statusText}`)
  }
  const raw = (await res.json()) as AlarmStats
  return {
    issued: Number(raw.issued ?? 0),
    released: Number(raw.released ?? 0),
    byLevel: raw.byLevel ?? {},
    monthly: raw.monthly ?? [],
  }
}

/** 지도 발령 빈도 버블 — 지역별 기간 내 건수. */
export interface AlarmMapPoint {
  areaId: number
  name: string
  lat: number | null
  lng: number | null
  count: number
}

export async function fetchAlarmMap(
  from: string,
  to: string,
): Promise<AlarmMapPoint[]> {
  const res = await fetch(
    `/slope/api/alarms/map?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  )
  if (!res.ok) {
    throw new Error(`fetchAlarmMap failed: ${res.status} ${res.statusText}`)
  }
  const data = (await res.json()) as AlarmMapPoint[]
  return data.map((p) => ({
    ...p,
    lat: numOrNull(p.lat),
    lng: numOrNull(p.lng),
    count: Number(p.count ?? 0),
  }))
}
