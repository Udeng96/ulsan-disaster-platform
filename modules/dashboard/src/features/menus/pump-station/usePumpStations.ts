// 배수펌프장 hook — 백엔드 /api/pump-stations 호출 + 옛 PumpStation(UI) 형식으로 어댑트.
//
// 컨슈머(PumpStationPanel)는 변경 없음. 데이터 source 만 옛 PUMP_STATIONS 상수 →
// 백엔드 fetch 로 교체.
//
// 어댑터 규칙 (백엔드 카테고리 → UI 라벨):
//   원동기  = MOTOR_ORIG (백엔드)
//   전동기  = MOTOR_ELEC + PUMP_GENERIC (작은 펌프장의 '펌프1/2/3' 도 전동기 펌프로 간주)
//   기타 펌프류 (PUMP_SUB_DRAIN/PUMP_GREASE 등) — 이번 단계에서 UI 미표출
//
//   name      : 백엔드 단일 string → [string]
//   total     : 원동기 + 전동기 개수
//   active    : 위 중 state==='ON' 개수 (현재 모두 0)
//   motor 배열: MOTOR_ORIG equipments
//   pump 배열 : MOTOR_ELEC + PUMP_GENERIC equipments
//   level/percent/discharge : 백엔드 미제공 — default 값
//
// 정렬: 펌프장 이름 가나다순 (ko locale).

import { useEffect, useState } from 'react'
import {
  fetchPumpStations,
  type Equipment,
  type PumpStation as ApiPumpStation,
} from '@/api/pumpStation'
import type { PumpStation, PumpValue } from './pumpStations'

// equipment.state 코드 → 옛 PumpValueStatus 매핑.
//   1 = 켜짐/열림 (정상) → status undefined
//   2 = 꺼짐/닫힘            → 'off'
//   3 = 오류                  → 'error'
//   4 = 정비 (백엔드 명은 '고장') → 'maintenance'
//   null = 실시간 미연동      → 'error' (임시)
function mapStateToStatus(
  state: number | null,
): PumpValue['status'] | undefined {
  if (state === null) return 'error'
  switch (state) {
    case 1:
      return undefined
    case 2:
      return 'off'
    case 3:
      return 'error'
    case 4:
      return 'maintenance'
    default:
      return 'error'
  }
}

/** equipment → PumpValue. value null → '0' (사용자 명세). */
function toPumpValue(e: Equipment): PumpValue {
  return {
    value: e.value !== null ? String(e.value) : '0',
    status: mapStateToStatus(e.state),
  }
}

/** 표 cell 폭(64px) 한계로 긴 이름은 2줄로 분리. 백엔드 단일 string → string[] 변환.
 *  메뉴 패널 / 우측 패널 양쪽에서 공유. */
const NAME_LINE_BREAK: Record<string, readonly string[]> = {
  가상시설0274: ['도산', '사거리'],
  '가상시설0718': ['태화강', '역앞'],
  가상시설0479: ['가상시설04723', '배수문'],
}
export function splitPumpStationName(name: string): readonly string[] {
  return NAME_LINE_BREAK[name] ?? [name]
}

// 현재 수위 — 내수위계 우선, 없으면 외수위계, 없으면 WATER_LEVEL 첫 번째.
//   value null → 0 (사용자 명세).
function pickWaterLevelValue(equipments: readonly Equipment[]): number {
  const inner = equipments.find((e) => e.name === '내수위계')
  const outer = equipments.find((e) => e.name === '외수위계')
  const any = equipments.find((e) => e.category === 'WATER_LEVEL')
  return (inner ?? outer ?? any)?.value ?? 0
}

