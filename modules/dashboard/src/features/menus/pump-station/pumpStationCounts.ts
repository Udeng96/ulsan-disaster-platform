// 배수펌프장의 "가동 대수" 카운트 헬퍼 — 메뉴 패널 / 우측 패널 공유.
//
// 기준: 원동기(MOTOR_ORIG) + 전동기(MOTOR_ELEC) + 일반 펌프(PUMP_GENERIC) 만 카운트.
//   PUMP_GENERIC = 작은 펌프장의 '펌프1/2/3' — 전동기 펌프로 취급.
//   부속 펌프 (PUMP_SUB_DRAIN/PUMP_GREASE/PUMP_COOLING/PUMP_AIR/PUMP_DRAIN/PUMP_FUEL/PUMP_MISC)
//   와 설비 (VALVE/GATE/SCREEN/WATER_LEVEL) 는 가동 카운트 대상 아님.
//
// state 가 null (백엔드 실시간 미연동) 인 동안 running 항상 0,
// total 만 표출.

import type { EquipmentCategory, PumpStation } from '@/api/pumpStation'

// "원동기 + 전동기 + 일반 펌프" — 가동 카운트에 포함되는 카테고리.
const PUMP_MOTOR_CATEGORIES: ReadonlySet<EquipmentCategory> = new Set([
  'MOTOR_ORIG', // 원동기
  'MOTOR_ELEC', // 전동기 (모터)
  'PUMP_GENERIC', // 일반 펌프 (작은 펌프장의 펌프1/2/3 등)
])

/** 펌프장 내 PUMP/MOTOR 카테고리 전체 개수 (= 표출용 'total'). */
export function pumpMotorCount(s: PumpStation): number {
  return s.equipments.filter((e) => PUMP_MOTOR_CATEGORIES.has(e.category))
    .length
}

/** 펌프장 내 PUMP/MOTOR 중 가동(state==='ON') 개수 (= 표출용 'active'). */
export function pumpMotorRunningCount(s: PumpStation): number {
  return s.equipments.filter(
    (e) => PUMP_MOTOR_CATEGORIES.has(e.category) && e.state === 1,
  ).length
}

/** 펌프장 단위 가동 여부 — PUMP/MOTOR 중 하나라도 ON 이면 true. */
export function isStationRunning(s: PumpStation): boolean {
  return s.equipments.some(
    (e) => PUMP_MOTOR_CATEGORIES.has(e.category) && e.state === 1,
  )
}
