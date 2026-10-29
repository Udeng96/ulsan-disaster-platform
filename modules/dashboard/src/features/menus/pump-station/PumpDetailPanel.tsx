// 배수펌프장 상세 사이드 패널 — 장비 상태 grid + 하단 범례.
//
// grid 는 백엔드 equipments 데이터 주도로 구성:
//   1) 장비 이름 뒤 숫자 분리 → 그룹 + #N 인덱스 ("원동기펌프3" → 원동기펌프 그룹 #3)
//   2) 그룹을 GROUP_ORDER (디자인 순서) 로 정렬 — 목록에 없는 그룹은 뒤에 등장순
//   3) row 패킹 — 제목 90 + 칸 78×n 이 패널 폭 480 에 맞게 greedy 로 묶음
//      (가상시설0523 기준 디자인 캡처와 동일 배치가 나옴)
//   4) 수위계 (WATER_LEVEL) 는 마지막 전용 row — 아이콘 칸이 남는 폭 균등 분배
//
// 상태색 (하단 범례 기준):
//   설비(톱니)  1 켜짐→green · 2 꺼짐→red · 3 오류/4 정비/null→blue 고장(정비)
//   밸브/수문   1 열림→green · 2 닫힘→orange · 그 외→blue 고장(정비)

import { Fragment, useMemo, type ReactNode } from 'react'
import { COLORS } from '@/styles/designTokens'
import type { Equipment } from '@/api/pumpStation'
import { StatusGear, gearVariantFromState } from './StatusGear'
import { ValveIcon, type ValveVariant } from './ValveIcon'
import { useRawPumpStation } from './usePumpStations'

interface Props {
  name: string
}

// ---------- 데이터 → grid 구성 ----------

// 디자인 순서 (normalize key = 이름 공백 제거). 없는 그룹은 뒤에 등장순 배치.
//   가상시설0523 디자인 시안 순서 기준 + 가상시설0411 그룹을 row 패킹이 잘 되도록 사이에 배치
//   (한 줄 480 = 제목 90 + 칸 78×n → 2칸 그룹 246 + 1칸 그룹 168 = 414 로 묶임).
const GROUP_ORDER: readonly string[] = [
  '원동기펌프',
  '전동기펌프',
  '전동기제진기', // 가상시설0411 — 전동기(2칸) 와 한 줄 패킹
  '원동기실냉각수펌프',
  '원동기실제진기',
  '전동기실제진기',
  '구리스펌프', // 가상시설0411 — 5칸 한 줄
  '냉각수공급펌프', // 가상시설0411
  '쿨링타워모터', // 가상시설0411 — 냉각수공급(2칸) 과 한 줄 패킹
  '냉각수리턴펌프', // 가상시설0411
  '원동기제진기', // 가상시설0411 — 냉각수리턴(2칸) 과 한 줄 패킹
  '연료펌프',
  '드레인펌프',
  '지배수펌프', // 가상시설0411 — 드레인(1칸→2칸 pad) 과 한 줄 패킹
  '공기압축기', // 가상시설0411 — 2칸이 앞에 와야 잡배수(1칸) 와 묶임
  '잡배수펌프', // 가상시설0411
  '냉각탑펌프',
  '배수펌프',
  '에어콤푸레샤펌프',
  '토출밸브',
  '배수문',
]

// 그룹 표시 라벨 — 제목 칸 (W 90) 에 맞게 축약/줄바꿈. 없으면 그룹명 그대로.
const GROUP_LABEL: Record<string, string> = {
  원동기펌프: '원동기',
  전동기펌프: '전동기',
  원동기실냉각수펌프: '원동기실\n냉각수펌프',
  원동기실제진기: '원동기실\n제진기',
  전동기실제진기: '전동기실\n제진기',
  에어콤푸레샤펌프: '에어콤푸레샤\n펌프',
  드레인펌프: '드레인펌프',
  냉각탑펌프: '냉각탑펌프',
  // 가상시설0411
  전동기제진기: '전동기\n제진기',
  원동기제진기: '원동기\n제진기',
  냉각수공급펌프: '냉각수\n공급펌프',
  냉각수리턴펌프: '냉각수\n리턴펌프',
  쿨링타워모터: '쿨링타워\n모터',
}

