// CCTV 시설물 분류 — 화면 메뉴 기준 (레이어 code 와 같은 표기).
//   ⚠️ 백엔드 스키마 확정 전 임시 상수. /api/cctv/classifications 가 생기면 그걸로 교체한다.
//   CCTV 하나가 여러 분류·여러 하위 분류에 속할 수 있다 (다중 선택).

export interface ClassificationOption {
  code: string
  label: string
  /** 하위 분류 — 없으면 상위만 선택한다. */
  subs: { code: string; label: string }[]
}

export const CLASSIFICATIONS: ClassificationOption[] = [
  {
    code: 'PUMP_STATION',
    label: '배수펌프장',
    subs: [
      { code: 'PUMP_SAMSAN', label: '가상시설0411' },
      { code: 'PUMP_SAMSAN_BONDONG', label: '가상시설0424' },
      { code: 'PUMP_YEOCHEON', label: '가상시설0523' },
      { code: 'PUMP_DOSAN', label: '가상시설0274' },
      { code: 'PUMP_NAMJUNG', label: '가상시설0242' },
      { code: 'PUMP_TAEHWA', label: '가상시설0718' },
      { code: 'PUMP_DONGSEO', label: '가상시설0291' },
      { code: 'PUMP_DONGBAEK', label: '가상시설0287' },
      { code: 'PUMP_SINJEONG', label: '가상시설0472' },
      { code: 'PUMP_SINJEONG3', label: '가상시설0479' },
      { code: 'PUMP_YAEUM', label: '가상시설0502' },
      { code: 'PUMP_DUWANG', label: '가상시설0302' },
      { code: 'PUMP_DALDONG', label: '가상시설0262' },
    ],
  },
  {
    code: 'SLOPE',
    label: '급경사지',
    subs: [
      { code: 'SLOPE_SAMIK', label: '가상시설0432' },
      { code: 'SLOPE_UJU', label: '가상시설0553' },
      { code: 'SLOPE_EUNWOLBONG', label: '가상시설0680' },
    ],
  },
  {
    code: 'SEISMOMETER',
    label: '지진가속도',
    subs: [
      { code: 'US_NGG', label: '가상시설0683(3축)' },
      { code: '가상시설0204', label: '가상시설0714(2축)' },
      { code: '가상시설0205', label: '가상시설0714(1축)' },
      { code: '가상시설0203', label: '가상시설0715(3축)' },
    ],
  },
  {
    code: 'DISASTER_ALERT',
    label: '재난 예·경보',
    subs: [
      { code: 'BROADCAST', label: '자동 음성 통보' },
      { code: 'SIGNBOARD', label: '재해 문자 전광판' },
    ],
  },
  { code: 'ETC', label: '해당 없음', subs: [] },
]

/** 상위 분류 색 — 운영 지도의 레이어 색과 같게 (마커·범례와 눈이 헷갈리지 않도록). */
export const CLFY_COLOR: Record<string, string> = {
  PUMP_STATION: '#2563EB',
  SLOPE: '#F59E0B',
  SEISMOMETER: '#784D27',
  DISASTER_ALERT: '#DB2777',
  ETC: '#7F97AF',
}

/** code → 라벨 (뱃지 표기용). */
export const LABEL_BY_CODE: Record<string, string> = Object.fromEntries(
  CLASSIFICATIONS.flatMap((c) => [
    [c.code, c.label] as const,
    ...c.subs.map((s) => [s.code, s.label] as const),
  ]),
)
