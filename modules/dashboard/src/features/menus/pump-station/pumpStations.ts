// 배수펌프장 패널 + 지도 마커 공유 데이터.
// 패널 (PumpStationPanel) 과 마커 (PumpMarkers) 가 같은 station 상태를 보여주도록 단일 소스로 둠.
// 추후 백엔드 API 로 받아오면 PUMP_STATIONS 를 fetch 결과로 교체.

// 개별 motor / pump value 의 상태.
//   undefined → 켜짐 (정상 가동), 'off' / 'error' / 'maintenance' → 박스 강조 + station 상태 도출.
export type PumpValueStatus = 'off' | 'error' | 'maintenance'

export interface PumpValue {
  value: string
  status?: PumpValueStatus
}

export interface PumpStation {
  /** 이름 — 패널 셀에서 1~2 줄로 분리 표출. join 시 facility name 매칭 키. */
  name: readonly string[]
  active: number
  total: number
  level: string
  percent: string
  discharge: readonly string[]
  motor?: readonly PumpValue[]
  pump?: readonly PumpValue[]
}

// 12 펌프장 데이터.
// motor/pump 값은 **현재 실제 출력 (real-time kW)** 모델.
//   - 꺼짐 (active=0 또는 status=off): 0kW
// 실측 데이터 연동 전엔 전체 꺼짐 (active = 0) → 모든 motor/pump 값 0.
// discharge / level / percent 도 현재 운영값 (연동 전엔 0 / 기본값).
//
// motor/pump 배열 길이 (slot 수) 는 station 별 하드웨어 구성을 의미 — 길이는 spec 정보 보존.
export const PUMP_STATIONS: readonly PumpStation[] = [
  { name: ['가상시설0411'], active: 0, total: 7, level: '1.5m', percent: '(0%)', discharge: ['0', '0'],
    motor: [{ value: '0' }, { value: '0' }, { value: '0' }, { value: '0' }, { value: '0' }],
    pump: [{ value: '0' }, { value: '0' }] },
  { name: ['가상시설0523'], active: 0, total: 9, level: '1.5m', percent: '(0%)', discharge: ['0', '0'],
    motor: [{ value: '0' }, { value: '0' }, { value: '0' }, { value: '0' }, { value: '0' }],
    pump: [{ value: '0' }, { value: '0' }, { value: '0' }, { value: '0' }] },
  { name: ['가상시설0472'], active: 0, total: 2, level: '1.5m', percent: '(0%)', discharge: ['0'],
    pump: [{ value: '0' }, { value: '0' }] },
  { name: ['가상시설0502'], active: 0, total: 3, level: '1.5m', percent: '(0%)', discharge: ['0', '0'],
    motor: [{ value: '0' }, { value: '0' }],
    pump: [{ value: '0' }] },
  { name: ['가상시설0411', '본동'], active: 0, total: 3, level: '1.5m', percent: '(0%)', discharge: ['0', '0'],
    motor: [{ value: '0' }, { value: '0' }],
    pump: [{ value: '0' }] },
  { name: ['가상시설0287'], active: 0, total: 2, level: '1.5m', percent: '(0%)', discharge: ['0'],
    pump: [{ value: '0' }, { value: '0' }] },
  { name: ['가상시설0291'], active: 0, total: 2, level: '1.5m', percent: '(0%)', discharge: ['0'],
    pump: [{ value: '0' }, { value: '0' }] },
  { name: ['태화', '강역'], active: 0, total: 2, level: '1.5m', percent: '(0%)', discharge: ['0'],
    pump: [{ value: '0' }, { value: '0' }] },
  { name: ['도산'], active: 0, total: 2, level: '1.5m', percent: '(0%)', discharge: ['0'],
    pump: [{ value: '0' }, { value: '0' }] },
  { name: ['가상시설0242'], active: 0, total: 2, level: '1.5m', percent: '(0%)', discharge: ['0'],
    pump: [{ value: '0' }, { value: '0' }] },
  { name: ['가상시설0302'], active: 0, total: 2, level: '1.5m', percent: '(0%)', discharge: ['0'],
    pump: [{ value: '0' }, { value: '0' }] },
]

// station overall 상태 — 4 종.
export type PumpStationStatus = '켜짐' | '꺼짐' | '오류' | '정비'

