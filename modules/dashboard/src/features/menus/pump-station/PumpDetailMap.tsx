// 배수펌프장 detail view 의 좌측 영역
// W 784 × H 840 — 새 디자인 (원동기/전동기/수위) 퍼블리싱 진행 중.
// 기존 배경 이미지 + 펌프 status 아이콘 제거 → back button 만 유지.

import type { ReactNode } from 'react'
import { COLORS } from '@/styles/designTokens'
import type { Equipment } from '@/api/pumpStation'
import {
  StatusGear,
  gearVariantFromState,
  type FanVariant,
} from './StatusGear'
import { useRawPumpStation } from './usePumpStations'

// 장비 이름 뒤 숫자 → 카드 제목 ("원동기펌프1" → "원동기펌프 1호"). 숫자 없으면 그대로.
function equipmentCardTitle(name: string): string {
  const m = name.trim().match(/^(.*?)\s*(\d+)$/)
  return m ? `${m[1].trim()} ${m[2]}호` : name.trim()
}

// 이름 뒤 숫자 (정렬용). 없으면 0.
function trailingIndex(name: string): number {
  const m = name.trim().match(/(\d+)$/)
  return m ? Number(m[1]) : 0
}

// 좌측 수위 섹션에 표시할 수위계 선별:
//   1) 내/외수위계 (가상시설0523 등)
//   2) 없으면 원동기실/전동기실 수위 (가상시설0411 — 사용자 결정)
//   3) 없으면 맨홀수위 (가상시설0242/가상시설0274 등 소형)
//   4) 그것도 없으면 (가상시설0302 등) 좌측 수위 섹션 숨김
const WATER_PRIMARY = ['내수위계', '외수위계']
const WATER_FALLBACK = ['원동기실수위', '전동기실수위']
function pickLeftWaterLevels(
  equipments: readonly Equipment[],
): readonly Equipment[] {
  const waters = equipments.filter((e) => e.category === 'WATER_LEVEL')
  const norm = (s: string) => s.replace(/\s+/g, '')
  const primary = waters.filter((e) => WATER_PRIMARY.includes(norm(e.name)))
  if (primary.length > 0)
    return [...primary].sort(
      (a, b) =>
        WATER_PRIMARY.indexOf(norm(a.name)) -
        WATER_PRIMARY.indexOf(norm(b.name)),
    )
  const secondary = waters.filter((e) => WATER_FALLBACK.includes(norm(e.name)))
  if (secondary.length > 0)
    return [...secondary].sort(
      (a, b) =>
        WATER_FALLBACK.indexOf(norm(a.name)) -
        WATER_FALLBACK.indexOf(norm(b.name)),
    )
  return waters.filter((e) => norm(e.name).startsWith('맨홀수위'))
}

