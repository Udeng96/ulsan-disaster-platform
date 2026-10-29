// 지도 타일 URL — Leaflet (MapView) / MapLibre (MapViewML) 공용.
// 운영자 선택 (MapControls 타일 그룹) 에 따라 동적 교체.
//   normal    : V-World Base — 일반 도로지도 (NGII 산하), `/xdworld` proxy 경유
//   satellite : V-World Satellite — 위성 사진, `/xdworld` proxy 경유
//   terrain   : OpenTopoMap — 등고선 + hillshading (API key 불필요, Korea zoom 17 OK).
//
// terrain 만 dev / prod 다르게 분기:
//   dev (vite dev) → 외부 직접 호출 (개발 PC 인터넷 있으니 빠르고 simple)
//   prod (vite build) → nginx `/opentopo` proxy 경유 (브라우저 PC(224) 외부 차단,
//                       nginx PC(235) 만 외부 가능한 망 구성)
//
// nginx 운영 설정 필수 — `/opentopo/` location 추가 (proxy_pass https://a.tile.opentopomap.org)

import type { TileType } from './MapControls'

const TERRAIN_URL = import.meta.env.DEV
  ? 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png'
  : '/opentopo/{z}/{x}/{y}.png'

export const TILE_URLS: Record<TileType, string> = {
  normal: '/xdworld/2d/Base/service/{z}/{x}/{y}.png',
  satellite: '/xdworld/2d/Satellite/service/{z}/{x}/{y}.jpeg',
  terrain: TERRAIN_URL,
}

// terrain 타일은 zoom 17 까지만 native 제공. 그 이상은 scale up.
export const TERRAIN_MAX_NATIVE_ZOOM = 17

// ── 3D 입체 지형용 DEM(고도) 타일 ──────────────────────────────
// 위 terrain(등고선 이미지) 과 다름 — 이건 고도를 RGB 로 인코딩한 타일로,
// MapLibre raster-dem source + map.setTerrain() 에 써서 지형을 실제 입체로 융기시킨다.
//
// 소스: AWS Terrain Tiles (terrarium 인코딩, 글로벌·무료·키 불필요, 한국 커버).
//   V-World 가 terrain-RGB 타일을 직접 서비스하는지 불명확 → 확인되면 이 URL 만 교체.
//
// dev → AWS 직접, prod → nginx `/terrain-dem` proxy (외부망 차단 대비, opentopo 와 동일 구성).
// nginx 운영 설정 필요 — `/terrain-dem/` → proxy_pass https://s3.amazonaws.com/elevation-tiles-prod/terrarium
export const DEM_TILE_URL = import.meta.env.DEV
  ? 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
  : '/terrain-dem/{z}/{x}/{y}.png'
// terrarium: (R*256 + G + B/256) - 32768 = 고도(m). MapLibre encoding 옵션에 그대로 전달.
export const DEM_ENCODING = 'terrarium' as const
// terrarium 타일은 zoom 15 까지 native.
export const DEM_MAX_ZOOM = 15
