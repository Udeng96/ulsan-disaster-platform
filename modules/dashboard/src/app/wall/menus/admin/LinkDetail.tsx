// 연계 서버 상세 — 9번 내부 · 10번 내부망 · 11번 외부망 · 12번 외부. 왼쪽 요약 상자는 운영 서버와 같은 모양, 전면·후면 그림이 다르다 (사용자 10-23).
//   상자 틀(DetailBox · DetailLayout)은 RackServer 와 같이 쓰고, 그림은 네 대가 같은 그림 (10·11번 NIC 카드 · 전면 노란 막대는 값 받는 대로).
//   요약 값은 server /servers/{host} (HostSummary), 표는 디자인 줄에 /parts 값을 덮음 (사용자 10-23)
import { memo } from 'react'
import { useParts } from './data'
import type { PortRow } from './FirewallFront'
import { HostSummary } from './HostSummary'
import { partRows } from './liveRows'
import { DetailBox, DetailLayout, Part, WidthDim } from './RackServer'

/** 내부 전면 그림 — 피그마 × 1.031 정수 (사용자 10-23). 배경색은 다른 랙 서버와 같음 (사용자 10-23).
 *  왼쪽 상자 35×60 (var(--color-admin-171d23), 피그마 33.87×58.26) · 가운데 본체 609×60 (var(--color-admin-20262e), 선 0.714 var(--color-admin-3f5568), 둥글기 2, 피그마 590.7) ·
 *  오른쪽 상자 38×60 (var(--color-admin-171d23), 피그마 36.58). 상자 사이 1 (캡처에서 잼 — 세 상자 합 661 이 그림 폭 663 과 2 차이).
 *  왼쪽 상자 안 ID 카드 칸 25×14 (var(--color-admin-0e1319), 선 0.714 var(--color-admin-4da3ff), 피그마 24.39×13.55, 둥글기는 랙 사각 포트와 같게) — 상자 왼쪽에서 4 · 위에서 36 (캡처에서 잼).
 *    그 위 세로 글씨 ID CARD — 4 var(--color-admin-8fa5bb) 가운데 맞춤, 위로 90° 돌림 (사용자 10-23 값 3 → '더 키워줘'). 가로는 상자 가운데 17.5 (사용자 10-23), 세로 가운데는 위에서 19.5 (캡처에서 잼).
 *  본체 아래 드라이브 칸 4개 149×46 (var(--color-admin-14181d), 선 0.535 var(--color-admin-3a444e) — 데이터베이스 칸과 같은 색, 캡처 색도 같음, 피그마 144.96×44.71).
 *    칸 사이 2 (피그마 1.4), 본체 바닥에서 1 (위 13 — 캡처에서 잼). 양옆 남는 자리는 3.5 씩 같게 (사용자 10-23, 609 − 602 = 7).
 *    장착 칸(BAY1·2, 표와 같음) 안: 왼쪽 31×46 (var(--color-admin-1a2028), 피그마 29.81×44.71) · 그 위 연두 막대 31×4 (var(--color-admin-5cc46a), 피그마 4.06) ·
 *    노란 판 36×11 (var(--color-admin-f2d230), 피그마 35.23×10.84, 칸 왼쪽에서 58 · 위에서 31 — 캡처에서 잼). 칸 테두리는 맨 위에 그림 (데이터베이스와 같음) (사용자 10-23).
 *  셋째 칸 위 띠에 하늘색 포트 3개 — 사각 11×7 두 개 (피그마 10.84×6.77) + 둥근 칸 11×5 (높이는 캡처에서 잼), var(--color-admin-0e1319) · 선 0.714 var(--color-admin-4da3ff).
 *    자리는 캡처에서 잼 — 왼쪽부터 371 · 390 · 409 (19 간격), 위 21 (둥근 칸은 가운데 맞춰 22) (사용자 10-23).
 *  위 17 은 폭 치수 436 mm (가운데 본체 위). 안쪽 부품은 값 받는 대로 */
const INNER_BAYS = [0, 1, 2, 3].map((i) => 39.5 + i * 151)

