import { Polygon, Polyline } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'

// 배수펌프장 구역 (drainage basin).
//
// ※ 실제 운영 데이터 — 시연용 더미 아님. PUMP_REGIONS 좌표 삭제 / 더미화 금지.
//   (보존 규칙: .claude/rules/stability.md "데이터 보존")
//
// 좌표 출처:
//   - geojson.io 에서 PDF 의 배수구역도 트레이싱한 실측 boundary (lng/lat → lat/lng swap)
//   - 일부 구역은 시각 보정(shiftCoords) 적용 — 겹침 완화용, 원 좌표는 유지.
export interface PumpRegion {
  name: string
  color: string
  /** Leaflet 포맷 [lat, lng] */
  positions: LatLngExpression[]
  /** true → Polyline 으로만 렌더 (boundary 트레이싱 미완 시). default false (Polygon). */
  lineOnly?: boolean
}

// GeoJSON LineString/Polygon 의 [lng, lat] 좌표 배열을 Leaflet 의 [lat, lng] 로 swap.
function geojsonToLeaflet(coords: [number, number][]): LatLngExpression[] {
  return coords.map(([lng, lat]) => [lat, lng] as LatLngExpression)
}

// 좌표 배열 전체에 lat/lng shift (시각 보정용). 단위 = 도.
//   0.001 lat ≈ 110m (남북), 0.001 lng ≈ 90m (가상시설0291, 위도 35° 기준).
//   가상시설0523 polygon 이 가상시설0411과 시각적으로 겹치는 거 줄이기 위해 적용.
function shiftCoords(
  coords: [number, number][],
  deltaLat: number,
  deltaLng: number,
): [number, number][] {
  return coords.map(
    ([lng, lat]) => [lng + deltaLng, lat + deltaLat] as [number, number],
  )
}

// shoelace 면적 (단위 무관, 상대 비교용). positions 는 [lat, lng] tuple 가정.
function polygonAreaApprox(positions: LatLngExpression[]): number {
  let sum = 0
  const n = positions.length
  for (let i = 0; i < n; i++) {
    const [a1, b1] = positions[i] as [number, number]
    const [a2, b2] = positions[(i + 1) % n] as [number, number]
    sum += a1 * b2 - a2 * b1
  }
  return Math.abs(sum) / 2
}

const PUMP_REGIONS: PumpRegion[] = [
  // 가상시설0411배수구역 — geojson.io 트레이싱 (실측 boundary).
  {
    name: '가상시설0411',
    color: '#FFB1C0',
    positions: geojsonToLeaflet([
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
    ]),
  },
  // 가상시설0424배수구역 — geojson.io 트레이싱 (실측 boundary).
  {
    name: '가상시설0424',
    color: '#FF9230',
    positions: geojsonToLeaflet([
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
    ]),
  },
  // 가상시설0523배수구역 — geojson.io 트레이싱 (실측 boundary).
  // 가상시설0472·달동·가상시설0412 일대를 동쪽 (태화강역) 까지 광범위하게 커버. 가상시설0523 펌프장 (0.0, 0.0) 내부 포함.
  // 가상시설0411 polygon 과의 시각적 겹침 조정 — lat -0.0001 (~10m 남쪽), lng 0 (원위치).
  {
    name: '가상시설0523',
    color: '#6D7CFF',
    positions: geojsonToLeaflet(shiftCoords([
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
    ], -0.0001, 0)),
  },
  // 가상시설0291배수펌프장 배수구역 — geojson.io 트레이싱 (실측 boundary).
  // 달동 남서쪽 작은 영역, 가상시설0291 펌프장 (0.0, 0.0) 이 polygon 내부에 위치.
  {
    name: '가상시설0291',
    color: '#45E36C',
    positions: geojsonToLeaflet([
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
    ]),
  },
  // 가상시설0472배수펌프장 배수구역 — geojson.io 트레이싱 (실측 boundary).
  // 가상시설0291 polygon 동쪽 인접, 가상시설0472 펌프장 (0.0, 0.0) 이 동쪽 가장자리 안쪽에 위치.
  {
    name: '가상시설0472',
    color: '#FFD600',
    positions: geojsonToLeaflet([
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
    ]),
  },
  // 가상시설0502배수펌프장 배수구역 — geojson.io 트레이싱 (실측 boundary).
  // 가상시설0502동 북쪽 끝 좁은 strip, 가상시설0502 펌프장 (0.0, 0.0) 이 polygon 내부에 위치.
  {
    name: '가상시설0502',
    color: '#00D2E0',
    positions: geojsonToLeaflet([
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
    ]),
  },
  // 가상시설0302배수펌프장 배수구역 — geojson.io 트레이싱 (실측 boundary).
  // 가상시설0302동 영역. 첫/끝점 ~2m 차이로 잘 닫힘.
  {
    name: '가상시설0302',
    color: '#FF4245',
    positions: geojsonToLeaflet([
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
    ]),
  },
  // 가상시설0262배수구역 — geojson.io 트레이싱 (실측 boundary).
  {
    name: '가상시설0262',
    color: '#DB34F2',
    positions: geojsonToLeaflet([
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
    ]),
  },
]