type CellKind = 'gear' | 'valve'

interface GridGroup {
  key: string // normalize key
  label: string
  kind: CellKind
  category: string
  /** 백엔드 표출 우선순위 (그룹 내 최소값) — 낮을수록 먼저. */
  priority: number
  items: { index: number | null; state: number | null }[]
}

// 원동기 없는 곳 정렬 tier — 펌프(PUMP_GENERIC) 최우선 → 기타 펌프류 → 나머지 설비.
//   같은 tier 안에서는 백엔드 priority 오름차순, 동순위는 등장순.
function groupTier(g: GridGroup): number {
  if (g.category === 'PUMP_GENERIC') return 0
  if (g.category.startsWith('PUMP_')) return 1
  return 2
}

function valveVariant(state: number | null): ValveVariant {
  switch (state) {
    case 1:
      return 'green' // 열림
    case 2:
      return 'orange' // 닫힘
    default:
      return 'blue' // 고장(정비)
  }
}

/** 이름 뒤 숫자 분리 — "원동기펌프3" → { group: '원동기펌프', index: 3 } */
function parseName(name: string): { group: string; index: number | null } {
  const m = name.trim().match(/^(.*?)\s*(\d+)$/)
  return m
    ? { group: m[1].trim(), index: Number(m[2]) }
    : { group: name.trim(), index: null }
}

const LABEL_W = 90
const CELL_W = 78
const PANEL_W = 480

/** equipments → { rows (gear/valve 그룹), water (수위계 항목) }.
 *  pack=true (원동기 있는 곳): 폭 480 greedy 패킹 (가상시설0523 디자인).
 *  pack=false (없는 곳): 한 줄에 한 그룹만. */
function buildGrid(
  equipments: readonly Equipment[],
  pack: boolean,
): {
  rows: GridGroup[][]
  water: { label: string; priority: number }[]
} {
  const groups = new Map<string, GridGroup>()
  const water: { label: string; priority: number }[] = []

  for (const e of equipments) {
    if (e.category === 'WATER_LEVEL') {
      // 수위계 — 공백은 줄바꿈 ("원동기 수위계" → 2줄)
      water.push({
        label: e.name.trim().replace(/\s+/g, '\n'),
        priority: e.priority,
      })
      continue
    }
    const { group, index } = parseName(e.name)
    const key = group.replace(/\s+/g, '')
    const kind: CellKind =
      e.category === 'VALVE' || e.category === 'GATE' ? 'valve' : 'gear'
    let g = groups.get(key)
    if (!g) {
      g = {
        key,
        // 미등록 그룹 — 이름 공백은 줄바꿈 ("자연배수로 유입수문" → 2줄).
        label: GROUP_LABEL[key] ?? group.replace(/\s+/g, '\n'),
        kind,
        category: e.category,
        priority: e.priority,
        items: [],
      }
      groups.set(key, g)
    }
    g.priority = Math.min(g.priority, e.priority)
    g.items.push({ index, state: e.state })
  }

  // 그룹 정렬 — pack (원동기 있는 곳): GROUP_ORDER (가상시설0523 디자인 순서), 미등록은 뒤에 등장순.
  //   !pack (없는 곳): tier (펌프 → 기타 펌프류 → 나머지) → 백엔드 priority 오름차순,
  //   동순위는 등장순 (stable sort). 그룹 내 #N 오름차순.
  const ordered = [...groups.values()].sort((a, b) => {
    if (pack) {
      const ia = GROUP_ORDER.indexOf(a.key)
      const ib = GROUP_ORDER.indexOf(b.key)
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    }
    return groupTier(a) - groupTier(b) || a.priority - b.priority
  })
  // 수위계도 백엔드 priority 순 (동순위 등장순).
  water.sort((a, b) => a.priority - b.priority)
  ordered.forEach((g) =>
    g.items.sort((a, b) => (a.index ?? 1) - (b.index ?? 1)),
  )

  // pack=false — 한 줄에 한 그룹만.
  if (!pack) {
    return { rows: ordered.map((g) => [g]), water }
  }

  // row 패킹 — 폭 480 안에 그룹 (제목 90 + 칸 78×n) greedy 로 묶음.
  //   마지막이 아닌 그룹은 최소 2칸 폭 차지 (1칸 그룹은 빈 칸 pad) —
  //   뒤 그룹 제목이 항상 같은 x (90+156=246) 에 정렬되도록.
  const naturalW = (g: GridGroup) => LABEL_W + g.items.length * CELL_W
  const paddedW = (g: GridGroup) =>
    LABEL_W + Math.max(g.items.length, 2) * CELL_W
  const rows: GridGroup[][] = []
  let cur: GridGroup[] = []
  for (const g of ordered) {
    if (cur.length === 0) {
      cur = [g]
      continue
    }
    // g 를 붙이면 기존 그룹들은 전부 padded 폭, g 만 natural 폭.
    const w = cur.reduce((sum, x) => sum + paddedW(x), 0) + naturalW(g)
    if (w <= PANEL_W) {
      cur.push(g)
    } else {
      rows.push(cur)
      cur = [g]
    }
  }
  if (cur.length > 0) rows.push(cur)

  return { rows, water }
}