// 좌측 화살표 button 아이콘 (40×40, glass blur + circle stroke)
// SVG 의 foreignObject backdrop-filter 는 원이 아닌 사각형에 적용되는 문제가 있어서
// backdrop blur 는 외부 div 로 별도 처리 (원형 clip), SVG 안에는 원 fill + stroke + arrow 만
// normal — fill opacity 0.17 / stroke 0.34 width 1.5 / arrow 0.87
function BackArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
    >
      <g>
        <circle
          cx="20.0013"
          cy="19.9993"
          r="17.3333"
          fill="white"
          fillOpacity="0.17"
        />
        <circle
          cx="20.0013"
          cy="19.9993"
          r="16.5833"
          stroke="white"
          strokeOpacity="0.34"
          strokeWidth="1.5"
        />
      </g>
      <circle
        cx="20.0013"
        cy="19.9993"
        r="17.7083"
        stroke="#141414"
        strokeOpacity="0.11"
        strokeWidth="0.75"
      />
      <path
        d="M28 18.7501C28.6903 18.7501 29.2499 19.3098 29.25 20.0001C29.25 20.6905 28.6904 21.2501 28 21.2501L14.9619 21.2501L18.8955 25.2921C19.377 25.7867 19.3666 26.5781 18.8721 27.0597C18.3774 27.5411 17.586 27.5307 17.1045 27.0362L11.1045 20.8722C10.635 20.3899 10.6314 19.6222 11.0967 19.1358L17.0967 12.8653C17.5739 12.3666 18.3655 12.349 18.8643 12.8263C19.363 13.3035 19.3806 14.0951 18.9033 14.5939L14.9268 18.7501L28 18.7501Z"
        fill="white"
        fillOpacity="0.87"
      />
      <path
        d="M29.6162 20.166C29.5331 20.9855 28.8414 21.625 28 21.625L15.8506 21.625L19.1641 25.0303C19.7899 25.6732 19.7766 26.702 19.1338 27.3281C18.5311 27.9148 17.5893 27.9399 16.958 27.4111L16.8359 27.2979L10.8359 21.1338C10.2258 20.5069 10.2211 19.5093 10.8262 18.877L16.8262 12.6064C17.4466 11.9581 18.4746 11.9353 19.123 12.5557C19.7715 13.1761 19.7942 14.2051 19.1738 14.8535L15.8047 18.375L28 18.375C28.8974 18.375 29.6249 19.1027 29.625 20L29.6162 20.166Z"
        stroke="#141414"
        strokeOpacity="0.11"
        strokeWidth="0.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// hover — fill opacity 0.34 / stroke 0.9 width 2 / arrow 1.0
function BackArrowIconHover() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
    >
      <g>
        <circle
          cx="20.0013"
          cy="19.9993"
          r="17.3333"
          fill="white"
          fillOpacity="0.34"
        />
        <circle
          cx="20.0013"
          cy="19.9993"
          r="16.3333"
          stroke="white"
          strokeOpacity="0.9"
          strokeWidth="2"
        />
      </g>
      <circle
        cx="20.0013"
        cy="19.9993"
        r="17.7083"
        stroke="#141414"
        strokeOpacity="0.11"
        strokeWidth="0.75"
      />
      <path
        d="M28 18.7501C28.6903 18.7501 29.2499 19.3098 29.25 20.0001C29.25 20.6905 28.6904 21.2501 28 21.2501L14.9619 21.2501L18.8955 25.2921C19.377 25.7867 19.3666 26.5781 18.8721 27.0597C18.3774 27.5411 17.586 27.5307 17.1045 27.0362L11.1045 20.8722C10.635 20.3899 10.6314 19.6222 11.0967 19.1358L17.0967 12.8653C17.5739 12.3666 18.3655 12.349 18.8643 12.8263C19.363 13.3035 19.3806 14.0951 18.9033 14.5939L14.9268 18.7501L28 18.7501Z"
        fill="white"
      />
      <path
        d="M29.6162 20.166C29.5331 20.9855 28.8414 21.625 28 21.625L15.8506 21.625L19.1641 25.0303C19.7899 25.6732 19.7766 26.702 19.1338 27.3281C18.5311 27.9148 17.5893 27.9399 16.958 27.4111L16.8359 27.2979L10.8359 21.1338C10.2258 20.5069 10.2211 19.5093 10.8262 18.877L16.8262 12.6064C17.4466 11.9581 18.4746 11.9353 19.123 12.5557C19.7715 13.1761 19.7942 14.2051 19.1738 14.8535L15.8047 18.375L28 18.375C28.8974 18.375 29.6249 19.1027 29.625 20L29.6162 20.166Z"
        stroke="#141414"
        strokeOpacity="0.11"
        strokeWidth="0.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 다이아 2개 (겹침) — 섹션 divider 의 제목 양옆 장식.
//   기존 SectionDivider (다이아가 바깥 끝) 와 달리 새 디자인은 다이아가 제목 옆.
function DiamondPair() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="12"
      viewBox="0 0 17 12"
      fill="none"
    >
      <g opacity="0.75">
        <rect
          x="5.5"
          y="1.04695"
          width="7"
          height="7"
          transform="rotate(45 5.5 1.04695)"
          stroke="#7F97AF"
        />
        <rect
          x="11.5"
          y="1.04695"
          width="7"
          height="7"
          transform="rotate(45 11.5 1.04695)"
          stroke="#7F97AF"
        />
      </g>
    </svg>
  )
}

