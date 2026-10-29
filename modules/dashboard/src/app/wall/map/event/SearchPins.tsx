// 주소 검색 핀(파랑)·투망 지점 핀(연분홍) — 하나씩뿐이라 옛 화면과 같은 HTML 마커 (지도 새로 만들기 5단계).
//   투망 핀은 검색 핀과 헷갈리지 않게 지도에 없는 색으로 (사용자 10-20).
import { SearchPinMarker } from '@/features/shared/map/SearchPinMarker'
import { NET_PIN } from '@/shared/styles/palette'
import { dash } from '../../dashboard/state'
import { mapState } from '../state'

export function SearchPins() {
  const map = mapState.use((s) => s.map)
  const search = dash.use((s) => s.searchTarget)
  const net = dash.use((s) => s.netTarget)
  if (!map) return null
  return (
    <>
      {search && <SearchPinMarker map={map} target={search} />}
      {net && <SearchPinMarker map={map} target={net} colors={NET_PIN} />}
    </>
  )
}
