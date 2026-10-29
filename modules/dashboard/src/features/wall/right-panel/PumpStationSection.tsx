// 배수펌프장 메인 영역 — W 464 × H 944, 헤더 (H 56) + 바디 (H 636) + 하단 3 column wrapper.
// 바디 = 요약 row + PumpItem grid (2 열, 펌프장 수만큼 row).
// 하단 3 column = 육갑문 / 급경사지 / 지진가속도.
//
// 데이터 소스: 백엔드 /api/pump-stations (fetchPumpStations).
//   현재는 equipment.state 가 모두 null (실시간 미연동) → 가동 카운트 모두 0 으로 표출.

import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/layout/Panel'
import {
  fetchPumpStations,
  type PumpStation,
} from '@/api/pumpStation'
import {
  pumpMotorCount,
  pumpMotorRunningCount,
  isStationRunning,
} from '@/features/menus/pump-station/pumpStationCounts'
import { splitPumpStationName } from '@/features/menus/pump-station/usePumpStations'
import {
  BORDERS,
  COLORS,
  PANEL_BG,
  SHADOWS,
  TEXT_STYLES,
} from '@/styles/designTokens'
import { BottomColumns } from './BottomColumns'
import { PumpItem } from './PumpItem'
import { PumpSummaryRow } from './PumpSummaryRow'

const H3_TEXT = {
  ...TEXT_STYLES.h3,
  color: COLORS.neutral50,
  textAlign: 'center' as const,
  lineHeight: '32px',
  WebkitTextStroke: `1px ${COLORS.neutral500}`,
}

export function PumpStationSection() {
  // 백엔드 fetch — mount 시 1회. 응답 전엔 빈 배열 → placeholder (요약 0/0).
  const [stations, setStations] = useState<PumpStation[]>([])
  useEffect(() => {
    fetchPumpStations()
      .then(setStations)
      .catch((err) => console.warn('[pump-stations] fetch 실패', err))
  }, [])

  // 가나다순 정렬 + 긴 이름 2줄 분리 (가상시설0274/가상시설0718) — 메뉴 패널과 일관.
  // PumpItem 이 whiteSpace: 'pre-line' 이라 '\n' 으로 줄바꿈.
  const pumps = useMemo(
    () =>
      [...stations]
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
        .map((s) => ({
          id: s.id,
          name: splitPumpStationName(s.name).join('\n'),
          current: pumpMotorRunningCount(s),
          total: pumpMotorCount(s),
        })),
    [stations],
  )
  const runningCount = useMemo(
    () => stations.filter(isStationRunning).length,
    [stations],
  )
  const totalCount = stations.length

  return (
    <div
      className="flex flex-col items-center"
      style={{
        width: '464px',
        height: '944px',
        borderRadius: '20px',
        boxShadow: SHADOWS.card,
      }}
    >
      {/* 헤더 — W 464 H 56 */}
      <Panel.Header
        width="464px"
        height="56px"
        padding="9px 0 4.5px 0"
        borderRadius="16px 16px 0 0"
      >
        <span style={H3_TEXT}>배수펌프장</span>
      </Panel.Header>

      {/* 바디 — W 464 H 636, padding 12/16/16/16, gap 8, plus-darker bg */}
      <div
        className="flex flex-col items-center self-stretch"
        style={{
          height: '636px',
          padding: '12px 16px 16px 16px',
          gap: '8px',
          borderRadius: '0 0 16px 16px',
          borderRight: BORDERS.panelDark,
          borderBottom: BORDERS.panelDark,
          borderLeft: BORDERS.panelDark,
          background: PANEL_BG.body,
          backgroundBlendMode: 'plus-darker',
        }}
      >
        <PumpSummaryRow runningCount={runningCount} totalCount={totalCount} />

        {/* 작은 아이템 grid — 2 × 6, gap 8, 각 W 212 H 80 */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: '212px 212px',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          {pumps.map((p) => (
            <PumpItem
              key={p.id}
              name={p.name}
              current={p.current}
              total={p.total}
            />
          ))}
        </div>
      </div>

      {/* 하단 3 column — 위 바디와 8px gap */}
      <BottomColumns />
    </div>
  )
}
