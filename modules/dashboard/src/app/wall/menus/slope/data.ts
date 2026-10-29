// 급경사지 데이터 — 화면 여러 곳(메뉴·지도·레이어)이 같이 쓰는 목록. 요청은 한 줄씩.
//   관리지역: 처음 한 번. 이름 가나다순 (서버는 관리번호순)
//   지구(/areas): 처음 한 번. 계측 상세가 열려 있는 동안만 1분마다 (업체 측정 주기가 1분)
//   지구 요약(/areas/summary): 계측 상세가 아닐 때 머리 줄 배지용, 1분마다
import { live, once } from '@/shared/api'
import { fetchAreas, fetchAreaSummary, fetchManagedAreas, type AreaSummary, type ManagedArea, type SlopeArea } from './api'

export const POLL_MS = 60_000

export const managedAreas = once<readonly ManagedArea[]>(
  async () => (await fetchManagedAreas()).sort((a, b) => a.name.localeCompare(b.name, 'ko')),
  [],
  'slope-managed-areas',
)

export const slopeAreas = live<readonly SlopeArea[]>(fetchAreas, [], { intervalMs: POLL_MS, label: 'slope-areas' })

export const areaSummary = live<readonly AreaSummary[]>(fetchAreaSummary, [], { intervalMs: POLL_MS, label: 'slope-summary' })
