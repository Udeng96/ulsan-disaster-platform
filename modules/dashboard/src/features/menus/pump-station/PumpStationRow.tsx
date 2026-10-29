// 배수펌프장 패널 body 의 한 station row — 구분 / 수위 / 토출량 / 가동현황.
//   H 61. onClick 있으면 클릭 시 station detail 진입.

import { COLORS } from '@/styles/designTokens'
import {
  PUMP_STATUS_STYLES,
  computeStationStatus,
  type PumpStation,
} from './pumpStations'
import { NarrowCell, PumpKindRow, StatusCell } from './panelCells'

interface Props {
  station: PumpStation
  marginTop?: number
  onClick?: () => void
}

export function PumpStationRow({ station: s, marginTop, onClick }: Props) {
  return (
    <div
      className="pump-station-row flex items-stretch self-stretch"
      style={{
        // 부모(PumpStationPanel body)에서 flex-1 균등 분배 → 펌프장 수 따라 H 자동 조정.
        flex: '1 1 0',
        minHeight: 0,
        marginTop,
        cursor: onClick ? 'pointer' : undefined,
      }}
      onClick={onClick}
    >
      {/* 구분 — 이름 (1~2 줄) + 가동수/총수기 */}
      <NarrowCell background={COLORS.neutral700}>
        {s.name.map((line, idx) => (
          <span
            key={idx}
            style={{
              color: COLORS.neutral50,
              textAlign: 'center',
              fontFamily: 'Roboto',
              fontSize: '17px',
              fontWeight: 500,
              lineHeight: '18px',
            }}
          >
            {line}
          </span>
        ))}
        <div className="flex items-center justify-center">
          <span
            style={{
              // station 상태 색 — 0/N (꺼짐) 파랑, N/N (켜짐) 초록, 오류/정비 시 그 색.
              color: PUMP_STATUS_STYLES[computeStationStatus(s)].fill,
              textAlign: 'center',
              fontFamily: 'Roboto',
              fontSize: '15px',
              fontWeight: 400,
              lineHeight: '16px',
            }}
          >
            {s.active}
          </span>
          <span
            style={{
              color: COLORS.neutral50,
              fontFamily: 'Roboto',
              fontSize: '15px',
              fontWeight: 400,
              lineHeight: '16px',
            }}
          >
            /{s.total}기
          </span>
        </div>
      </NarrowCell>

      {/* 수위 — m + % */}
      <NarrowCell background={COLORS.neutral700}>
        <span
          style={{
            color: COLORS.neutral50,
            textAlign: 'center',
            fontFamily: 'Roboto',
            fontSize: '17px',
            fontWeight: 500,
            lineHeight: '18px',
          }}
        >
          {s.level}
        </span>
        <span
          style={{
            color: COLORS.neutral50,
            textAlign: 'center',
            fontFamily: 'Roboto',
            fontSize: '15px',
            fontWeight: 500,
            lineHeight: '16px',
          }}
        >
          {s.percent}
        </span>
      </NarrowCell>

      {/* 토출량 — 1~2 줄 */}
      <NarrowCell background={COLORS.neutral700}>
        {s.discharge.map((line, idx) => (
          <span
            key={idx}
            style={{
              color: COLORS.neutral50,
              textAlign: 'center',
              fontFamily: 'Roboto',
              fontSize: '17px',
              fontWeight: 500,
              lineHeight: '18px',
            }}
          >
            {line}
          </span>
        ))}
      </NarrowCell>

      {/* 가동현황 — 원동기 / 전동기 row (없는 쪽 생략) */}
      <StatusCell background={COLORS.neutral700}>
        {s.motor && <PumpKindRow label="원동기" values={s.motor} />}
        {s.pump && <PumpKindRow label="전동기" values={s.pump} />}
      </StatusCell>
    </div>
  )
}