export interface PumpStatusStyle {
  label: PumpStationStatus
  /** legend dot fill (solid) — PumpStationPanel 의 StatusDot 에서 사용 */
  fill: string
  /** legend dot stroke */
  stroke: string
  /** 지도 마커 라벨 배경 (75% 알파) */
  labelBg: string
  /** 지도 마커 라벨 텍스트 색 */
  labelText: string
  /** 패널 내 value chip 배경 (50% 알파). 켜짐 은 chip 없음 → null */
  chipBg: string | null
}

export const PUMP_STATUS_STYLES: Record<PumpStationStatus, PumpStatusStyle> = {
  '켜짐': {
    label: '켜짐',
    fill: '#45E36C', stroke: '#AFFBC2',
    labelBg: 'rgba(69, 227, 108, 0.75)', labelText: '#001229',
    chipBg: null,
  },
  '꺼짐': {
    label: '꺼짐',
    fill: '#6D7CFF', stroke: '#BEC5FF',
    // default 상태 — 라벨 bg 는 흰 75% (normal 라벨과 동일). text 는 PumpMarkers 에서
    // 아이콘 색 (pumpColor) 사용하므로 labelText 는 실제 표출엔 영향 없음.
    labelBg: 'rgba(255, 255, 255, 0.75)', labelText: '#FFFFFF',
    chipBg: 'rgba(109, 124, 255, 0.50)',
  },
  '오류': {
    label: '오류',
    fill: '#FF4245', stroke: '#FFBCBD',
    labelBg: 'rgba(255, 66, 69, 0.75)', labelText: '#FFFFFF',
    chipBg: 'rgba(255, 66, 69, 0.50)',
  },
  '정비': {
    label: '정비',
    fill: '#8F979F', stroke: '#E2E9EF',
    labelBg: 'rgba(143, 151, 159, 0.75)', labelText: '#001229',
    chipBg: 'rgba(143, 151, 159, 0.50)',
  },
}

// 패널 헤더의 4 종 legend 순서 — 켜짐 → 꺼짐 → 오류 → 정비.
export const PUMP_STATUS_LEGEND: ReadonlyArray<PumpStatusStyle> = [
  PUMP_STATUS_STYLES['켜짐'],
  PUMP_STATUS_STYLES['꺼짐'],
  PUMP_STATUS_STYLES['오류'],
  PUMP_STATUS_STYLES['정비'],
]

// 패널 셀 내 value chip 배경 — PumpValueStatus → 50% 알파 색.
export const VALUE_STATUS_TO_STATION_STATUS: Record<PumpValueStatus, PumpStationStatus> = {
  off: '꺼짐',
  error: '오류',
  maintenance: '정비',
}

// 심각도 — 같은 station 의 여러 value status 중 가장 심한 것이 station 상태가 됨.
const SEVERITY: Record<PumpValueStatus, number> = {
  error: 3,
  maintenance: 2,
  off: 1,
}

/** station overall 상태 도출.
 *  1) motor/pump value 중 error / maintenance status 가 있으면 그쪽 우선 (error > maintenance).
 *  2) 그 외엔 active 가동 대수로 판단 — active === 0 → 꺼짐 (정상 idle), active > 0 → 켜짐 (가동 중).
 *  value-level 'off' 는 부분 가동 의미로만 쓰고 station 전체 상태로 격상 안 함. */
export function computeStationStatus(s: PumpStation): PumpStationStatus {
  let worst: PumpValueStatus | null = null
  let worstSev = 0
  const all = [...(s.motor ?? []), ...(s.pump ?? [])]
  for (const v of all) {
    if (!v.status) continue
    const sev = SEVERITY[v.status]
    if (sev > worstSev) {
      worstSev = sev
      worst = v.status
    }
  }
  if (worst === 'error') return '오류'
  if (worst === 'maintenance') return '정비'
  return s.active > 0 ? '켜짐' : '꺼짐'
}

// facility name → station 매칭용 prefix table. 긴 이름 먼저 검사 (예: "가상시설0424" > "가상시설0411", "가상시설04723" > "가상시설0472")
// 해서 더 specific 한 station 으로 매칭되도록 한다.
const STATIONS_BY_KEY_LENGTH = [...PUMP_STATIONS]
  .map((s) => ({ station: s, key: s.name.join('') }))
  .sort((a, b) => b.key.length - a.key.length)

/** facility (API) name (예: "가상시설0411 배수펌프장") → 매칭되는 PumpStation. 없으면 null. */
export function findStationByFacilityName(
  facilityName: string,
): PumpStation | null {
  for (const { station, key } of STATIONS_BY_KEY_LENGTH) {
    if (facilityName.startsWith(key)) return station
  }
  return null
}