/** 백엔드 PumpStation → 옛 UI PumpStation 어댑터. */
function adapt(s: ApiPumpStation): PumpStation {
  const motorOrig = s.equipments.filter((e) => e.category === 'MOTOR_ORIG')
  // 전동기 = MOTOR_ELEC. 단, MOTOR_ELEC 이 하나도 없는 작은 펌프장 ('펌프1/2/3' 만
  // 있는 곳) 은 PUMP_GENERIC 을 전동기로 fallback — 옛 frontend 동작과 매칭.
  // (가상시설0523처럼 MOTOR_ELEC 이 있는 곳에서 PUMP_GENERIC '배수펌프' 가 전동기에
  //  중복 카운트되지 않게: 가상시설0523 5+4=9, 가상시설0411 5+2=7.)
  const elecOnly = s.equipments.filter((e) => e.category === 'MOTOR_ELEC')
  const motorElec =
    elecOnly.length > 0
      ? elecOnly
      : s.equipments.filter((e) => e.category === 'PUMP_GENERIC')
  const levelValue = pickWaterLevelValue(s.equipments)

  return {
    name: splitPumpStationName(s.name),
    active: 0, // state 모두 null 인 동안 0
    total: motorOrig.length + motorElec.length, // 원동기 + 전동기
    level: `${levelValue}m`,
    percent: '(0%)',
    discharge: ['0', '0'],
    motor: motorOrig.length > 0 ? motorOrig.map(toPumpValue) : undefined,
    pump: motorElec.length > 0 ? motorElec.map(toPumpValue) : undefined,
  }
}

/** 가나다순(ko) 비교. */
function compareKo(a: PumpStation, b: PumpStation): number {
  return a.name.join('').localeCompare(b.name.join(''), 'ko')
}

// Module-level cache — 한 번 fetch 후 모든 PumpStationPanel mount 에서 즉시 반환.
// 메뉴 토글마다 PumpStationPanel re-mount 시 매번 fetch → 빈 표 → 채움 의 깜빡임 방지.
// rawCached — adapt 전 원본 (detail 패널의 equipments 접근용).
let cached: readonly PumpStation[] | null = null
let rawCached: readonly ApiPumpStation[] | null = null
let inflight: Promise<readonly PumpStation[]> | null = null

function loadOnce(): Promise<readonly PumpStation[]> {
  if (cached) return Promise.resolve(cached)
  if (inflight) return inflight
  inflight = fetchPumpStations()
    .then((items) => {
      rawCached = items
      cached = [...items.map(adapt)].sort(compareKo)
      inflight = null
      return cached
    })
    .catch((err) => {
      console.warn('[pump-stations] fetch 실패', err)
      inflight = null
      return [] as readonly PumpStation[]
    })
  return inflight
}

export function usePumpStations(): readonly PumpStation[] {
  // mount 시 cache 있으면 즉시 채워진 상태로 시작 (깜빡임 X).
  const [stations, setStations] = useState<readonly PumpStation[]>(
    () => cached ?? [],
  )
  useEffect(() => {
    if (cached) return // 이미 cache 됐으면 추가 작업 X
    let cancelled = false
    loadOnce().then((items) => {
      if (!cancelled) setStations(items)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return stations
}

/** 백엔드 원본 station (adapt 전) — detail 패널이 equipments 직접 사용.
 *  name = 배수구역/펌프장 이름 ("가상시설0523", "가상시설0411" 등). 미발견/로딩 전엔 null.
 *  공백 무시 비교 — 메뉴 리스트가 2줄 분리된 이름을 join 하면 공백이 빠져서
 *  ("가상시설0718" → "태화강역앞") 정확 매칭이 실패하는 케이스 대응. */
export function useRawPumpStation(name: string): ApiPumpStation | null {
  const norm = (s: string) => s.replace(/\s+/g, '')
  const find = () =>
    rawCached?.find((s) => norm(s.name) === norm(name)) ?? null
  const [station, setStation] = useState<ApiPumpStation | null>(find)
  useEffect(() => {
    if (rawCached) {
      setStation(find())
      return
    }
    let cancelled = false
    loadOnce().then(() => {
      if (!cancelled) setStation(find())
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])
  return station
}
