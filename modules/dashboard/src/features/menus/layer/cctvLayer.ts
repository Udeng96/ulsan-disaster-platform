// CCTV 레이어 — /api/layers 에 없는 프론트 합성 항목.
//   레이어 메뉴에서만 체크박스로 마커 표출을 제어한다 (다른 메뉴에선 항상 표출).
//   라벨 개념이 없어 '라벨보기' 토글은 비활성.

import type { LayerMeta } from '@/api/layer'

export const CCTV_LAYER_CODE = 'CCTV'

/** 범례/마커 색 — Neutral-300. */
export const CCTV_LAYER_COLOR = '#7F97AF'

/** 행정동에 매칭되지 않는 CCTV 를 모으는 그룹 (regionId 가 없거나 목록에 없는 id). */
export const CCTV_ETC_REGION_ID = -1
export const CCTV_ETC_REGION_NAME = '기타'

export const CCTV_LAYER: LayerMeta = {
  id: -1, // 백엔드 레이어가 아니라 합성 항목 (실제 id 없음)
  code: CCTV_LAYER_CODE,
  name: 'CCTV',
  color: CCTV_LAYER_COLOR,
  displayOrder: 0,
}
