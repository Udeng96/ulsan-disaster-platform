// 스위칭 허브 상세 오른쪽 아래 — 후면 · 전원·냉각. 상자·제목은 방화벽 후면과 같고, 높이는 전면 아래 남은 만큼 (사용자 10-22).
//   그림은 전면 그림 틀(본체 틀 + 440 mm · 44 mm)에 뒷면 부품. 표는 전면 표와 같은 칸 너비 (사용자 10-22)
import { memo } from 'react'
import { switchSummary } from './data'
import { Group, type PortRow } from './FirewallFront'
import { SwitchFrame } from './SwitchFront'
import { NONE } from './view'

/** 후면 표 2개 — 칸 너비·글씨는 전면 표와 같음 (사용자 10-22), 줄 촘촘하게(compact). 내용은 디자인 캡처, AC 인렛 상태는 summary.powerStatus (못 받으면 '-') */
const HEADERS = ['포트', '연결 상대', '상태', '트래픽']
const inlet = (state: string | null | undefined): PortRow[] => [{ name: 'AC 인렛', mount: '단일 전원', used: true, state: state ?? NONE, tone: state ? 'ok' : 'idle' }]
const RIGHT: PortRow[] = [{ name: '접지', mount: '⏚', used: true, state: '확인 필요', tone: 'warn' }]

/** 전원 입구(AC IN, C14) — 피그마 43.2×25.6 → 43×26, 그림 칸 왼쪽 58 · 위 40 (본체 세로 가운데, 피그마 캡처).
 *  모양은 사용자가 준 SVG(23×17: 오른쪽 두 모서리를 비스듬히 깎은 사각형, 바탕 var(--color-admin-0e1319) · 선 var(--color-admin-3a444e) 0.535)를 가로·세로 비율대로 늘림 — 깎은 부분 폭 12% · 높이 17%, 선 0.535 × 1.87 → 1 (사용자 10-22).
 *  안쪽 사각 3개 — 피그마 4.8×9.6 → 5×10, 사이 5 (캡처 4.75), 왼쪽 8 · 위 8 (세로 가운데) — 색은 선과 같은 var(--color-admin-3a444e) (캡처) */
function AcInlet() {
  return (
    <g transform="translate(58 40)">
      <path d="M0.5 0.5H37.5L42.5 4.7V21.3L37.5 25.5H0.5Z" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-3a444e)" />
      <g fill="var(--color-admin-3a444e)">
        <rect x="8" y="8" width="5" height="10" />
        <rect x="18" y="8" width="5" height="10" />
        <rect x="28" y="8" width="5" height="10" />
      </g>
    </g>
  )
}

/** 접지 — 불 꺼진 동그라미(바탕 없이 선만 1, var(--color-admin-3a444e) — 캡처 색, 입구 테두리와 같음) 지름 10, 가운데 (212.5, 53) + 오른쪽 아래 작은 ↓ 화살표 var(--color-admin-8fa5bb) (피그마 캡처 위치) (사용자 10-22) */
function Ground() {
  return (
    <>
      <circle cx="212.5" cy="53" r="4.5" fill="none" stroke="var(--color-admin-3a444e)" />
      <g fill="var(--color-admin-8fa5bb)">
        <rect x="221.75" y="53.5" width="1" height="2.5" />
        <path d="M220.5 55.5H224L222.25 57.5Z" />
      </g>
    </>
  )
}

/** 전원 입구 글씨 (피그마 캡처 위치) — 사용자 10-22:
 *  아래 "AC IN (C14)" 은 전면 SG2428GX 글씨(Arial 400 var(--color-admin-8fa5bb)) — 크기 8 (사용자 10-22 — 4.2 에서 더 키움), 입구 가운데(79.5) · 입구 아래(66)에 가깝게 기준선 75
 *  오른쪽 세 줄은 전면 SubGate 글씨(Arial 700 5.25 흰색), 왼쪽 116 · 기준선 47 · 55 · 63 (줄 간격 8) */
function AcLabels() {
  return (
    <g fontFamily="Arial, sans-serif">
      <text x="79.5" y="75" textAnchor="middle" fill="var(--color-admin-8fa5bb)" fontSize="8">
        AC IN (C14)
      </text>
      <g fill="var(--color-intensity-1)" fontSize="5.25" fontWeight="700">
        <text x="116" y="47">
          AC 100-240V~
        </text>
        <text x="116" y="55">
          50/60Hz
        </text>
        <text x="116" y="63">
          0.5A MAX
        </text>
      </g>
    </g>
  )
}

/** 후면 상자 — 여백 좌우 20 · 위아래 12 (전면과 같음, 사용자 10-22), 줄 사이 4, 둥글기 16, Neutral-600, 제목 B1 흰색 (방화벽 후면과 같음) */
export const SwitchRear = memo(function SwitchRear() {
  const power = switchSummary.use('poll')?.powerStatus
  return (
    <section aria-label="후면 전원·냉각" className="flex min-h-0 flex-[1_0_0] flex-col items-start gap-1 self-stretch rounded-2xl bg-neutral-600 px-5 py-3 font-['Roboto',sans-serif]">
      <h3 className="text-b1 text-white">후면 - 전원·냉각</h3>
      {/* 그림 칸 아래 3 겹침 — 본체 아래 빈 6 중 3 을 줄여 표까지 높이에 맞춤 (사용자 10-22) */}
      <div className="-mb-[3px] flex justify-center self-stretch">
        <SwitchFrame label="스위칭 허브 후면 그림">
          <AcInlet />
          <AcLabels />
          <Ground />
        </SwitchFrame>
      </div>
      {/* 표 2개 나란히 — 사이 10 (전면 묶음 사이와 같음) */}
      <div className="flex gap-2.5 self-stretch">
        <Group rows={inlet(power)} headers={HEADERS} compact />
        <Group rows={RIGHT} headers={HEADERS} compact />
      </div>
    </section>
  )
})