// 가로 라인 — W 270 고정 (Figma).
function DividerLine() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="270"
      height="1"
      viewBox="0 0 270 1"
      fill="none"
    >
      <path opacity="0.8" d="M269.686 0.5H0" stroke="#7F97AF" />
    </svg>
  )
}

// 섹션 divider 헤더 — ────◇◇ 제목 ◇◇──── (라인 바깥, 다이아 제목 옆).
//   라인 W 270 고정, 라인 ↔ 다이아 gap 13. 제목은 다이아 사이 가운데 영역 center.
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center self-stretch" style={{ gap: '13px' }}>
      <DividerLine />
      <DiamondPair />
      <span
        className="flex-1 text-center"
        style={{
          color: COLORS.neutral100,
          fontSize: '24px',
          fontWeight: 500,
          lineHeight: '26px',
        }}
      >
        {title}
      </span>
      <DiamondPair />
      <DividerLine />
    </div>
  )
}

// 토글 박스 — active 없으면 Neutral(테두리 #7F97AF / bg #1B4671),
//   red = Remote 활성 (#FF4245 / #D12527), blue = 자동·수동 활성 (#42B8FF / #1EA7FF).
//   size: 'sm' 소형 카드 (W 48 고정, padding 4/0) · 'lg' 대형 카드 (내용 폭, padding 8).
function ToggleBox({
  label,
  active,
  size = 'sm',
}: {
  label: string
  active?: 'red' | 'blue'
  size?: 'sm' | 'lg'
}) {
  const colorStyle =
    active === 'red'
      ? { border: '1px solid #FF4245', background: '#D12527' }
      : active === 'blue'
        ? { border: '1px solid #42B8FF', background: '#1EA7FF' }
        : { border: '1px solid #7F97AF', background: '#1B4671' }
  // lg: 실영역 48×16 + padding 8 + border 1 → 66×34 (Figma).
  const sizeStyle =
    size === 'lg'
      ? { width: '66px', padding: '8px' }
      : { width: '48px', padding: '4px 0' }
  return (
    <div
      className="flex items-center justify-center"
      style={{ ...sizeStyle, gap: '8px', ...colorStyle }}
    >
      <span
        style={{
          color: '#F4F8FB',
          textAlign: 'center',
          textShadow: '0 0 4px rgba(0, 0, 0, 0.25)',
          fontFamily: 'Roboto',
          fontSize: '13px',
          fontWeight: 400,
          lineHeight: '16px',
          letterSpacing: '-0.26px',
        }}
      >
        {label}
      </span>
    </div>
  )
}