/** 오른쪽 상자 안 — 상자 왼쪽 위(646,17) 기준, 가로 가운데 19 (사용자 10-23).
 *  연두 원 17 (피그마 16.064, 선 var(--color-admin-73ca62) · 안 var(--color-admin-0f1319) — 색·선 두께 1.8 은 캡처에서 뽑음), 가운데 위에서 15 ·
 *  ID 버튼 14×8 (선 0.714 var(--color-admin-5a6672), 안 var(--color-admin-0e1319), 글씨 ID Inter 4 var(--color-admin-5a6672)) 위 26 · 까만 점 위 40 ·
 *  상태 점 4개 (연두 var(--color-admin-73ca62) 둘 · 회색 var(--color-admin-5a6672) 둘) 위 49, 가로 7 · 12 · 17 · 22 (5 간격, 줄 가운데는 캡처 자리 14.5 그대로).
 *  원·ID 는 캡처보다 4 내림, 점은 2 (후면 바탕 점 1.4 에서 키움) · 간격 7 → 5 (사용자 10-23) */
function InnerFrontRight() {
  return (
    <g transform="translate(646 17)">
      <circle cx="19" cy="15" r="7.6" fill="var(--color-admin-0f1319)" stroke="var(--color-admin-73ca62)" strokeWidth="1.8" />
      <rect x="12.357" y="26.357" width="13.286" height="7.286" rx="1.5" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-5a6672)" strokeWidth="0.714" />
      <text x="19" y="30" textAnchor="middle" dominantBaseline="central" fill="var(--color-admin-5a6672)" fontFamily="Inter, sans-serif" fontSize="4">
        ID
      </text>
      <circle cx="19" cy="40" r="1" fill="var(--color-admin-000000)" />
      {[7, 12, 17, 22].map((x, i) => (
        <circle key={x} cx={x} cy="49" r="1" fill={i < 2 ? 'var(--color-admin-73ca62)' : 'var(--color-admin-5a6672)'} />
      ))}
    </g>
  )
}

function InnerFrontDrawing() {
  return (
    <svg width="684" height="77" viewBox="0 0 684 77" className="shrink-0" role="img" aria-label="내부 서버 전면 그림">
      <rect x="0" y="17" width="35" height="60" fill="var(--color-admin-171d23)" />
      <rect x="4.357" y="53.357" width="24.286" height="13.286" rx="0.9" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-4da3ff)" strokeWidth="0.714" />
      <text transform="translate(17.5 36.5) rotate(-90)" textAnchor="middle" dominantBaseline="central" fill="var(--color-admin-8fa5bb)" fontFamily="Inter, sans-serif" fontSize="4">
        ID CARD
      </text>
      <rect x="36" y="17" width="609" height="60" rx="2" fill="var(--color-admin-20262e)" />
      {INNER_BAYS.map((x, i) => (
        <g key={x}>
          <rect x={x} y="30" width="149" height="46" fill="var(--color-admin-14181d)" />
          {i < 2 && (
            <>
              <rect x={x} y="30" width="31" height="46" fill="var(--color-admin-1a2028)" />
              <rect x={x} y="30" width="31" height="4" fill="var(--color-admin-5cc46a)" />
              <rect x={x + 58} y="61" width="36" height="11" fill="var(--color-admin-f2d230)" />
            </>
          )}
          <rect x={x + 0.268} y="30.268" width="148.465" height="45.465" fill="none" stroke="var(--color-admin-3a444e)" strokeWidth="0.535" />
        </g>
      ))}
      {[371, 390].map((x) => (
        <rect key={x} x={x + 0.357} y="21.357" width="10.286" height="6.286" rx="0.9" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-4da3ff)" strokeWidth="0.714" />
      ))}
      <rect x="409.357" y="22.357" width="10.286" height="4.286" rx="2.143" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-4da3ff)" strokeWidth="0.714" />
      <rect x="0.0" y="17.357" width="608.286" height="59.286" rx="2" fill="none" stroke="var(--color-admin-3f5568)" strokeWidth="0.714" />
      <rect x="646" y="17" width="38" height="60" fill="var(--color-admin-171d23)" />
      <InnerFrontRight />
      <WidthDim x={36} w={609} mm="436 mm" />
    </svg>
  )
}

/** 전원 장치 하나 — 87×57 (var(--color-admin-252c33), 선 0.714 var(--color-admin-3a444e), 피그마 84×55.55) · 왼쪽 연두 막대 6×57 (var(--color-admin-5cc46a), 피그마 5.42) (사용자 10-23).
 *  안쪽 부품은 CCTV 후면 전원 장치와 같은 모양·색, 크기·자리는 후면 캡처에서 잼 (CCTV 보다 큼):
 *  bar · watt 는 13번 메신저가 바꿔 씀 (회색 막대 · 450W).
 *  원 34 (선 1.3 var(--color-admin-5a6672)) 가운데 (27, 28) + 채운 원 6 · 꽂는 곳 24×24 (58, 16) · 초록 불 (80.5, 7) · 500W (Inter 700 6 var(--color-neutral-100)) 가운데 (56, 47) */
