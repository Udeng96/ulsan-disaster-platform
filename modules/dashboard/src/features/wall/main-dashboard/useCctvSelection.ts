// 메뉴 컨텍스트별 CCTV 선택 + rotation 훅.
//   - 입력: activeTabIdx (현재 메뉴), selectedPumpRegion (배수펌프장 detail 지역),
//           searchTarget (주소 검색 위치 — 있으면 최근접 5개 고정)
//   - 출력: cctvList (CCTV 마스터), activeCctvList (우 패널 5 cell), hasCctv (배지 표출 여부)
//
// 흐름: CCTV fetch → 분류(facClfy/facSubClfy)별 필터 (contextCctvList) → 5 개씩 rotation (displayed5)
//       → CCTVMeta 5 cell 매핑 (부족분 placeholder).

import { useEffect, useMemo, useState } from 'react'
import type { FacilityListItem } from '@/api/facility'
import { fetchCctvList, toFacilityItems, type CctvItem } from '@/api/cctv'
// 분류 코드 정의는 관리자 화면과 같은 것을 쓴다 (한 곳에서만 관리).
import { CLASSIFICATIONS } from '@/features/admin/cctv/classification'
import { CCTV_ETC_REGION_ID } from '@/features/menus/layer/cctvLayer'
import { UNASSIGNED_CCTV_LIST, type CCTVMeta } from './data'

const CCTV_ROTATION_MS = 30000

// 메뉴 → CCTV 시설물 분류(facClfy). 서버가 CCTV 마다 facilities 로 내려준다.
//   여기에 없는 메뉴(하천 1 / 레이어 5)는 전체 CCTV 를 쓴다.
const MENU_FAC_CLFY: Record<number, string> = {
  0: 'PUMP_STATION',
  2: 'SLOPE',
  3: 'SEISMOMETER',
  4: 'DISASTER_ALERT',
}

// 배수펌프장 상세의 지역명 → 하위 분류(facSubClfy).
//   지역명이 곧 분류 라벨이라 CLASSIFICATIONS 에서 역매핑한다.
const SLOPE_SUB_BY_NAME: Record<string, string> = Object.fromEntries(
  (CLASSIFICATIONS.find((c) => c.code === 'SLOPE')?.subs ?? []).map((s) => [
    s.label,
    s.code,
  ]),
)

const PUMP_SUB_BY_NAME: Record<string, string> = Object.fromEntries(
  (CLASSIFICATIONS.find((c) => c.code === 'PUMP_STATION')?.subs ?? []).map(
    (s) => [s.label, s.code],
  ),
)

export interface CctvSelection {
  /** CCTV 시설물 마스터 (재해전광판 미리보기 등에서 직접 참조). */
  cctvList: FacilityListItem[]
  /** 우 패널 5 cell (부족분은 UNASSIGNED placeholder). */
  activeCctvList: CCTVMeta[]
  /** 표출할 CCTV 가 1 개 이상인지 (badge 표출 여부). */
  hasCctv: boolean
  /** 우 패널에 실제 표출 중인 CCTV (좌표 포함) — 지도 reticle 강조용. 최대 5개. */
  displayedCctvList: FacilityListItem[]
  /** 메뉴 분류로 CCTV 를 거르는 함수 — 지도 마커는 '지금 보고 있는' 메뉴 기준이라 따로 뽑는다.
   *  (우측 패널 목록은 전환 애니메이션 때문에 직전 메뉴를 유지하는 경우가 있다.) */
  cctvOfMenu: (menuIdx: number) => FacilityListItem[]
}