// 전류값 row — ▪점(3×3) + 제목 + 수치 + 단위.
//   기본: natural width (제목 W 56 / 수치 W 40 고정) — 카드 (items-center) 가 블록째 가운데 정렬.
//   stretch: self-stretch + space-between (대형 카드 — 라벨 왼쪽 / 수치 오른쪽 끝).
function CurrentRow({
  label,
  value,
  unit = 'A',
  stretch = false,
}: {
  label: string
  value: string
  unit?: string
  stretch?: boolean
}) {
  // stretch(대형 카드): 라벨 15/500·lh16, 수치·단위 18 (Figma).
  const labelEl = (
    <span
      className="shrink-0"
      style={{
        ...(stretch ? {} : { width: '56px' }),
        marginLeft: '4px',
        color: '#B8C8D6',
        fontFamily: 'Roboto',
        fontSize: stretch ? '15px' : '12px',
        fontWeight: 500,
        lineHeight: stretch ? '16px' : '14px',
      }}
    >
      {label}
    </span>
  )
  const valueEl = (
    <span
      className="shrink-0"
      style={{
        ...(stretch ? {} : { width: '40px' }),
        color: '#F4F8FB',
        textAlign: 'right',
        fontFamily: 'Roboto',
        fontSize: stretch ? '18px' : '16px',
        fontWeight: 500,
        lineHeight: '20px',
      }}
    >
      {value}
    </span>
  )
  const unitEl = (
    <span
      style={{
        color: '#B8C8D6',
        textAlign: 'center',
        fontFamily: 'Roboto',
        fontSize: stretch ? '18px' : '16px',
        fontWeight: 400,
        lineHeight: '20px',
      }}
    >
      {unit}
    </span>
  )
  const dotEl = (
    <span
      className="shrink-0"
      style={{ width: '3px', height: '3px', background: '#B8C8D6' }}
    />
  )
  if (stretch) {
    return (
      <div className="flex items-center justify-between self-stretch">
        <div className="flex items-center">
          {dotEl}
          {labelEl}
        </div>
        <div className="flex items-center">
          {valueEl}
          {unitEl}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center">
      {dotEl}
      {labelEl}
      {valueEl}
      {unitEl}
    </div>
  )
}

// 원동기 아이콘 영역 — 이미지 (100×75) 좌측 + 상태 톱니 (46×46 box) 우측 겹침.
function MotorIconArea({ variant = 'green' }: { variant?: FanVariant }) {
  return (
    <div className="relative self-stretch" style={{ height: '75px' }}>
      <div
        className="absolute top-0 flex items-center justify-center"
        style={{
          left: '14px',
          width: '100px',
          height: '75px',
          padding: '1.667px 0 1.437px 0',
        }}
      >
        <img src="/images/pump/pump_motor.png" width={96} height={68} alt="" />
      </div>
      {/* 상태 톱니 — 46×46 box (Figma padding), 우측 정렬 + 세로 중앙 */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          right: '13px',
          top: '14.5px',
          width: '46px',
          height: '46px',
          padding: '4.096px 3.925px 3.669px 3.839px',
        }}
      >
        <StatusGear variant={variant} size={38.2} />
      </div>
    </div>
  )
}

// 전동기 아이콘 영역 — 이미지 (100×100 box, padding 6.972/8.67/7.758/9) + 상태 톱니 중앙 겹침.
function ElecIconArea({ variant = 'green' }: { variant?: FanVariant }) {
  return (
    <div className="relative self-stretch" style={{ height: '100px' }}>
      <div
        className="absolute top-0 flex items-center justify-center"
        style={{
          left: '14px',
          width: '100px',
          height: '100px',
          padding: '6.972px 8.67px 7.758px 9px',
        }}
      >
        {/* 원본 141×146 → content box (82.33×85.27) 에 fit */}
        <img
          src="/images/pump/pump_elec.png"
          width={82.33}
          height={85.27}
          alt=""
        />
      </div>
      {/* 상태 톱니 — 전동기는 60×60 box (원동기 46 보다 큼), 기계 정면 중앙 겹침 */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: '36px',
          top: '17px',
          width: '60px',
          height: '60px',
          padding: '5.342px 5.121px 4.785px 5.007px',
        }}
      >
        <StatusGear variant={variant} size={49.87} />
      </div>
    </div>
  )
}

