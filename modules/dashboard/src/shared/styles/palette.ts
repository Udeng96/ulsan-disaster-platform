// 색 '데이터' — 화면 꾸밈이 아니라 사용자가 고르는 색 값 (컬러 피커 기본 최근 색).
//   스타일 규칙 검사에서 예외 (rules.test.ts ALLOW).
export const DEFAULT_RECENT_COLORS = ['#EA3654', '#F4A834', '#FFD600', '#45E36C', '#5D96FF', '#333596']
/** 색이 없을 때 피커 시작 색 */
export const FALLBACK_COLOR = '#000000'

/** '#RRGGBB' → 'rgb(R, G, B)' (피커에 보여 줄 글자) */
export function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`
}

/** 캔버스 차트 색 (ECharts 는 CSS 변수를 못 읽는다) — tokens.css 값과 같게 */
export const CHART = {
  /** 선 색 — 경사계 X축 / Y축 순 */
  series: ['#65B2FF', '#FFB65C'],
  /** 여러 센서 전체 차트 선 색 — 센서 순 (수정 14, 가상시설0680 경사 18개까지) */
  sensors: ['#65B2FF', '#FFB65C', '#7BE495', '#FF7A9A', '#C9A2FF', '#5FE3E3', '#FFE066', '#FF9F6B', '#9DB4FF', '#B5F075', '#F28FE0', '#4FD1A5', '#FFC4A3', '#8ED1FC', '#E8A87C', '#A0E7E5', '#D4A5FF', '#F6F193'],
  /** 함수비 막대 (오른쪽 % 축) */
  moisture: 'rgba(69, 227, 108, 0.35)',
  /** 축 글씨 (neutral-300) */
  label: '#7F97AF',
  axisLine: 'rgba(127, 151, 175, 0.4)',
  grid: 'rgba(127, 151, 175, 0.2)',
  white: '#FFFFFF',
  /** 밝은 축 글씨 (neutral-200) — 지진가속도 */
  labelLight: '#B8C8D6',
  /** 지진가속도 선 아래 채움 — 위 → 아래 */
  area: ['rgba(101, 178, 255, 0.35)', 'rgba(101, 178, 255, 0)'],
}

/** 레이어 색이 아직 안 왔을 때 마커·범례 색 (백엔드 레이어 색과 같은 값) — 레이어 code 별 */
export const LAYER_FALLBACK: Record<string, string> = {
  PUMP_STATION: '#2563EB',
  SLOPE_AREA: '#F59E0B',
  SLOPE_MANAGED_AREA: '#D97706',
  SLOPE_ROCKFALL: '#EA580C',
  SLOPE_INCLINOMETER: '#16A34A',
  SLOPE_RAIN_GAUGE: '#84CC16',
  SLOPE_MOISTURE: '#059669',
  SEISMOMETER: '#784D27',
  BROADCAST: '#DB2777',
  SIGNBOARD: '#10B981',
  AIR_QUALITY: '#0EA5E9',
  SHELTER: '#06B6D4',
}

/** 지도 CCTV 마커 색 (지도 엔진은 CSS 변수를 못 읽는다) — 옛 CctvMarkersML 과 같은 값 */
export const CCTV_MAP = {
  /** 낱개 점 (neutral-300) */
  point: '#7F97AF',
  stroke: '#FFFFFF',
  /** 올렸을 때 테두리 (primary) */
  hover: '#1EA7FF',
  /** 묶음 원 바탕·바깥 링·숫자 */
  clusterBody: 'rgba(178, 180, 184, 0.75)',
  clusterRing: 'rgba(27, 27, 28, 0.25)',
  clusterText: '#1B1B1C',
  /** 고른 CCTV 둘레 원 (reticle, NumberBadge 와 같은 보라) */
  reticle: 'rgba(137, 37, 203, 0.85)',
}

/** 급경사지 지구 단계가 정상~심각이 아닐 때('장애'·모르는 코드) 지도 점 (neutral-300) */
export const SLOPE_OTHER_LEVEL = '#7F97AF'

/** 지도 마커 이름표·원 안 글자 (옛 markerElement·.marker-label-content 와 같은 값) */
export const MARKER = {
  text: '#001229',
  stroke: '#FFFFFF',
  boxBg: 'rgba(255, 255, 255, 0.75)',
  /** plain 글씨 둘레 흰 테두리 그림자 */
  halo: 'rgba(255, 255, 255, 0.8)',
}

/** 투망 지점 핀 (위·아래 그라데이션) — 검색 핀(파랑)과 구별, 지도에 없는 연분홍 (사용자 10-20 고름 D) */
export const NET_PIN = { from: '#FF8FE0', to: '#E536B8' }

/** 이벤트 대분류(유형 코드 앞자리) 색 — 목록 유형 칸. 6 긴급구조 · 2 사회재난 · 1 자연재난 · 4 해외재난 · 5 모의훈련 · 9 공지/안내 */
export const EVENT_GROUP_COLOR: Record<string, string> = { '6': '#FF453A', '2': '#FF9F0A', '1': '#30D158', '4': '#BF5AF2', '5': '#64D2FF', '9': '#98A2B3' }
export const EVENT_OTHER_COLOR = '#FFFFFF'