// ---------- 범례 ----------

// 범례 상태 항목 — 아이콘 (20×20) + 라벨.
function LegendStatus({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center" style={{ gap: '4px' }}>
      {icon}
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

// 범례 제목 — ▪점 (3×3) + 라벨.
function LegendTitle({ title, width }: { title: string; width?: string }) {
  return (
    <div className="flex items-center" style={{ gap: '4px' }}>
      <span
        className="shrink-0"
        style={{ width: '3px', height: '3px', background: '#B8C8D6' }}
      />
      <span
        style={{
          width,
          color: '#B8C8D6',
          fontFamily: 'Roboto',
          fontSize: '16px',
          fontWeight: 500,
          lineHeight: '20px',
        }}
      >
        {title}
      </span>
    </div>
  )
}

// 범례 한 줄 — 제목 + 상태 항목들 (gap 14). 제목 폭:
//   원동기 있는 곳 (2줄 범례) W 66 고정 — 두 줄 제목 정렬.
//   없는 곳 (1줄) natural — 제목→아이콘 간격이 딱 18px (Figma).
function LegendRow({
  title,
  items,
  titleWidth,
}: {
  title: string
  items: readonly { icon: ReactNode; label: string }[]
  titleWidth?: string
}) {
  return (
    <div
      className="flex items-center justify-center self-stretch"
      style={{ gap: '18px' }}
    >
      <LegendTitle title={title} width={titleWidth} />
      {/* 상태 총 영역 */}
      <div className="flex items-center" style={{ gap: '14px' }}>
        {items.map((s) => (
          <LegendStatus key={s.label} icon={s.icon} label={s.label} />
        ))}
      </div>
    </div>
  )
}

// ---------- grid cell ----------

// grid 제목 칸 — W 90 (기본), bg Neutral-500. 긴 이름은 2줄 (pre-line).
function GridLabelCell({ text, width = 90 }: { text: string; width?: number }) {
  return (
    <div
      className="flex items-center justify-center self-stretch"
      style={{
        width: `${width}px`,
        gap: '8px',
        background: COLORS.neutral500,
      }}
    >
      <span
        style={{
          color: '#F4F8FB',
          textAlign: 'center',
          whiteSpace: 'pre-line',
          fontFamily: 'Roboto',
          fontSize: '16px',
          fontWeight: 500,
          lineHeight: '20px',
        }}
      >
        {text}
      </span>
    </div>
  )
}

// grid 상태 칸 — W 78 (기본), padding 14/0. 인덱스 (#N) + 아이콘.
//   index 없으면 아이콘만 (수위계 칸). fill=true 면 남는 폭 균등 분배.
//   large=true (원동기 없는 곳): 인덱스 18px (아이콘 크기는 caller 가 60 으로).
function GridStatusCell({
  index,
  icon,
  fill = false,
  large = false,
}: {
  index?: string
  icon: ReactNode
  fill?: boolean
  large?: boolean
}) {
  return (
    <div
      className="flex items-center justify-center self-stretch"
      style={{
        ...(fill ? { flex: '1 0 0' } : { width: '78px' }),
        // large (아이콘 60, row 74): padding 7 — 60+14=74 딱 맞음.
        padding: large ? '7px 0' : '14px 0',
        gap: '6px',
      }}
    >
      {index && (
        <span
          style={{
            color: '#B8C8D6',
            textAlign: 'center',
            fontFamily: 'Roboto',
            fontSize: large ? '18px' : '15px',
            fontWeight: 500,
            lineHeight: large ? '20px' : '16px',
          }}
        >
          {index}
        </span>
      )}
      {icon}
    </div>
  )
}

// 수위계 아이콘 (기본 30×30 — 원동기 없는 곳은 60)
function WaterLevelIcon({ size = 30 }: { size?: number }) {
  return (
    <img
      src="/ic/pump/ic_water-level_fill_normal_color_30.svg"
      width={size}
      height={size}
      alt=""
    />
  )
}

export function PumpDetailPanel({ name }: Props) {
  const station = useRawPumpStation(name)
  const equipments = station?.equipments ?? []
  // 원동기 있는 곳: row 들이 패널 높이를 균등하게 채움 (가상시설0523/가상시설0411 — 장비 많음) + 그룹 패킹.
  // 없는 곳: row max 85 고정, 한 줄에 한 그룹만, 위로 붙임.
  const hasMotorOrig = equipments.some((e) => e.category === 'MOTOR_ORIG')
  const { rows, water } = useMemo(
    () => buildGrid(station?.equipments ?? [], hasMotorOrig),
    [station, hasMotorOrig],
  )
  // 밸브/수문 범례 — 원동기 없는 곳은 항상 제외 (범례 1줄, H 64).
  //   원동기 있는 곳도 밸브/수문 장비 없으면 제외.
  const hasValve =
    hasMotorOrig &&
    equipments.some((e) => e.category === 'VALVE' || e.category === 'GATE')
  const rowSizing = hasMotorOrig
    ? {
        className: 'flex flex-1 self-stretch',
        style: { borderBottom: '1px solid #1B4671' } as const,
      }
    : {
        className: 'flex self-stretch',
        style: {
          // 기본(max) 120 = 라벨 content 50 + padding 35×2 (Figma).
          // row 총합이 grid 영역을 넘으면 (가상시설0302 8줄 등) 균등 축소돼 전체 높이에 맞춤.
          flex: '0 1 120px',
          minHeight: 0,
          borderBottom: '1px solid #1B4671',
        } as const,
      }

  return (
    <div
      className="flex flex-col items-start self-stretch"
      style={{
        height: '784px',
        borderRadius: '0 0 16px 16px',
        // 원동기 없는 곳: 시설물 사진 배경 (480×784 전체) — grid 아래 빈 영역에 표출.
        background: hasMotorOrig
          ? COLORS.neutral800
          : `url('/images/pump/img_right-panel-bg-02_480x784.png') center / cover no-repeat, ${COLORS.neutral800}`,
      }}
    >
      {/* 장비 상태 grid — 백엔드 equipments 데이터 주도 (미조회/로딩 전엔 빈 grid).
          flex-1 — 범례 제외한 높이를 채움. min-h-0 — 콘텐츠가 넘칠 때 컨테이너가
          범례를 밀어내지 않고 row 들이 축소되도록 (flex min-height:auto 함정 해제). */}
      <div
        className="flex flex-1 flex-col items-start self-stretch"
        style={{ minHeight: 0 }}
      >
        {rows.map((row, i) => (
          <div key={i} className={rowSizing.className} style={rowSizing.style}>
            {row.map((g, gi) => {
              // 마지막이 아닌 그룹은 최소 2칸 폭 — 1칸이면 빈 칸 pad (뒤 그룹 제목 정렬).
              const padCells =
                gi < row.length - 1 ? Math.max(0, 2 - g.items.length) : 0
              return (
                <Fragment key={g.key}>
                  <GridLabelCell text={g.label} />
                  {g.items.map((it, j) => (
                    <GridStatusCell
                      key={j}
                      index={`#${it.index ?? j + 1}`}
                      fill={!hasMotorOrig}
                      large={!hasMotorOrig}
                      icon={
                        g.kind === 'valve' ? (
                          <ValveIcon
                            variant={valveVariant(it.state)}
                            size={hasMotorOrig ? 30 : 60}
                          />
                        ) : (
                          <StatusGear
                            variant={gearVariantFromState(it.state)}
                            size={hasMotorOrig ? 30 : 60}
                          />
                        )
                      }
                    />
                  ))}
                  {Array.from({ length: padCells }, (_, k) => (
                    <div
                      key={`pad-${k}`}
                      className="shrink-0 self-stretch"
                      style={{ width: '78px' }}
                    />
                  ))}
                </Fragment>
              )
            })}
          </div>
        ))}
        {/* 수위계 row — 아이콘 칸은 남는 폭 균등 분배.
            원동기 있는 곳: 한 줄 최대 3쌍 (가상시설0411 5개 → 3+2).
            없는 곳: 수위계 전부 한 줄에. */}
        {(() => {
          const per = hasMotorOrig ? 3 : Math.max(water.length, 1)
          return Array.from(
            { length: Math.ceil(water.length / per) },
            (_, r) => water.slice(r * per, r * per + per),
          )
        })().map((chunk, r) => (
          <div key={r} className={rowSizing.className} style={rowSizing.style}>
            {chunk.map((w) => (
              <Fragment key={w.label}>
                <GridLabelCell text={w.label} />
                <GridStatusCell
                  fill
                  icon={<WaterLevelIcon size={hasMotorOrig ? 30 : 60} />}
                />
              </Fragment>
            ))}
          </div>
        ))}
      </div>

      {/* 아이콘 범례 — 하단 바 (내용 높이만 차지, grid 가 나머지를 채움).
          패널 마지막 요소라 하단 radius 상속. */}
      <div
        className="flex shrink-0 items-center justify-center self-stretch"
        style={{
          // 원동기 있는 곳: 내용 64 (범례 2줄) + padding 38 = 102.
          // 없는 곳: 내용 26 (1줄) + padding 38 = 64 (Figma).
          height: hasMotorOrig ? '102px' : '64px',
          padding: '19px 16px',
          gap: '36px',
          background: COLORS.neutral1000,
          borderRadius: '0 0 16px 16px',
        }}
      >
        {/* 범례 (수위계 제외) — col, gap 10 */}
        <div className="flex flex-col items-start" style={{ gap: '10px' }}>
          <LegendRow
            title="설비"
            titleWidth={hasMotorOrig ? '66px' : undefined}
            items={[
              { icon: <StatusGear variant="green" size={20} />, label: '켜짐' },
              { icon: <StatusGear variant="red" size={20} />, label: '꺼짐' },
              {
                icon: <StatusGear variant="blue" size={20} />,
                label: '고장(정비)',
              },
            ]}
          />
          {hasValve && (
            <LegendRow
              title="밸브/수문"
              titleWidth="66px"
              items={[
                {
                  icon: <ValveIcon variant="green" size={20} />,
                  label: '켜짐',
                },
                {
                  icon: <ValveIcon variant="orange" size={20} />,
                  label: '꺼짐',
                },
                {
                  icon: <ValveIcon variant="blue" size={20} />,
                  label: '고장(정비)',
                },
              ]}
            />
          )}
        </div>
        {/* 수위계 범례 — 제목 + 아이콘 (원동기 없는 곳은 간격 18) */}
        <div
          className="flex items-center"
          style={{ gap: hasMotorOrig ? '8px' : '18px' }}
        >
          <LegendTitle title="수위계" />
          <img
            src="/ic/pump/ic_water-level_fill_normal_color_20.svg"
            width={20}
            height={20}
            alt=""
          />
        </div>
      </div>
    </div>
  )
}
