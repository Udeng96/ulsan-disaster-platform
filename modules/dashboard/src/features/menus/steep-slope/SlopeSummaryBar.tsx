// 급경사지 요약 바 — 서브탭 아래 공통 영역 (3탭 공유).
//   좌: 총 개소 + 등급별 집계 / 우: 상시계측관리체계 지역 탭 (상태 배지)
//   등급 집계는 /slope/api/managed-areas.
//   지역 배지는 총괄·관제·조기경보에서 /slope/api/areas/summary (1분 폴링),
//   계측 상세에서는 이미 1분마다 갱신되는 areas 값을 그대로 쓴다.

import { useMemo } from 'react'
import { AREAS, type Area } from './data'
import { useManagedAreas } from './useManagedAreas'
import { useAreaSummary } from './useAreaSummary'
import { useSlopeAreas } from './useSlopeAreas'
import { RISK_BADGE_COLOR, RISK_TEXT, riskOf } from './variants'

// 일반관리대상 A~C / 붕괴위험지역 D~E.
const GENERAL_GRADES = ['A', 'B', 'C'] as const
const RISK_GRADES = ['D', 'E'] as const

const TITLE_STYLE = {
  color: '#8AADD0',
  fontFamily: 'Roboto',
  fontSize: '18px',
  fontWeight: 500,
  lineHeight: '20px',
} as const

const VALUE_STYLE = {
  color: '#FFF',
  fontFamily: 'Roboto',
  fontSize: '18px',
  fontWeight: 800,
  lineHeight: '20px',
} as const

function Grade({ label, count }: { label: string; count: number }) {
  return (
    <span className="flex items-center" style={{ gap: '6px' }}>
      <span style={TITLE_STYLE}>{label}</span>
      <span style={VALUE_STYLE}>{count}</span>
    </span>
  )
}

interface Props {
  /** 지역 탭 선택 — 총괄·관제 지도 이동 등에 사용. */
  selectedArea?: Area | null
  onSelectArea?: (area: Area) => void
  /** 계측 상세 화면인지 — summary 폴링 대신 areas 값을 쓴다. */
  measureMode?: boolean
}

export function SlopeSummaryBar({
  selectedArea = null,
  onSelectArea,
  measureMode = false,
}: Props) {
  const managedAreas = useManagedAreas()
  const summary = useAreaSummary(!measureMode)
  const areas = useSlopeAreas()
  // 등급별 개소 — 관리지역 목록에서 집계.
  const countByGrade = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const a of managedAreas) {
      if (a.grade) acc[a.grade] = (acc[a.grade] ?? 0) + 1
    }
    return acc
  }, [managedAreas])

  return (
    <div className="slope-summary-bar">
      {/* 좌 — 총 개소 / 일반관리대상 / 붕괴위험지역 */}
      <div className="flex items-center" style={{ gap: '20px' }}>
        <div className="flex items-center" style={{ gap: '12px' }}>
          <span style={TITLE_STYLE}>급경사지</span>
          <span style={VALUE_STYLE}>총 {managedAreas.length} 개소</span>
        </div>
        <div className="flex items-center" style={{ gap: '20px' }}>
          <span style={TITLE_STYLE}>· 일반관리대상</span>
          {GENERAL_GRADES.map((g) => (
            <Grade key={g} label={`${g}등급`} count={countByGrade[g] ?? 0} />
          ))}
        </div>
        <div className="flex items-center" style={{ gap: '20px' }}>
          <span style={TITLE_STYLE}>· 붕괴위험지역</span>
          {RISK_GRADES.map((g) => (
            <Grade key={g} label={`${g}등급`} count={countByGrade[g] ?? 0} />
          ))}
        </div>
      </div>

      {/* 우 — 상시계측관리체계 지역 탭 */}
      <div className="flex items-center" style={{ gap: '28px' }}>
        <span
          style={{
            color: '#1EA7FF',
            fontFamily: 'Roboto',
            fontSize: '22px',
            fontWeight: 600,
            lineHeight: '26px',
          }}
        >
          상시계측관리체계 시스템
        </span>
        <div className="flex items-center" style={{ gap: '10px' }}>
          {AREAS.map((area) => {
            // 화면 순서는 AREAS 고정 — 응답 순서와 무관하게 이름으로 맞춘다.
            const src = measureMode
              ? areas.find((a) => a.name === area)
              : summary.find((s) => s.name === area)
            const risk = riskOf(src?.level)
            return (
              <button
                key={area}
                type="button"
                className={`slope-area-tab ${selectedArea === area ? 'is-active' : ''}`}
                onClick={() => onSelectArea?.(area)}
              >
                <span
                  style={{
                    // 지역 이름 영역 고정 83 — 이름 길이가 달라도 배지 위치가 같다.
                    width: '83px',
                    flexShrink: 0,
                    color: '#FFF',
                    textAlign: 'center',
                    fontFamily: 'Roboto',
                    fontSize: '18px',
                    fontWeight: 500,
                    lineHeight: '20px',
                    // 한글 잉크 중심이 글자 상자 중심보다 위 — 다른 헤더와 같은 1px 보정.
                    position: 'relative',
                    top: '1px',
                  }}
                >
                  {area}
                </span>
                <span
                  className="flex items-center justify-center"
                  style={{
                    // 50×28 고정 (content 26×16 + padding 6/12).
                    width: '50px',
                    height: '28px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    padding: '6px 12px',
                    borderRadius: '100px',
                    background: RISK_BADGE_COLOR[risk],
                    color: '#001229',
                    textAlign: 'center',
                    fontFamily: 'Roboto',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '16px',
                  }}
                >
                  <span style={{ position: 'relative', top: '1px' }}>
                    {RISK_TEXT[risk]}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
