// 관리자 상태 — 고른 서브탭, 리스트에서 고른 장비 번호(null 이면 운영 현황), 자산대장 검색어 · 보기. 본문은 탭마다 디자인이 나오는 대로 만든다 (사용자 10-22).
import { createStore } from '@/shared/store'

export const ADMIN_TABS = [
  { id: 'server', label: '서버 운영' },
  { id: 'asset', label: '자산대장' },
  { id: 'network', label: '네트워크' },
  { id: 'etc', label: '기타' },
] as const
export type AdminTab = (typeof ADMIN_TABS)[number]['id']

/** 자산대장 표 보기 — 관리·계약 / 기술 사양 (사용자 10-23 캡처) */
export const ASSET_VIEWS = [
  { id: 'contract', label: '관리·계약' },
  { id: 'spec', label: '기술 사양' },
] as const
export type AssetView = (typeof ASSET_VIEWS)[number]['id']

/** keyword · view 는 자산대장 탭 머리(검색 · 보기 버튼)와 본문 표가 같이 씀 */
export const admin = createStore<{ tab: AdminTab; device: number | null; hover: number | null; keyword: string; view: AssetView }>({ tab: 'server', device: null, hover: null, keyword: '', view: 'contract' })