// 펌프 카드 공통 틀 — W 128, col, center, gap 2 (Figma).
//   제목 chip / 토글 / 전류값은 원동기·전동기 동일, 아이콘 영역만 icon 으로 교체.
//   전류값 — 백엔드 미제공 (value null) 동안 0 표시. 토글은 데이터 없어 정적.
function PumpCard({
  title,
  icon,
  actual = '0',
  rated = '0',
}: {
  title: string
  icon: ReactNode
  actual?: string
  rated?: string
}) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ width: '128px', gap: '2px' }}
    >
      {/* 제목 chip — self-stretch, 상하 1px Neutral-300 border, bg Neutral-400 */}
      <div
        className="flex items-center justify-center self-stretch"
        style={{
          padding: '6px 8px',
          gap: '8px',
          borderTop: '1px solid #7F97AF',
          borderBottom: '1px solid #7F97AF',
          background: '#1B4671',
        }}
      >
        <span
          style={{
            color: COLORS.neutral100,
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: '16px',
          }}
        >
          {title}
        </span>
      </div>

      {icon}

      {/* 토글 그룹 — Remote/Local + 자동/수동. 두 row 사이 gap 4 */}
      <div className="flex flex-col items-center" style={{ gap: '4px' }}>
        <div className="flex">
          <ToggleBox label="Remote" active="red" />
          <ToggleBox label="Local" />
        </div>
        <div className="flex">
          <ToggleBox label="자동" />
          <ToggleBox label="수동" active="blue" />
        </div>
      </div>

      {/* 전류값 — 실전류값 / 적정전류값. 토글 그룹과 6px 간격 (card gap 2 + margin 4 — Figma) */}
      <div
        className="flex flex-col"
        style={{ marginTop: '4px', gap: '4px' }}
      >
        <CurrentRow label="실전류값" value={actual} />
        <CurrentRow label="적정전류값" value={rated} />
      </div>
    </div>
  )
}

// 대형 전동기 아이콘 — 이미지 200×200 box (padding 2.5/6.25/3.304/6.25) + 톱니 100 중앙.
//   원동기 없는 펌프장의 대형 카드용.
function ElecIconAreaLarge({ variant = 'green' }: { variant?: FanVariant }) {
  return (
    <div
      className="relative shrink-0"
      style={{ width: '200px', height: '200px' }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ padding: '2.5px 6.25px 3.304px 6.25px' }}
      >
        {/* 원본 141×146 → content box (187.5×194.2) 에 fit */}
        <img
          src="/images/pump/pump_elec.png"
          width={187.5}
          height={194.2}
          alt=""
        />
      </div>
      {/* 상태 톱니 — 100×100, 기계 정면 중앙 (소형 카드와 동일 비율 위치) */}
      <div
        className="absolute"
        style={{ left: '55px', top: '46px', width: '100px', height: '100px' }}
      >
        <StatusGear variant={variant} size={100} />
      </div>
    </div>
  )
}

// 대형 전동기 카드 (원동기 없는 펌프장) — 341×268 (Figma).
//   제목 chip (H 44) + gap 24 + [아이콘 200 + 14 + 컨트롤 (하단 정렬)].
function LargePumpCard({
  title,
  variant,
  actual = '0',
  rated = '0',
}: {
  title: string
  variant: FanVariant
  actual?: string
  rated?: string
}) {
  return (
    <div
      className="flex flex-col items-end"
      style={{ width: '341px', gap: '24px' }}
    >
      {/* 제목 chip — self-stretch, H 44, 소형 카드와 동일 색 */}
      <div
        className="flex items-center justify-center self-stretch"
        style={{
          height: '44px',
          padding: '6px 8px',
          gap: '8px',
          borderTop: '1px solid #7F97AF',
          borderBottom: '1px solid #7F97AF',
          background: '#1B4671',
        }}
      >
        <span
          style={{
            color: COLORS.neutral100,
            fontSize: '18px',
            fontWeight: 500,
            lineHeight: '20px',
          }}
        >
          {title}
        </span>
      </div>

      {/* body — 아이콘 좌측 + 컨트롤 우측 (아이콘에서 14px, 하단 정렬) */}
      <div
        className="flex items-end self-stretch"
        style={{ gap: '14px' }}
      >
        <ElecIconAreaLarge variant={variant} />
        <div className="flex flex-col items-center" style={{ gap: '16px' }}>
          {/* 토글 그룹 — Remote/Local + 자동/수동 (row 간 gap 4), 대형 사이즈 */}
          <div className="flex flex-col items-center" style={{ gap: '4px' }}>
            <div className="flex">
              <ToggleBox label="Remote" active="red" size="lg" />
              <ToggleBox label="Local" size="lg" />
            </div>
            <div className="flex">
              <ToggleBox label="자동" size="lg" />
              <ToggleBox label="수동" active="blue" size="lg" />
            </div>
          </div>
          {/* 전류값 — self-stretch + space-between (라벨 좌 / 수치 우) */}
          <div className="flex flex-col self-stretch" style={{ gap: '4px' }}>
            <CurrentRow label="실전류값" value={actual} stretch />
            <CurrentRow label="적정전류값" value={rated} stretch />
          </div>
        </div>
      </div>
    </div>
  )
}

