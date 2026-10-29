// 배수펌프장 사이드 패널 — 표 (헤더 row + station rows).
//   헤더: 구분 / 현재수위 / 토출량(m³/min) / 가동현황 + 4 legends.
//   station/legend 데이터는 pumpStations.ts (지도 마커와 공유).

import { COLORS } from '@/styles/designTokens'
import { PUMP_STATUS_LEGEND } from './pumpStations'
import { usePumpStations } from './usePumpStations'
import { HeaderText, NarrowCell, StatusCell, StatusLegend } from './panelCells'
import { PumpStationRow } from './PumpStationRow'

interface Props {
  /** row 클릭 시 호출 — station 의 join 된 이름 ("가상시설0411", "가상시설0424", "가상시설04723" 등) */
  onSelectStation?: (name: string) => void
}

export function PumpStationPanel({ onSelectStation }: Props = {}) {
  const stations = usePumpStations()
  return (
    <div className="flex h-full w-full flex-col">
      {/* 헤더 row — H 63, bg Neutral-500 */}
      <div
        className="flex shrink-0 items-center justify-center self-stretch"
        style={{ height: '63px', background: COLORS.neutral500 }}
      >
        <NarrowCell>
          <HeaderText>구분</HeaderText>
        </NarrowCell>
        <NarrowCell>
          <HeaderText>현재</HeaderText>
          <HeaderText>수위</HeaderText>
        </NarrowCell>
        {/* 토출량 (m³/min) — 단위 부분만 별도 스타일 */}
        <NarrowCell>
          <HeaderText>토출량</HeaderText>
          <span
            style={{
              color: COLORS.neutral100,
              opacity: 0.75,
              fontFamily: 'Roboto',
              fontSize: '13px',
              fontWeight: 400,
              lineHeight: '16px',
              textAlign: 'center',
            }}
          >
            (m³/min)
          </span>
        </NarrowCell>
        {/* 가동현황 — 제목 + legend 4 종 */}
        <StatusCell>
          <div className="flex items-center" style={{ gap: '20px' }}>
            <HeaderText>가동현황</HeaderText>
            <div className="flex items-center" style={{ gap: '8px' }}>
              {PUMP_STATUS_LEGEND.map((s) => (
                <StatusLegend
                  key={s.label}
                  label={s.label}
                  fill={s.fill}
                  stroke={s.stroke}
                />
              ))}
            </div>
          </div>
        </StatusCell>
      </div>

      {/* body — station rows. flex-1/min-h-0 → 패널 남은 공간 차지.
          각 row 는 flex: 1 균등 분배 → 펌프장 수 변동해도 패널 H 그대로 유지.
          인접 row border 겹침 위해 첫 row 제외 marginTop -1. */}
      <div
        className="flex flex-col items-start self-stretch"
        style={{ flex: '1 1 0', minHeight: 0 }}
      >
        {stations.map((s, i) => (
          <PumpStationRow
            key={i}
            station={s}
            marginTop={i > 0 ? -1 : 0}
            onClick={
              onSelectStation ? () => onSelectStation(s.name.join('')) : undefined
            }
          />
        ))}
      </div>
    </div>
  )
}