export function InnerPsu({ x, bar = 'var(--color-admin-5cc46a)', watt = '500W' }: { x: number; bar?: string; watt?: string }) {
  return (
    <g transform={`translate(${x} 18.5)`}>
      <rect x="0.357" y="0.357" width="86.286" height="56.286" fill="var(--color-admin-252c33)" stroke="var(--color-admin-3a444e)" strokeWidth="0.714" />
      <rect x="0" y="0" width="6" height="57" fill={bar} />
      <circle cx="27" cy="28" r="16.35" fill="none" stroke="var(--color-admin-5a6672)" strokeWidth="1.3" />
      <circle cx="27" cy="28" r="3" fill="var(--color-admin-5a6672)" />
      <Part x={58} y={16} w={24} h={24} vw={23} vh={17}>
        <path d="M0.267578 0.267578H19.9016L22.5789 2.94494V13.6544L19.9016 16.3318H0.267578V0.267578Z" fill="var(--color-admin-0e1319)" strokeWidth="0.535473" stroke="var(--color-admin-3a444e)" />
      </Part>
      <circle cx="80.5" cy="7" r="1.7" fill="var(--color-admin-2ecc5e)" />
      <text x="56" y="47" textAnchor="middle" dominantBaseline="central" fill="var(--color-neutral-100)" fontFamily="Inter, sans-serif" fontSize="6" fontWeight="700">
        {watt}
      </text>
    </g>
  )
}

/** 후면 바탕 까만 점 (var(--color-admin-0f1319), 점 1.5) — 가로 10 · 세로 8 간격, 세로 7줄 (6 ~ 54). 묶음 셋: 전원 장치 옆 6줄 (181~231) ·
 *  세로 칸 옆 4줄 (328~358) · VGA 옆 3줄 (493~513) (사용자 10-23). 간격·자리는 후면 캡처에서 잼 (캡처 10.8 · 12.8 → 8 · 10) */
const INNER_DOT_XS = [181, 191, 201, 211, 221, 231, 328, 338, 348, 358, 493, 503, 513]
const INNER_DOTS = INNER_DOT_XS.flatMap((x) => [6, 14, 22, 30, 38, 46, 54].map((y) => [x, y] as const))

/** 후면 가운데 부품 — 본체 왼쪽 위 기준. 모양·색은 CCTV 후면과 같고 크기·자리는 후면 캡처에서 잼 (사용자 10-23):
 *  세로 칸 3개 22×54 (var(--color-admin-14181d), 선 0.5 var(--color-admin-3a444e), 피그마 21.68×52.84 — 내부는 셋 다 빈 칸) 240 · 268 · 296, 위 3 ·
 *  USB 4개 16×19 (366 부터 20 간격, 위 34) · VGA 34×23 (449, 31) · BMC 25×21 (525, 33) · GbE 23×18 두 개 (556 · 584, 35) ·
 *  위 불빛 4개 (537 · 558 · 579 · 600, 위 6 — 초록 var(--color-admin-2ecc5e) 첫째·넷째, 회색 var(--color-admin-5a6672) 가운데) · 이름 글씨 Inter 4 (USB3 ×4 · VGA · BMC · GbE LAN1·2 모두 var(--color-admin-8fa5bb) — 캡처에서 GbE 글씨도 회색) */
