// 우측 패널 하단 3 column 한 개 — W 148, radius 20, shadow.
// 헤더 (H 56) + body, 3 모드 분기:
//   - rows + headers : 표 (육갑문 / 급경사지)
//   - solo           : 라벨 + 단일 pill (예비 — 현재 미사용)
//   - instruments    : 4 채널 계측기 (지진가속도)

import type { CSSProperties } from 'react'
import { Panel } from '@/components/layout/Panel'
import { INTENSITY_LEVELS } from '@/features/menus/earthquake/intensity'
import {
  BORDERS,
  COLORS,
  PANEL_BG,
  SHADOWS,
  STROKES,
  TEXT_STYLES,
} from '@/styles/designTokens'
import { StatusPill } from './StatusPill'
import { B4_TEXT } from './textStyles'
import type {
  MiniColumnInstrument,
  MiniColumnRow,
  MiniColumnSolo,
} from './types'

const H4_TEXT: CSSProperties = {
  ...TEXT_STYLES.h4,
  color: COLORS.neutral50,
  textAlign: 'center',
  lineHeight: '24px',
  WebkitTextStroke: `1px ${COLORS.neutral500}`,
}

interface Props {
  title: string
  /** table 모드 — 구분/상태 헤더 + 다행 표 */
  headers?: [string, string]
  rows?: MiniColumnRow[]
  /** solo 모드 — 라벨 + 단일 상태 pill */
  solo?: MiniColumnSolo
  /** instruments 모드 — 4 개 계측기 cell (지진가속도). 각 cell 2 줄 (코드 + 설명). */
  instruments?: MiniColumnInstrument[]
}

export function MiniColumn({ title, headers, rows, solo, instruments }: Props) {
  return (
    <div
      className="flex flex-col items-start"
      style={{
        width: '148px',
        borderRadius: '20px',
        boxShadow: SHADOWS.card,
      }}
    >
      {/* 헤더 — H 56, padding 9/0/4.5/0, radius 16 16 0 0. */}
      <Panel.Header
        className="self-stretch"
        height="56px"
        padding="9px 0 4.5px 0"
        borderRadius="16px 16px 0 0"
      >
        <span style={H4_TEXT}>{title}</span>
      </Panel.Header>

      {/* 바디 — padding 12/16/16/16, gap 8, radius 0 0 16 16, 3-side border, plus-darker bg */}
      <div
        className="flex flex-col items-center self-stretch"
        style={{
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
        {rows && headers ? (
          <TableBody headers={headers} rows={rows} />
        ) : solo ? (
          <SoloBody solo={solo} />
        ) : instruments ? (
          <InstrumentsBody instruments={instruments} />
        ) : null}
      </div>
    </div>
  )
}

// ── 표 모드 (rows + headers) ──
// W 116 H 168, 헤더 행 (H 28) + 표 바디 (3 행 × 40 + 2 gap × 8 = 136).
function TableBody({
  headers,
  rows,
}: {
  headers: [string, string]
  rows: MiniColumnRow[]
}) {
  return (
    <div
      className="flex flex-col items-start self-stretch"
      style={{ width: '116px', height: '168px', gap: '4px' }}
    >
      {/* 표 헤더 — W 116 H 28, 각 cell (W 62 / W 50) 중앙 정렬 */}
      <div
        className="flex items-center justify-between self-stretch"
        style={{ width: '116px', height: '28px' }}
      >
        <div
          className="flex items-center justify-center"
          style={{ width: '62px' }}
        >
          <span style={B4_TEXT}>{headers[0]}</span>
        </div>
        <div
          className="flex items-center justify-center"
          style={{ width: '50px' }}
        >
          <span style={B4_TEXT}>{headers[1]}</span>
        </div>
      </div>

      {/* 표 바디 — col, gap 8, H 136 */}
      <div
        className="flex flex-col items-center self-stretch"
        style={{ height: '136px', gap: '8px' }}
      >
        {rows.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between self-stretch"
            style={{ height: '40px' }}
          >
            {/* 구분 — W 62 H 40 */}
            <div
              className="flex flex-col items-center justify-center self-stretch"
              style={{ width: '62px', height: '40px' }}
            >
              <span style={B4_TEXT}>{r.label}</span>
            </div>
            {/* 상태 — W 50 H 32 */}
            <div
              className="flex items-center justify-center"
              style={{ width: '50px', height: '32px' }}
            >
              <StatusPill status={r.status} kind={r.kind} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── solo 모드 ── 라벨 + 단일 pill 세로 중앙, W 116 H 168 (표와 동일 영역).
function SoloBody({ solo }: { solo: MiniColumnSolo }) {
  return (
    <div
      className="flex flex-col items-center justify-center self-stretch"
      style={{ width: '116px', height: '168px', gap: '12px' }}
    >
      <span style={B4_TEXT}>{solo.label}</span>
      <StatusPill status={solo.status} kind={solo.kind} />
    </div>
  )
}

// ── instruments 모드 ── 4 채널 cell 세로 스택.
// W 116 H 168 = 4 cell × 36 + 3 gap × 8 = 168.
function InstrumentsBody({
  instruments,
}: {
  instruments: MiniColumnInstrument[]
}) {
  return (
    <div
      className="flex flex-col items-center self-stretch"
      style={{ width: '116px', height: '168px', gap: '8px' }}
    >
      {instruments.map((inst) => (
        <InstrumentRow key={inst.code} instrument={inst} />
      ))}
    </div>
  )
}

function InstrumentRow({ instrument }: { instrument: MiniColumnInstrument }) {
  const intensity =
    INTENSITY_LEVELS.find((l) => l.label === instrument.level) ??
    INTENSITY_LEVELS[INTENSITY_LEVELS.length - 1] // fallback: 가장 낮은 단계
  return (
    <div
      className="flex items-center justify-between self-stretch"
      style={{ height: '36px', gap: '4px' }}
    >
      {/* 좌 — 코드 (1줄) + 설명 (1줄) col 스택 */}
      <div
        className="flex flex-col items-start justify-center"
        style={{ flex: '1 1 auto', gap: '2px' }}
      >
        <span
          style={{
            color: COLORS.white,
            fontFamily: 'Roboto',
            fontSize: '13px',
            fontWeight: 600,
            lineHeight: '14px',
            WebkitTextStroke: STROKES.textStandard,
          }}
        >
          {instrument.code}
        </span>
        <span
          style={{
            // neutral100 (#DCE6EE) 85% alpha — instrument 설명 텍스트 톤 다운.
            color: 'rgba(220, 230, 238, 0.85)',
            fontFamily: 'Roboto',
            fontSize: '11px',
            fontWeight: 500,
            lineHeight: '12px',
          }}
        >
          {instrument.description}
        </span>
      </div>
      {/* 우 — level pill (StatusPill 과 동일 사이즈 W50 × H32) */}
      <div
        className="flex items-center justify-center"
        style={{
          width: '50px',
          height: '32px',
          borderRadius: '99px',
          border: BORDERS.pillWhite,
          background: intensity.color,
        }}
      >
        <span
          style={{
            color: intensity.text,
            fontFamily: 'Roboto',
            fontSize: '13px',
            fontWeight: 600,
            lineHeight: '14px',
          }}
        >
          {intensity.label}
        </span>
      </div>
    </div>
  )
}