export function useCctvSelection(
  activeTabIdx: number,
  selectedPumpRegion: string | null,
  /** 지점 고정 — 있으면 그 지점 최근접 5개로 고정 (순환 없음).
   *  우선순위: 이벤트 > 주소 검색/투망 > 메뉴 분류 > 전체.
   *  호출처에서 그 순서로 하나만 넘긴다. */
  searchTarget?: { lat: number; lng: number } | null,
  /** 레이어 메뉴에서 체크한 행정동 id — 레이어는 독립 운영이라 순환 목록도 여기에 맞춘다.
   *  null 이면 아직 로드 전(전체). 행정동이 없는 CCTV 는 CCTV_ETC_REGION_ID. */
  layerRegionIds?: ReadonlySet<number> | null,
  /** 급경사지 상시계측 지역 (가상시설0432 / 가상시설0553 / 가상시설0680). 고르면 그 지구 CCTV 만. */
  selectedSlopeArea?: string | null,
): CctvSelection {
  // CCTV 시설물 마스터 — /api/cctv 1회 fetch. 실패 시 빈 배열 → placeholder.
  //   분류(facilities)로 걸러야 해서 원본을 들고 있다가 필터 뒤 어댑트한다.
  const [rawList, setRawList] = useState<CctvItem[]>([])
  useEffect(() => {
    fetchCctvList()
      .then(setRawList)
      .catch((err) => console.warn('[cctv] fetch 실패', err))
  }, [])
  const cctvList = useMemo(() => toFacilityItems(rawList), [rawList])

  const [cctvBlockIdx, setCctvBlockIdx] = useState(0)

  // 현재 메뉴 컨텍스트에 맞는 cctv 부분집합 — 서버 분류(facilities) 기준.
  const contextCctvList = useMemo<FacilityListItem[]>(() => {
    const menuClfy = MENU_FAC_CLFY[activeTabIdx]

    // 0) 주소 검색 / 투망 활성 — 그 지점에서 가장 가까운 5개로 고정.
    //    메뉴가 켜져 있으면 그 메뉴 분류 CCTV 안에서만 고른다.
    if (searchTarget) {
      const base = menuClfy
        ? toFacilityItems(
            rawList.filter((c) =>
              c.facilities.some((f) => f.facClfy === menuClfy),
            ),
          )
        : cctvList
      return [...base]
        .sort((a, b) => {
          const da =
            (a.lat - searchTarget.lat) ** 2 + (a.lng - searchTarget.lng) ** 2
          const db =
            (b.lat - searchTarget.lat) ** 2 + (b.lng - searchTarget.lng) ** 2
          return da - db
        })
        .slice(0, 5)
    }

    // 1) 분류가 없는 메뉴 (하천 / 레이어 / 메인) — 전체.
    //    단 레이어 메뉴는 체크한 행정동으로 좁힌다 (지도 마커와 같은 기준).
    const clfy = menuClfy
    if (!clfy) {
      if (activeTabIdx === 5 && layerRegionIds) {
        return cctvList.filter((c) =>
          layerRegionIds.has(c.regionId ?? CCTV_ETC_REGION_ID),
        )
      }
      return cctvList
    }

    // 2) 배수펌프장 상세 — 그 지역(하위 분류) CCTV 만. 매칭 없으면 빈 배열.
    if (activeTabIdx === 0 && selectedPumpRegion) {
      const sub = PUMP_SUB_BY_NAME[selectedPumpRegion]
      if (!sub) return []
      return toFacilityItems(
        rawList.filter((c) =>
          c.facilities.some(
            (f) => f.facClfy === clfy && f.facSubClfy === sub,
          ),
        ),
      )
    }

    // 3) 급경사지 지역 선택 — 그 지구(하위 분류) CCTV 만. 매칭 없으면 빈 배열.
    if (activeTabIdx === 2 && selectedSlopeArea) {
      const sub = SLOPE_SUB_BY_NAME[selectedSlopeArea]
      if (!sub) return []
      return toFacilityItems(
        rawList.filter((c) =>
          c.facilities.some(
            (f) => f.facClfy === clfy && f.facSubClfy === sub,
          ),
        ),
      )
    }

    // 4) 메뉴 분류에 속한 CCTV.
    return toFacilityItems(
      rawList.filter((c) => c.facilities.some((f) => f.facClfy === clfy)),
    )
  }, [
    rawList,
    cctvList,
    activeTabIdx,
    selectedPumpRegion,
    searchTarget,
    layerRegionIds,
    selectedSlopeArea,
  ])

  // 메뉴 분류로 거른 CCTV — 지도 마커용.
  const cctvOfMenu = useMemo(
    () => (menuIdx: number) => {
      const clfy = MENU_FAC_CLFY[menuIdx]
      if (!clfy) return []
      return toFacilityItems(
        rawList.filter((c) => c.facilities.some((f) => f.facClfy === clfy)),
      )
    },
    [rawList],
  )

  // CCTV rotation — 5 개 초과일 때만 30 초마다 다음 5 개로 순환.
  //   - 재난 예·경보 (idx 4) → CCTV 표출 X
  //   - contextCctvList 가 5 개 이하 → 회전 불필요
  const isCctvRotating = contextCctvList.length > 5 && activeTabIdx !== 4
  useEffect(() => {
    if (!isCctvRotating) return
    const id = setInterval(() => setCctvBlockIdx((b) => b + 1), CCTV_ROTATION_MS)
    return () => clearInterval(id)
  }, [isCctvRotating])

  // 표출할 CCTV (FacilityListItem 배열) — 우 패널 cell 소스.
  //   1) 5 개 초과 → 5 개씩 순환
  //   2) 5 개 이하 → 회전 없이 그대로 (빈 cell 은 placeholder)
  //   3) 비어있음 → 빈 배열
  const displayed5 = useMemo<FacilityListItem[]>(() => {
    if (contextCctvList.length === 0) return []
    if (contextCctvList.length <= 5) return contextCctvList
    const start = (cctvBlockIdx * 5) % contextCctvList.length
    return Array.from(
      { length: 5 },
      (_, i) => contextCctvList[(start + i) % contextCctvList.length],
    )
  }, [contextCctvList, cctvBlockIdx])

  // 메뉴 전환 / 펌프 지역 detail 진입 시 rotation idx 리셋 — 새 컨텍스트의 첫 5 개부터.
  useEffect(() => {
    setCctvBlockIdx(0)
  }, [activeTabIdx, selectedPumpRegion, searchTarget])

  // 우 패널 CCTV cell 매핑 (CCTVMeta) — 항상 5 개 cell.
  //   displayed5 가 5 개 미만이면 부족한 cell 은 UNASSIGNED placeholder 로 채움.
  const activeCctvList = useMemo<CCTVMeta[]>(() => {
    if (displayed5.length === 0) return UNASSIGNED_CCTV_LIST
    const meta: CCTVMeta[] = displayed5.map((c, i) => ({
      number: i + 1,
      name: c.name,
      cctvId: c.cctvId,
    }))
    if (meta.length < 5) {
      const padding = UNASSIGNED_CCTV_LIST.slice(meta.length)
      return [...meta, ...padding]
    }
    return meta
  }, [displayed5])

  return {
    cctvList,
    activeCctvList,
    hasCctv: displayed5.length > 0,
    displayedCctvList: displayed5,
    cctvOfMenu,
  }
}