// 큰 영역이 먼저 (아래) 그려지고 작은 영역이 나중 (위) 에 그려지도록 면적 내림차순 정렬.
// → 작은 polygon 이 큰 polygon 위에 올라옴 (가려지지 않음).
const PUMP_REGIONS_SORTED = [...PUMP_REGIONS].sort(
  (a, b) => polygonAreaApprox(b.positions) - polygonAreaApprox(a.positions),
)
export { PUMP_REGIONS_SORTED as PUMP_REGIONS }

// 점이 polygon 내부에 있는지 ray casting.
function pointInPolygon(
  lat: number,
  lng: number,
  poly: LatLngExpression[],
): boolean {
  let inside = false
  const n = poly.length
  let j = n - 1
  for (let i = 0; i < n; i++) {
    const [yi, xi] = poly[i] as [number, number]
    const [yj, xj] = poly[j] as [number, number]
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi
    ) {
      inside = !inside
    }
    j = i
  }
  return inside
}

// 점이 속한 가장 작은 (가장 specific) polygon 의 이름 반환 — 없으면 null.
// 여러 polygon 이 겹쳐도 가장 specific 한 하나만 매칭 (예: 가상시설0424 펌프가
// 가상시설0523 polygon 에도 포함되지만 더 작은 가상시설0424 polygon 을 primary 로 선택).
//
// PUMP_REGIONS_SORTED 는 면적 내림차순이므로 뒤에서부터 (작은 것부터) 검색.
export function getPrimaryRegionForPoint(
  lat: number,
  lng: number,
): string | null {
  for (let i = PUMP_REGIONS_SORTED.length - 1; i >= 0; i--) {
    const region = PUMP_REGIONS_SORTED[i]
    if (region.lineOnly) continue
    if (pointInPolygon(lat, lng, region.positions)) {
      return region.name
    }
  }
  return null
}

// 배수펌프장 구역 polygon overlay (controlled).
// hover 상태는 상위 (DashboardPage) 가 관리 — PumpMarkers 와 hover 강조 동기화용.
// 클릭 이벤트는 없음 — detail 진입은 사이드 패널의 station row 클릭에서만 발생.
interface Props {
  /** 현재 hover 된 region 이름 (없으면 null). 외부에서 set 가능. */
  hoveredRegion: string | null
  onHoverRegionChange: (name: string | null) => void
  /** false → mouseover 등 이벤트 비활성 + hover 강조 효과 없음.
   *  배수펌프장 메뉴에선 true, 레이어 메뉴에서 단순 배수구역 표출만 할 땐 false. */
  interactive?: boolean
}

export function PumpRegionOverlay({
  hoveredRegion,
  onHoverRegionChange,
  interactive = true,
}: Props) {
  return (
    <>
      {PUMP_REGIONS_SORTED.map((region) => {
        const isHovered = interactive && hoveredRegion === region.name
        const handlers = interactive
          ? {
              mouseover: () => onHoverRegionChange(region.name),
              mouseout: () => onHoverRegionChange(null),
            }
          : {}
        // 기본: 평면 polygon (fill 0.15, stroke 1.5).
        // hover: 진한 fill + 두꺼운 boundary + 다단계 extrusion shadow (CSS .pump-region-hovered).
        const fillOpacity = isHovered ? 0.55 : 0.15
        const strokeWeight = isHovered ? 3.5 : 1.5
        const strokeOpacity = 1
        const className = `pump-region-path${
          isHovered ? ' pump-region-hovered' : ''
        }`

        // lineOnly → Polyline (트레이싱 미완 boundary, fill 없음, 자동닫힘 X)
        if (region.lineOnly) {
          return (
            <Polyline
              key={region.name}
              positions={region.positions}
              interactive={interactive}
              pathOptions={{
                color: region.color,
                weight: strokeWeight,
                opacity: strokeOpacity,
                className,
              }}
              eventHandlers={handlers}
            />
          )
        }
        return (
          <Polygon
            key={region.name}
            positions={region.positions}
            interactive={interactive}
            pathOptions={{
              fillColor: region.color,
              fillOpacity,
              color: region.color,
              weight: strokeWeight,
              opacity: strokeOpacity,
              className,
            }}
            eventHandlers={handlers}
          />
        )
      })}
    </>
  )
}
