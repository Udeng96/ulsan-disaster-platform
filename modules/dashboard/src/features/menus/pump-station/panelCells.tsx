// 배수펌프장 패널 공통 cell / 텍스트 컴포넌트.
//   표 배경: 헤더 row bg Neutral-500, 본문 cell bg Neutral-700.

import type { ReactNode } from 'react'
import { COLORS } from '@/styles/designTokens'
import {
  PUMP_STATUS_STYLES,
  VALUE_STATUS_TO_STATION_STATUS,
  type PumpValue,
} from './pumpStations'
import { StatusDot } from './StatusDot'

// 상태 legend — W 40, dot 위 + 라벨 아래 (gap 4).
export function StatusLegend({
  label,
  fill,
  stroke,
}: {
  label: string
  fill: string
  stroke: string
}) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ width: '40px', gap: '4px', borderRadius: '8px' }}
    >
      <StatusDot fill={fill} stroke={stroke} />
      <span
        style={{
          color: '#F3F8FC',
          textAlign: 'center',
          fontFamily: 'Roboto',
          fontSize: '14px',
          fontWeight: 500,
          lineHeight: '16px',
        }}
      >
        {label}
      </span>
    </div>
  )
}

interface CellProps {
  children?: ReactNode
  background?: string
}

// 좌측 3 cell (구분/수위/토출량) 공통 wrapper — W 64, 3-side border.
//   본문은 bg Neutral-700, 헤더는 row bg 비춰지도록 transparent.
export function NarrowCell({ children, background }: CellProps) {
  return (
    <div
      className="flex flex-col items-center justify-center self-stretch"
      style={{
        width: '64px',
        gap: '2px',
        borderTop: `1px solid ${COLORS.neutral450}`,
        borderBottom: `1px solid ${COLORS.neutral450}`,
        borderLeft: `1px solid ${COLORS.neutral450}`,
        background,
      }}
    >
      {children}
    </div>
  )
}

// 단일 값 표출 — kw 텍스트 빼고 StatusDot 만 (헤더 legend 와 같은 동그라미).
//   status 매핑: undefined → '켜짐', 'off' → '꺼짐', 'error' → '오류', 'maintenance' → '정비'
export function PumpValueChip({ value }: { value: PumpValue }) {
  const stationStatus = value.status
    ? VALUE_STATUS_TO_STATION_STATUS[value.status]
    : '켜짐'
  const style = PUMP_STATUS_STYLES[stationStatus]
  return <StatusDot fill={style.fill} stroke={style.stroke} />
}

// 원동기/전동기 한 줄 — 라벨 + 값 chip 묶음.
//   라벨은 shrink-0 + nowrap — chip 이 많아도 라벨 2줄 wrap 방지.
export function PumpKindRow({
  label,
  values,
}: {
  label: string
  values: readonly PumpValue[]
}) {
  return (
    <div
      className="flex items-center self-stretch"
      style={{ width: '276px', height: '18px', gap: '8px' }}
    >
      <span
        className="shrink-0"
        style={{
          color: COLORS.neutral200,
          textAlign: 'center',
          fontFamily: 'Roboto',
          fontSize: '13px',
          fontWeight: 400,
          lineHeight: '14px',
          letterSpacing: '-0.26px',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      {values.map((v, i) => (
        <PumpValueChip key={i} value={v} />
      ))}
    </div>
  )
}

// 가동현황 cell — flex 1, border 사방.
export function StatusCell({ children, background }: CellProps) {
  return (
    <div
      className="flex flex-col self-stretch"
      style={{
        flex: '1 0 0',
        padding: '0 6px',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: '8px',
        border: `1px solid ${COLORS.neutral450}`,
        background,
      }}
    >
      {children}
    </div>
  )
}

// 헤더 텍스트 — B3, Neutral-100, opacity 0.75.
export function HeaderText({ children }: { children: ReactNode }) {
  return (
    <span
      className="text-b3"
      style={{ color: COLORS.neutral100, textAlign: 'center', opacity: 0.75 }}
    >
      {children}
    </span>
  )
}