function InnerRearParts() {
  return (
    <g transform="translate(0 17)">
      {INNER_DOTS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.75" fill="var(--color-admin-0f1319)" />
      ))}
      {[240, 268, 296].map((x) => (
        <rect key={x} x={x + 0.25} y="3.25" width="21.5" height="53.5" fill="var(--color-admin-14181d)" stroke="var(--color-admin-3a444e)" strokeWidth="0.5" />
      ))}
      <g fontFamily="Inter, sans-serif" fontSize="4" textAnchor="middle" dominantBaseline="central" fill="var(--color-admin-8fa5bb)">
        <text x="404" y="28">USB3 ×4</text>
        <text x="466" y="26">VGA</text>
        <text x="537.5" y="28">BMC</text>
        <text x="581.5" y="28">GbE LAN1·2</text>
      </g>
      {[366, 386, 406, 426].map((x) => (
        <Part key={x} x={x} y={34} w={16} h={19} vw={14} vh={15}>
          <path d="M11.9593 0.357422H1.24988C0.756987 0.357422 0.357422 0.756987 0.357422 1.24988V13.7442C0.357422 14.2371 0.756987 14.6367 1.24988 14.6367H11.9593C12.4522 14.6367 12.8518 14.2371 12.8518 13.7442V1.24988C12.8518 0.756987 12.4522 0.357422 11.9593 0.357422Z" fill="var(--color-admin-3a5fbf)" strokeWidth="0.713964" stroke="var(--color-admin-3a444e)" />
        </Part>
      ))}
      <Part x={449} y={31} w={34} h={23} vw={28} vh={19}>
        <path d="M3.03479 0.357422H24.4537L27.1311 3.03479V15.5291L24.4537 18.2065H3.03479L0.357422 15.5291V3.03479L3.03479 0.357422Z" fill="var(--color-admin-0e1319)" strokeWidth="0.713964" stroke="var(--color-admin-4da3ff)" />
      </Part>
      <Part x={525} y={33} w={25} h={21} vw={19} vh={16}>
        <path d="M17.358 0.402344H1.29382C0.800933 0.402344 0.401367 0.801909 0.401367 1.2948V13.7892C0.401367 14.2821 0.800933 14.6816 1.29382 14.6816H17.358C17.8509 14.6816 18.2505 14.2821 18.2505 13.7892V1.2948C18.2505 0.801909 17.8509 0.402344 17.358 0.402344Z" fill="var(--color-admin-0e1319)" strokeWidth="0.803209" stroke="var(--color-admin-2ecc9e)" />
      </Part>
      {[556, 584].map((x) => (
        <Part key={x} x={x} y={35} w={23} h={18} vw={19} vh={15}>
          <path d="M17.3141 0.357422H1.24988C0.756987 0.357422 0.357422 0.756987 0.357422 1.24988V13.7442C0.357422 14.2371 0.756987 14.6367 1.24988 14.6367H17.3141C17.8069 14.6367 18.2065 14.2371 18.2065 13.7442V1.24988C18.2065 0.756987 17.8069 0.357422 17.3141 0.357422Z" fill="var(--color-admin-f2d230)" strokeWidth="0.713964" stroke="var(--color-admin-3a444e)" />
        </Part>
      ))}
      {[537, 558, 579, 600].map((x, i) => (
        <circle key={x} cx={x} cy="6" r="1.2" fill={i === 0 || i === 3 ? 'var(--color-admin-2ecc5e)' : 'var(--color-admin-5a6672)'} />
      ))}
    </g>
  )
}

/** 내부 후면 그림 — 본체 609×60 (var(--color-admin-20262e), 선 0.714 var(--color-admin-3f5568), 둥글기 2, 피그마 590.7×58.26 — 전면 본체와 같은 크기·색) (사용자 10-23).
 *  왼쪽 전원 장치 2개 — 본체 왼쪽에서 1 · 사이 1, 위아래 1.5 (캡처에서 잼).
 *  노란 글씨 (Inter 4 var(--color-admin-f2d230)) — '↑ UPS전원 PDU(좌)' 첫째 전원 위 (가운데 45, 14) · '↓ 상시전원 PDU(우)' 둘째 전원 아래 (133, 84), 그래서 그림 높이 87 (사용자 10-23, 자리는 캡처에서 잼).
 *  가운데·오른쪽 부품은 InnerRearParts. 위 17 은 폭 치수 436 mm (본체 전체 위) */
function InnerRearDrawing() {
  return (
    <svg width="609" height="87" viewBox="0 0 609 87" className="shrink-0" role="img" aria-label="내부 서버 후면 그림">
      <rect x="0" y="17" width="609" height="60" rx="2" fill="var(--color-admin-20262e)" />
      <InnerPsu x={1} />
      <InnerPsu x={89} />
      <InnerRearParts />
      <rect x="0.357" y="17.357" width="608.286" height="59.286" rx="2" fill="none" stroke="var(--color-admin-3f5568)" strokeWidth="0.714" />
      <g fill="var(--color-admin-f2d230)" fontFamily="Inter, sans-serif" fontSize="4" textAnchor="middle" dominantBaseline="central">
        <text x="45" y="14">↑ UPS전원 PDU(좌)</text>
        <text x="133" y="84">↓ 상시전원 PDU(우)</text>
      </g>
      <WidthDim x={0} w={609} mm="436 mm" />
    </svg>
  )
}