// 수위계 bar — 제목 (W 100, 파랑 gradient) + 수치 영역 (bg Neutral-900).
//   flex 1 + max-width — row 안에서 개수만큼 균등 분배 (상한까지).
//   large (원동기 없는 곳): H 82 (수치 content 60 + padding 20 + border 2), 폭 상한 358.
function WaterLevelBar({
  label,
  value,
  large = false,
}: {
  label: string
  value: string
  large?: boolean
}) {
  return (
    <div
      className="flex items-start"
      style={{
        flex: '1 0 0',
        maxWidth: large ? '358px' : '336px',
        height: large ? '82px' : '60px',
        border: '1px solid #1B4671',
      }}
    >
      {/* 제목 — W 100, 좌측 3px 포인트 border + 파랑 gradient bg */}
      <div
        className="flex items-center justify-center self-stretch"
        style={{
          width: '100px',
          padding: '4px 8px',
          gap: '8px',
          borderLeft: '3px solid rgba(58, 171, 227, 0.70)',
          background:
            'linear-gradient(90deg, rgba(33, 142, 196, 0.30) 0%, rgba(33, 142, 196, 0.80) 100%)',
        }}
      >
        <span
          style={{
            color: '#FFF',
            textAlign: 'center',
            fontFamily: 'Pretendard, var(--font-sans)',
            fontSize: '18px',
            fontWeight: 500,
            lineHeight: '120%',
            letterSpacing: '-0.18px',
          }}
        >
          {label}
        </span>
      </div>
      {/* 수치 영역 — bg Neutral-900, 수치 + 단위 (padding 10/16 — Figma) */}
      <div
        className="flex flex-1 flex-col items-center justify-center self-stretch"
        style={{
          padding: '10px 16px',
          gap: '8px',
          background: COLORS.neutral900,
        }}
      >
        <div className="flex items-center">
          <span
            style={{
              color: '#FFF',
              fontFamily: 'Pretendard, var(--font-sans)',
              fontSize: '26px',
              fontWeight: 600,
              lineHeight: '40px',
              letterSpacing: '-0.26px',
            }}
          >
            {value}
          </span>
          <span
            style={{
              color: '#FFF',
              fontFamily: 'Pretendard, var(--font-sans)',
              fontSize: '20px',
              fontWeight: 400,
              lineHeight: '40px',
              letterSpacing: '-0.2px',
              opacity: 0.6,
            }}
          >
            M
          </span>
        </div>
      </div>
    </div>
  )
}

interface Props {
  /** 현재 표출 중인 펌프장 name (selectedPumpRegion) */
  name: string
  onBack: () => void
}

// 콘텐츠 폭 — 배수펌프장 화면의 지도 영역(744) 에서 좌우 padding 24 를 뺀 값.
//   예전엔 784 기준(736) 이라 오른쪽 40px 이 잘려 카드가 밖으로 빠졌다.
const CONTENT_W = 696

