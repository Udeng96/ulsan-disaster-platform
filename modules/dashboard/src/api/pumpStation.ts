// 배수펌프장 API client.
// 백엔드: `GET /api/pump/stations` → 12개 펌프장 목록 (장비 포함).
// dev 중 Vite proxy 가 /api 를 백엔드 (8080) 로 포워딩.
//
// ※ 기존 `src/features/menus/pump-station/pumpStations.ts` 의 PumpStation 타입과
//   필드 구조가 다르다 (백엔드 contract 우선). UI 컴포넌트 매핑은 별도 어댑터에서 처리.

/** 장비 카테고리 — 백엔드 enum 그대로. */
export type EquipmentCategory =
  // 펌프류
  | 'PUMP_GENERIC' // 일반 배수펌프 (펌프1/2/3, 배수펌프1/2/3)
  | 'PUMP_SUB_DRAIN' // 지배수펌프
  | 'PUMP_MISC' // 잡배수펌프, 흡수정펌프
  | 'PUMP_GREASE' // 구리스펌프
  | 'PUMP_COOLING' // 냉각수 공급/리턴/타워 펌프
  | 'PUMP_AIR' // 공기압축기, 에어콤푸레샤
  | 'PUMP_DRAIN' // 드레인펌프
  | 'PUMP_FUEL' // 연료펌프
  // 모터류
  | 'MOTOR_ELEC' // 전동기펌프
  | 'MOTOR_ORIG' // 원동기펌프
  // 기타 설비
  | 'VALVE' // 전동밸브, 토출밸브
  | 'GATE' // 배수문, 유입수문, 태화강수문 등
  | 'SCREEN' // 제진기, 스크린
  | 'WATER_LEVEL' // 내수위계, 외수위계

/** 장비 상태 패턴 — state / value 해석 방식 결정. */
export type StatusPattern = 'ON_OFF' | 'OPEN_CLOSE' | 'WATER_LEVEL'

/** 장비 상태 코드 — statusPattern 별 의미:
 *    ON_OFF / OPEN_CLOSE / WATER_LEVEL 모두 공통 코드:
 *      1 = 켜짐(ON_OFF) / 열림(OPEN_CLOSE) — 정상 가동
 *      2 = 꺼짐(ON_OFF) / 닫힘(OPEN_CLOSE)
 *      3 = 오류
 *      4 = 정비 (백엔드 도메인 명은 '고장' 이지만 UI 라벨은 '정비' 로 표출)
 *    null = 실시간 미연동 (UI 에서 일단 '오류' 로 표출)
 *
 *  value: WATER_LEVEL 등 수치 (수위 m). 미연동 시 null → UI 에서 0 으로 표출. */
export interface Equipment {
  id: number
  /** 장비명 (예: '펌프1', '전동밸브1', '외수위계', '원동기펌프1', '구리스펌프1') */
  name: string
  category: EquipmentCategory
  statusPattern: StatusPattern
  state: number | null
  value: number | null
  /** 표출 우선순위 (낮을수록 먼저) — detail 표 정렬 등에 사용. */
  priority: number
}

export interface PumpStation {
  id: number
  /** 펌프장 이름 (예: '가상시설0411', '가상시설0424', '가상시설0718') */
  name: string
  /** 위도 (BigDecimal 직렬화 → string 으로 올 수도 있어 number 캐스팅) */
  lat: number
  /** 경도 */
  lng: number
  /** 도로명/지번 주소 */
  address: string
  /** 소속 배수구역 (예: '가상시설0411', '가상시설0523', '가상시설0302', '가상시설0262', '가상시설0424') —
   *  좌표 기반 point-in-polygon 추정과 별개로 백엔드가 명시. */
  drainageZone: string
  /** 행정동 (예: '가상시설0412', '가상시설04724동', '대현동') */
  region: string
  equipments: Equipment[]
}

/** 좌표가 BigDecimal string 으로 올 가능성 대비 number 화. */
function normalizeCoords<T extends { lat: number | string; lng: number | string }>(
  d: T,
): T & { lat: number; lng: number } {
  return {
    ...d,
    lat: typeof d.lat === 'string' ? parseFloat(d.lat) : d.lat,
    lng: typeof d.lng === 'string' ? parseFloat(d.lng) : d.lng,
  }
}

/** 배수펌프장 전체 목록 조회. */
export async function fetchPumpStations(): Promise<PumpStation[]> {
  const res = await fetch('/api/pump/stations')
  if (!res.ok) {
    throw new Error(`fetchPumpStations failed: ${res.status} ${res.statusText}`)
  }
  const data = (await res.json()) as PumpStation[]
  return data.map(normalizeCoords)
}
