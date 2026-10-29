// 레이어 메타 API client.
// 백엔드: GET /api/layers → 지도 레이어 종류별 { code, name, color, displayOrder }.
//   dev 중 Vite proxy 가 /api 를 백엔드 (8080) 로 포워딩.
//
// 각 시설물 응답의 layerCode 와 매칭되는 마스터 목록.
//   프론트 하드코딩 색/이름 대신 여기서 온 값으로 레이어 패널 / 범례 / 마커색 구동.
//   백엔드가 주는 레이어만 노출 (현재 8개, displayOrder 에 gap 있음 — 미구현 종류는 미포함).

/** 백엔드 레이어 code — 시설물 응답의 layerCode 와 동일 값. */
export type LayerCode =
  | 'PUMP_STATION' // 배수펌프
  | 'SLOPE_AREA' // 급경사지
  | 'SLOPE_ROCKFALL' // 낙석감지기
  | 'SLOPE_INCLINOMETER' // 계측기
  | 'SLOPE_RAIN_GAUGE' // 강우량계
  | 'BROADCAST' // 재난예경보 (방송장비)
  | 'SIGNBOARD' // 재해전광판
  | 'SHELTER' // 무더위쉼터
  // 백엔드가 새 code 를 추가해도 파싱은 통과 (좁은 union + 확장 허용).
  | (string & {})

export interface LayerMeta {
  id: number
  /** 시설물 layerCode 와 매칭되는 고유 code. */
  code: LayerCode
  /** 표출 이름 (예: '배수펌프', '급경사지'). */
  name: string
  /** 마커 / dot / 범례 색 (예: '#2563EB'). */
  color: string
  /** 패널 / 범례 노출 순서 (오름차순). */
  displayOrder: number
}

/** 지도 레이어 마스터 목록 (displayOrder 오름차순 정렬). */
export async function fetchLayers(): Promise<LayerMeta[]> {
  const res = await fetch('/api/layers')
  if (!res.ok) {
    throw new Error(`fetchLayers failed: ${res.status} ${res.statusText}`)
  }
  const data = (await res.json()) as LayerMeta[]
  return [...data].sort((a, b) => a.displayOrder - b.displayOrder)
}

/** 색 변경 요청 항목 (bulk) — 백엔드 LayerColorUpdate 와 매칭. */
export interface LayerColorUpdate {
  code: string
  /** HEX (#RRGGBB) — 백엔드가 형식 검증. */
  color: string
}

/**
 * 레이어 색 일괄 저장 (PUT /api/layers/colors).
 *   컬러 피커 변경분을 모아뒀다가 polling / 페이지 이탈 시 전송.
 *   keepalive: unload 중에도 전송 완료 보장 (beforeunload 핸들러에서 사용).
 */
export async function putLayerColors(
  updates: LayerColorUpdate[],
  opts?: { keepalive?: boolean },
): Promise<void> {
  const res = await fetch('/api/layers/colors', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
    keepalive: opts?.keepalive,
  })
  if (!res.ok) {
    throw new Error(`putLayerColors failed: ${res.status} ${res.statusText}`)
  }
}