export function PumpDetailMap({ name, onBack }: Props) {
  const station = useRawPumpStation(name)
  const equipments = station?.equipments ?? []
  const byIndex = (a: Equipment, b: Equipment) =>
    trailingIndex(a.name) - trailingIndex(b.name)
  // 원동기 = MOTOR_ORIG. 전동기 = MOTOR_ELEC — 없으면 PUMP_GENERIC ('펌프1/2/3')
  // fallback (원동기 없는 소형 펌프장, usePumpStations 어댑터와 동일 규칙).
  const motorOrig = equipments
    .filter((e) => e.category === 'MOTOR_ORIG')
    .sort(byIndex)
  const elecOnly = equipments
    .filter((e) => e.category === 'MOTOR_ELEC')
    .sort(byIndex)
  const motorElec =
    elecOnly.length > 0
      ? elecOnly
      : equipments.filter((e) => e.category === 'PUMP_GENERIC').sort(byIndex)
  const waterLevels = pickLeftWaterLevels(equipments)

  return (
    // 좌측 영역 전체가 하나의 배경 박스 (Figma) — back button 포함.
    //   col, gap 16, padding 24/24/27/24, radius 16, bg Neutral-600.
    <div
      className="relative flex flex-col items-start"
      style={{
        // 폭·높이는 부모(지도 영역) 를 채운다 — 784 고정이면 배수펌프장 화면(744) 에서
        // 오른쪽 40px 이 잘려 펌프 2호 카드가 밖으로 빠진다.
        width: '100%',
        height: '100%',
        padding: '24px 24px 27px 24px',
        gap: '16px',
        borderRadius: '16px',
        background: COLORS.neutral600,
      }}
    >
      {/* 전체 지도로 돌아가기 — W 264 H 40, inline-flex items-center, gap 12
          hover 시 아이콘 + 텍스트 색/stroke 변경 (group-hover swap) */}
      <button
        type="button"
        onClick={onBack}
        className="pump-back-btn group inline-flex shrink-0 items-center"
        style={{
          width: '264px',
          height: '40px',
          gap: '12px',
        }}
        aria-label="전체 지도로 돌아가기"
      >
        <span
          className="relative shrink-0"
          style={{ width: '40px', height: '40px' }}
        >
          {/* backdrop blur — 원 안에만 적용 (W 0.0 = 원 지름, border-radius 50%) */}
          <span
            className="absolute pointer-events-none"
            style={{
              top: '2.667px',
              left: '2.667px',
              width: '34.667px',
              height: '34.667px',
              borderRadius: '50%',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          />
          {/* normal icon — hover 시 hidden */}
          <span className="absolute inset-0 block group-hover:hidden">
            <BackArrowIcon />
          </span>
          {/* hover icon — hover 시만 보임 */}
          <span className="absolute inset-0 hidden group-hover:block">
            <BackArrowIconHover />
          </span>
        </span>
        <span className="pump-back-label">전체 지도로 돌아가기</span>
      </button>

      {/* 콘텐츠 프레임 — 원동기 / 전동기 / 수위 섹션 (col).
          · 3섹션 (가상시설0523/가상시설0411): gap 40, 버튼→원동기 16 (root gap) — 높이 733 딱 맞음
          · 2섹션 (원동기 없는 곳): 버튼→전동기 50 (root gap 16 + margin 34),
            전동기→수위 gap 80 (Figma) */}
      <div
        className="flex flex-col items-start"
        style={{
          width: `${CONTENT_W}px`,
          // 원동기 없는 곳 3개(축소 row): 전동기↔수위 100 으로 조금 더 벌림.
          gap:
            motorOrig.length > 0
              ? '40px'
              : motorElec.length >= 3
                ? '100px'
                : '80px',
          // 원동기 없는 곳: 버튼→전동기 50 (root gap 16 + 34).
          // 카드 3개(축소 row)면 전체 높이가 줄어 위로 뜸 → 20 더 내림.
          marginTop:
            motorOrig.length > 0
              ? undefined
              : motorElec.length >= 3
                ? '54px'
                : '34px',
        }}
      >
        {/* 원동기 섹션 — divider 헤더 + MOTOR_ORIG 카드 (col, gap 20) */}
        {motorOrig.length > 0 && (
          <div
            className="flex flex-col items-start self-stretch"
            style={{ gap: '20px' }}
          >
            <SectionHeader title="원동기" />
            {/* 카드 row — 카드 W 128, 5개면 gap 24 (justify-between 균등 배분) */}
            <div className="flex items-start justify-between self-stretch">
              {motorOrig.map((e) => (
                <PumpCard
                  key={e.name}
                  title={equipmentCardTitle(e.name)}
                  icon={
                    <MotorIconArea variant={gearVariantFromState(e.state)} />
                  }
                  actual={String(e.value ?? 0)}
                  rated={String(e.value ?? 0)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 전동기 섹션 — divider 헤더 + 카드.
            · 원동기 있는 곳 (가상시설0523/가상시설0411): 소형 카드 (헤더 gap 20).
              4개 이상 justify-between (가상시설0523 spread), 미만 justify-evenly (가상시설0411).
            · 원동기 없는 곳: 대형 카드 341 (헤더 gap 40, Figma).
              한 줄 2개 (카드 간 56), 줄 간 40. */}
        {motorElec.length > 0 && motorOrig.length > 0 && (
          <div
            className="flex flex-col items-start self-stretch"
            style={{ gap: '20px' }}
          >
            <SectionHeader title="전동기" />
            <div
              className={
                motorElec.length >= 4
                  ? 'flex items-start justify-between self-stretch'
                  : 'flex items-start justify-evenly self-stretch'
              }
            >
              {motorElec.map((e) => (
                <PumpCard
                  key={e.name}
                  title={equipmentCardTitle(e.name)}
                  icon={
                    <ElecIconArea variant={gearVariantFromState(e.state)} />
                  }
                  actual={String(e.value ?? 0)}
                  rated={String(e.value ?? 0)}
                />
              ))}
            </div>
          </div>
        )}
        {motorElec.length > 0 && motorOrig.length === 0 && (
          <div
            className="flex flex-col items-start self-stretch"
            style={{ gap: '40px' }}
          >
            <SectionHeader title="전동기" />
            {/* 카드 row — 2개까지 원본 크기 (카드 간 56).
                3개 이상이면 한 줄에 맞게 전체 비율 축소 (transform scale). */}
            {(() => {
              const CARD_W = 341
              const CARD_H = 268
              const CARD_GAP = 56
              const naturalW =
                motorElec.length * CARD_W + (motorElec.length - 1) * CARD_GAP
              const scale = Math.min(1, CONTENT_W / naturalW)
              const row = (
                <div
                  className="flex"
                  style={
                    scale < 1
                      ? {
                          gap: `${CARD_GAP}px`,
                          width: `${naturalW}px`,
                          transform: `scale(${scale})`,
                          transformOrigin: 'top left',
                        }
                      : { gap: `${CARD_GAP}px` }
                  }
                >
                  {motorElec.map((e) => (
                    <LargePumpCard
                      key={e.name}
                      title={equipmentCardTitle(e.name)}
                      variant={gearVariantFromState(e.state)}
                      actual={String(e.value ?? 0)}
                      rated={String(e.value ?? 0)}
                    />
                  ))}
                </div>
              )
              return scale < 1 ? (
                // scale 은 layout 크기에 반영 안 되므로 축소된 실제 크기로 wrapper 고정
                <div
                  style={{
                    width: `${CONTENT_W}px`,
                    height: `${Math.round(CARD_H * scale)}px`,
                  }}
                >
                  {row}
                </div>
              ) : (
                row
              )
            })()}
          </div>
        )}

        {/* 수위 섹션 — divider 헤더 (항상 표시) + 수위계 bar (매칭 수위계 있을 때만).
            헤더→bar: 원동기 있는 곳 20 (Figma 검증값) / 없는 곳 40. */}
        <div
          className="flex flex-col items-start self-stretch"
          style={{ gap: motorOrig.length > 0 ? '20px' : '40px' }}
        >
          <SectionHeader title="수위" />
          {/* 수위계 bar row — 개수 늘어나면 gap 고정(16) 유지하며 균등 분배.
              bar 는 flex:1 + max-width — 1개면 상한 폭 가운데, N개면 나눠 가짐.
              매칭 수위계 없으면 (가상시설0302 등) 헤더만 표시. */}
          {waterLevels.length > 0 && (
            <div
              className="flex justify-center self-stretch"
              style={{ gap: '16px' }}
            >
              {waterLevels.map((e) => (
                <WaterLevelBar
                  key={e.name}
                  label={e.name}
                  value={String(e.value ?? 0)}
                  large={motorOrig.length === 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
