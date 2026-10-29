// 관리자 화면 — 탭(시설물 분류)별 실제 시설물 좌표.
//   CCTV 이름만으로는 어느 시설물 카메라인지 알 수 없어서, 시설물 위치를 지도에 찍고
//   그 주변 CCTV 를 골라 분류하기 위한 데이터.
//   하천시설물은 외부 시스템(iframe)이라 좌표 API 가 없다 → 빈 배열.

import { fetchPumpStations } from '@/api/pumpStation'
import { fetchEarthquakeInstruments } from '@/api/earthquake'
import { fetchBroadcastTerminals, fetchDisasterBoards } from '@/api/facility'
import { CLASSIFICATIONS } from './classification'

export interface FacilityPoint {
  /** 하위 분류 code — 하위가 없는 시설물은 상위 code. */
  subCode: string
  name: string
  lat: number
  lng: number
}

/** 상위 분류까지 붙은 시설물 지점 — 지도에서 분류별 색/필터에 쓴다. */
export interface FacilityPointOf extends FacilityPoint {
  clfy: string
}

/** 좌표가 있는 모든 시설물 — 분류별로 병렬 조회 후 합친다 (실패한 분류는 건너뛴다). */
export async function fetchAllFacilityPoints(): Promise<FacilityPointOf[]> {
  const codes = CLASSIFICATIONS.map((c) => c.code)
  const lists = await Promise.all(
    codes.map((code) =>
      fetchFacilityPoints(code)
        .then((pts) => pts.map((p) => ({ ...p, clfy: code })))
        .catch(() => [] as FacilityPointOf[]),
    ),
  )
  return lists.flat()
}

/** 하위 분류 라벨로 code 를 찾는다 (배수펌프장 '가상시설0411' → PUMP_SAMSAN). */
function subCodeByLabel(clfy: string, name: string): string | null {
  const subs = CLASSIFICATIONS.find((c) => c.code === clfy)?.subs ?? []
  return subs.find((s) => s.label === name.trim())?.code ?? null
}

export async function fetchFacilityPoints(
  clfy: string,
): Promise<FacilityPoint[]> {
  if (clfy === 'PUMP_STATION') {
    const rows = await fetchPumpStations()
    return rows.flatMap((p) => {
      const subCode = subCodeByLabel(clfy, p.name)
      return subCode ? [{ subCode, name: p.name, lat: p.lat, lng: p.lng }] : []
    })
  }
  // 급경사지(SLOPE) 좌표는 slope 모듈 연동과 함께 걷어냈다 — 재구성 시 다시 붙인다.
  if (clfy === 'SEISMOMETER') {
    const rows = await fetchEarthquakeInstruments()
    // 하위 분류 code 가 곧 관측소 코드다.
    return rows.map((i) => ({
      subCode: i.stationCode,
      name: i.installLocation,
      lat: i.lat,
      lng: i.lng,
    }))
  }
  if (clfy === 'DISASTER_ALERT') {
    const [terminals, boards] = await Promise.all([
      fetchBroadcastTerminals(),
      fetchDisasterBoards(),
    ])
    return [
      ...terminals.map((t) => ({
        subCode: 'BROADCAST',
        name: t.name,
        lat: t.lat,
        lng: t.lng,
      })),
      ...boards.map((b) => ({
        subCode: 'SIGNBOARD',
        name: b.name,
        lat: b.lat,
        lng: b.lng,
      })),
    ]
  }
  return []
}

/** 두 지점 거리 (m) — 하버사인. */
export function distanceM(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6_371_000
  const rad = Math.PI / 180
  const dLat = (bLat - aLat) * rad
  const dLng = (bLng - aLng) * rad
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}
