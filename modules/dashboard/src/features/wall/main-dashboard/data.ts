// 메인 대시보드 정적 데이터 + feature flag + 매핑 테이블.
// (UI 와 무관한 순수 상수만 모음 — 데이터 보고 싶을 땐 이 파일만 봐도 됨.)

// 좌측 메뉴 탭 — idx 순서대로 6 개.
//   0 배수펌프장, 1 하천시설물, 2 급경사지, 3 지진가속도, 4 재난 예·경보, 5 레이어
export const TABS = [
  '배수펌프장',
  '하천시설물',
  '급경사지',
  '지진가속도',
  '재난 예·경보',
  '레이어',
  '관리자',
] as const

export interface CCTVMeta {
  number: number
  name: string
  /** CCTV 관리번호 (cctvId). Xeus 플레이어 cctvMgrNo. unassigned 슬롯은 undefined. */
  cctvId?: string
}

// 투망 비활성 시 CCTV 칸 fallback — name 자리에 안내 문구.
export const UNASSIGNED_CCTV_LIST: CCTVMeta[] = [
  { number: 1, name: '할당된 CCTV 없음' },
  { number: 2, name: '할당된 CCTV 없음' },
  { number: 3, name: '할당된 CCTV 없음' },
  { number: 4, name: '할당된 CCTV 없음' },
  { number: 5, name: '할당된 CCTV 없음' },
]

// 메뉴 idx 중 "공통 구성" — 지도 + CCTV + 사이드 패널 layout 사용하는 메뉴들.
//   (0 배수펌프장, 2 급경사지, 3 지진가속도, 5 레이어)
//   1 하천시설물, 4 재난 예·경보 는 별도 구성 (추후).
export const COMMON_MENU_INDICES = [0, 2, 3, 5]

// 헤더 우측 주소 검색바 일시 숨김 — 나중에 활성화 시 true.
export const SHOW_ADDRESS_SEARCH = true