/** 후면 표 3묶음 — 디자인 캡처 (사용자 10-23). 캡처에서 '…' 로 잘린 칸은 다른 랙 서버와 같은 글자로 채움 (화면에선 같은 자리에서 잘림):
 *  PSU 상태 '공급' · 사용 '— / 500W', USB '비어 있음', VGA·LAN2 '미사용', BMC 이름 'BMC (Mgmt)' · 상태 '미확인', LAN1 상태 '결선',
 *  PCIe 이름 'PCIe1~3' · '공란'. LAN1 연결 상대는 장비마다 (뒷부분은 캡처에서 안 보여 어림 — 실제 글자 받으면 바꿈).
 *  10·11번은 셋째 묶음 첫 칸에 NIC 2P 카드 (PCIe1 · 포트 NIC-P1 · NIC-P2, 상태 '확인 필요' 노랑 · '미사용', 이름은 IoT 의 FC-P1 처럼 어림) */
function rear(lan1: string, lan1Usage: string, third: PortRow[]): PortRow[][] {
  return [
    [
      { name: 'PSU1', mount: 'PDU 미확인', used: true, state: '공급', tone: 'ok', usage: '— / 500W' },
      { name: 'PSU2', mount: 'PDU 미확인', used: true, state: '공급', tone: 'ok', usage: '— / 500W' },
      { name: 'USB1', mount: '정비용', state: '비어 있음', tone: 'idle', usage: '—' },
      { name: 'USB2', mount: '정비용', state: '비어 있음', tone: 'idle', usage: '—' },
      { name: 'USB3', mount: '정비용', state: '비어 있음', tone: 'idle', usage: '—' },
    ],
    [
      { name: 'USB4', mount: '정비용', state: '비어 있음', tone: 'idle', usage: '—' },
      { name: 'VGA', mount: '현장 콘솔', state: '미사용', tone: 'idle', usage: '—' },
      { name: 'BMC (Mgmt)', mount: 'IP 미등록', used: true, state: '미확인', tone: 'warn', usage: '—' },
      { name: 'LAN1', mount: lan1, used: true, state: '결선', tone: 'ok', usage: lan1Usage },
      { name: 'LAN2', mount: '—', state: '미사용', tone: 'idle', usage: '—' },
    ],
    third,
  ]
}
const EMPTY = (names: string[]): PortRow[] => names.map((name) => ({ name, mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' }))
const nic = (peer: string): PortRow[] => [
  { name: 'PCIe1', mount: 'NIC 2P 카드', used: true, state: '확인 필요', tone: 'warn', usage: '—' },
  { name: 'NIC-P1', mount: `↔ (연계) ${peer} 직결`, used: true, state: '확인 필요', tone: 'warn', usage: '—' },
  { name: 'NIC-P2', mount: '—', state: '미사용', tone: 'idle', usage: '—' },
  ...EMPTY(['PCIe2', 'PCIe3']),
]

/** 전면 표 3묶음 — 디자인 캡처 (사용자 10-23). 잘린 칸은 다른 랙 서버와 같은 글자로 채움 (화면에선 같은 자리에서 잘림):
 *  이름 '전원 버튼' · 'RST 핀홀' · 'ODD 슬롯', 상태 '켜짐' · '미사용' · '점등' · '비어있음' · '장착' · '빈 슬롯', 사용/용량 '증설 자리'.
 *  드라이브 용량만 장비마다 (9~11번 2TB · 12번 447G) */
function front(size: string): PortRow[][] {
  const bay = (name: string): PortRow => ({ name, mount: `${size} 장착`, used: true, state: '장착', tone: 'ok', usage: `— / ${size}` })
  return [
    [
      { name: '전원 버튼', mount: '—', used: true, state: '켜짐', tone: 'ok', usage: '—' },
      { name: 'ID 버튼', mount: '—', state: '미사용', tone: 'idle', usage: '—' },
      { name: 'RST 핀홀', mount: '—', state: '미사용', tone: 'idle', usage: '—' },
      { name: 'LED1', mount: '—', used: true, state: '점등', tone: 'ok', usage: '—' },
      { name: 'LED2', mount: '—', used: true, state: '점등', tone: 'ok', usage: '—' },
    ],
    [
      { name: 'LED3', mount: '—', used: true, state: '점등', tone: 'ok', usage: '—' },
      { name: 'USB1', mount: '정비용', state: '비어있음', tone: 'idle', usage: '—' },
      { name: 'USB2', mount: '정비용', state: '비어있음', tone: 'idle', usage: '—' },
      { name: 'ODD 슬롯', mount: '옵션', state: '미사용', tone: 'idle', usage: '—' },
      bay('BAY1'),
    ],
    [bay('BAY2'), { name: 'BAY3', mount: '—', state: '빈 슬롯', tone: 'idle', usage: '증설 자리' }, { name: 'BAY4', mount: '—', state: '빈 슬롯', tone: 'idle', usage: '증설 자리' }],
  ]
}

const FRONT_NOTE = '장착 내용은 규격서·사진 기준 · 사용/용량은 관리자 프로그램(SMART·df) 연동 후 실시간 · 노랑 = 실측 미확인'
const REAR_NOTE = '연결 상대는 케이블 태그 실측 · PDU 배선·BMC IP 미확인'

/** 연계 서버 상세 — 전면·후면 상자 높이 반반 (사용자 10-23) */
function LinkDetail({ seq, label, summary, frontRows, frontNote = FRONT_NOTE, rearRows }: { seq: number; label: string; summary: { label: string; title: string }; frontRows: PortRow[][]; frontNote?: string; rearRows: PortRow[][] }) {
  const p = useParts(seq)
  return (
    <DetailLayout
      label={label}
      summary={<HostSummary seq={seq} {...summary} />}
      front={<DetailBox front half drawing={<InnerFrontDrawing />} rows={partRows(frontRows, p?.front)} note={frontNote} />}
      rear={<DetailBox half drawing={<InnerRearDrawing />} rows={partRows(rearRows, p?.rear)} note={REAR_NOTE} />}
    />
  )
}

/** 9번 내부 (사용자 10-23 캡처) */
export const InnerDetail = memo(function InnerDetail() {
  return (
    <LinkDetail
      seq={9}
      label="내부 상세"
      summary={{ label: '내부 요약', title: '9. (연계) 내부' }}
      frontRows={front('2TB')}
      rearRows={rear('→ 재난통합 SW (GbE)', '측정 전', EMPTY(['PCIe1', 'PCIe2', 'PCIe3']))}
    />
  )
})

/** 10번 내부망 — 캡처 (사용자 10-23). 11번과 NIC 카드로 직결 */
export const InnerNetDetail = memo(function InnerNetDetail() {
  return (
    <LinkDetail
      seq={10}
      label="내부망 상세"
      summary={{ label: '내부망 요약', title: '10. (연계) 내부망' }}
      frontRows={front('2TB')}
      rearRows={rear('→ 재난통합 SW (GbE)', '측정 전', nic('외부망'))}
    />
  )
})

/** 11번 외부망 — 캡처 (사용자 10-23). 행정망이라 자동 측정 제외 — 전면 안내 앞에 [행정망 — 자동 측정 제외]. LAN1 '→ 행정망 SW (GbE)' 는 캡처에서 잘려 어림 */
export const OuterNetDetail = memo(function OuterNetDetail() {
  return (
    <LinkDetail
      seq={11}
      label="외부망 상세"
      summary={{ label: '외부망 요약', title: '11. (연계) 외부망' }}
      frontRows={front('2TB')}
      frontNote={`[행정망 — 자동 측정 제외] ${FRONT_NOTE}`}
      rearRows={rear('→ 행정망 SW (GbE)', '측정 제외', nic('내부망'))}
    />
  )
})

/** 12번 외부 — 캡처 (사용자 10-23). 드라이브 447G, NIC 카드 없음. LAN1 '→ DMZ L3 SW (GbE)' 는 캡처에서 잘려 어림 */
export const OuterDetail = memo(function OuterDetail() {
  return (
    <LinkDetail
      seq={12}
      label="외부 상세"
      summary={{ label: '외부 요약', title: '12. (연계) 외부' }}
      frontRows={front('447G')}
      rearRows={rear('→ DMZ L3 SW (GbE)', '측정 전', EMPTY(['PCIe1', 'PCIe2', 'PCIe3']))}
    />
  )
})
