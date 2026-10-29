// 13번 상황전파메신저 상세 — 상자 구조(왼쪽 상자 · 본체 · 오른쪽 상자)는 9번 내부와 같고 안 부품만 다르다 (사용자 10-23).
//   요약 상자는 3~12번과 같이 씀 (HostSummary, server /servers/bungyisvr). 표는 디자인 줄에 /parts 값을 덮음 (사용자 10-23)
import { memo } from 'react'
import { useParts } from './data'
import type { PortRow } from './FirewallFront'
import { HostSummary } from './HostSummary'
import { InnerPsu } from './LinkDetail'
import { partRows } from './liveRows'
import { DetailBox, DetailLayout, Part, WidthDim } from './RackServer'

/** 드라이브 칸 4개 131×50 (피그마 127.35×48.77), 본체 왼쪽에서 1 · 132 간격 (칸 사이 1), 위 6 (본체 위 띠 6 · 아래 4 — 캡처에서 잼).
 *  장착 칸(1·2): 바탕 var(--color-admin-14181d) · 선 0.535 var(--color-admin-3a444e), 왼쪽 28×50 (var(--color-admin-1a2028), 피그마 27.1×48.77) · 그 위 하늘색 막대 28×4 (피그마 27.1×4.06) ·
 *    노란 판 36×11 (var(--color-admin-f2d230), 피그마 35.23×10.84, 칸 왼쪽에서 56 · 위에서 35) · 까만 점 (var(--color-admin-0f1319), 점 1.5) 가로 10 · 세로 8.5 간격 (칸 왼쪽 33 · 위 5 부터).
 *  빈 칸(3·4): 바탕 var(--color-admin-0f1319) · 점선 테두리 (1.5 1, 다른 랙 빈 칸과 같음). 자리 · 점 간격 · 하늘색 var(--color-admin-61a0e4) 는 캡처에서 잼 (사용자 10-23) */
const BAYS = [0, 1, 2, 3].map((i) => 37 + i * 132)
const BAY_DOTS = Array.from({ length: 10 }, (_, i) => 33 + i * 10).flatMap((x) => [5, 13.5, 22, 30.5, 39, 47.5].map((y) => [x, y] as const))

/** 오른쪽 조작판 78×50 (var(--color-admin-171d23), 선 0.535 var(--color-admin-3a444e), 피그마 75.87×48.77) — 넷째 칸 오른쪽 2, 본체 오른쪽 끝에서 1.
 *  안 (판 왼쪽 위 기준, 캡처에서 잼): 연두 원 (선 1.2 var(--color-admin-73ca62), 지름 9) 가운데 (11, 9) · 불빛 4개 (연두 var(--color-admin-73ca62) 첫째·넷째, 회색 var(--color-admin-5a6672)) 25.5 부터 11 간격 ·
 *  하늘색 포트 사각 11×7 두 개 (6 · 22, 위 23) + 둥근 칸 29×13 (40, 20) — var(--color-admin-0e1319) · 선 0.714 var(--color-admin-4da3ff) (9번 전면 포트와 같음) */
function Panel() {
  return (
    <g transform="translate(566 23)">
      <rect x="0.268" y="0.268" width="77.465" height="49.465" fill="var(--color-admin-171d23)" stroke="var(--color-admin-3a444e)" strokeWidth="0.535" />
      <circle cx="11" cy="9" r="3.9" fill="none" stroke="var(--color-admin-73ca62)" strokeWidth="1.2" />
      {[25.5, 36.5, 47.5, 58.5].map((x, i) => (
        <circle key={x} cx={x} cy="9" r="1" fill={i === 0 || i === 3 ? 'var(--color-admin-73ca62)' : 'var(--color-admin-5a6672)'} />
      ))}
      {[6, 22].map((x) => (
        <rect key={x} x={x + 0.357} y="23.357" width="10.286" height="6.286" rx="0.9" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-4da3ff)" strokeWidth="0.714" />
      ))}
      <rect x="0.0" y="20.357" width="28.286" height="12.286" rx="6" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-4da3ff)" strokeWidth="0.714" />
    </g>
  )
}

/** 전면 그림 — 상자 구조는 9번 내부와 같음: 왼쪽 상자 35×60 · 본체 609×60 (var(--color-admin-20262e), 선 0.714 var(--color-admin-3f5568)) · 오른쪽 상자 38×60 (var(--color-admin-171d23)), 사이 1 (사용자 10-23).
 *  왼쪽 상자는 비어 있고, 오른쪽 상자 가운데 하늘색 원 (선 1.2 var(--color-admin-61a0e4), 지름 12 — 캡처에서 잼). 위 서버 이름표는 안 그림 (사용자 10-23). 폭 치수 439.5 mm */
function FrontDrawing() {
  return (
    <svg width="684" height="77" viewBox="0 0 684 77" className="shrink-0" role="img" aria-label="상황전파메신저 서버 전면 그림">
      <rect x="0" y="17" width="35" height="60" fill="var(--color-admin-171d23)" />
      <rect x="36" y="17" width="609" height="60" rx="2" fill="var(--color-admin-20262e)" />
      {BAYS.map((x, i) =>
        i < 2 ? (
          <g key={x}>
            <rect x={x} y="23" width="131" height="50" fill="var(--color-admin-14181d)" />
            {BAY_DOTS.map(([dx, dy]) => (
              <circle key={`${dx}-${dy}`} cx={x + dx} cy={23 + dy} r="0.75" fill="var(--color-admin-0f1319)" />
            ))}
            <rect x={x} y="23" width="28" height="50" fill="var(--color-admin-1a2028)" />
            <rect x={x} y="23" width="28" height="4" fill="var(--color-admin-61a0e4)" />
            <rect x={x + 56} y="58" width="36" height="11" fill="var(--color-admin-f2d230)" />
            <rect x={x + 0.268} y="23.268" width="0.0" height="49.465" fill="none" stroke="var(--color-admin-3a444e)" strokeWidth="0.535" />
          </g>
        ) : (
          <rect key={x} x={x + 0.268} y="23.268" width="0.0" height="49.465" fill="var(--color-admin-0f1319)" stroke="var(--color-admin-3a444e)" strokeWidth="0.535" strokeDasharray="1.5 1" />
        ),
      )}
      <Panel />
      <rect x="0.0" y="17.357" width="608.286" height="59.286" rx="2" fill="none" stroke="var(--color-admin-3f5568)" strokeWidth="0.714" />
      <rect x="646" y="17" width="38" height="60" fill="var(--color-admin-171d23)" />
      <circle cx="665" cy="47" r="5.4" fill="none" stroke="var(--color-admin-61a0e4)" strokeWidth="1.2" />
      <WidthDim x={36} w={609} mm="439.5 mm" />
    </svg>
  )
}

/** 후면 그림 — 9~12번 후면 구조를 바꿔 씀 (사용자 10-23). 본체 609×60 · 전원 장치 2개 (막대 회색 var(--color-admin-3a444e) · 450W) · 위아래 PDU 노란 글씨는 같음.
 *  부품 (본체 왼쪽 위 기준, 크기·자리는 후면 캡처에서 잼):
 *  VGA · COM 34×21 · 34×20 (191, 4 · 32, 둥글기 3, var(--color-admin-0e1319) · 선 0.714 var(--color-admin-4da3ff), 안에 이름 Inter 3.5 var(--color-admin-8fa5bb)) ·
 *  Mgmt 24×20 (238, 29, 선 0.8 var(--color-admin-2ecc9e) — 9번 BMC 와 같음, 위에 이름) · USB 3개 16×18 (272 · 292 · 312, 위 5) ·
 *  GbE 23×19 두 개 (272 노랑 · 300 빈 칸 var(--color-admin-0e1319) 선 var(--color-admin-3a444e), 위 32, 아래 이름 'GbE ×2') ·
 *  AD 표시 22×14 (341, 11, var(--color-admin-170a0c) · 선 0.5 var(--color-admin-3a444e), 글씨 Inter 700 7 var(--color-admin-f2c549)) ·
 *  까만 점 (var(--color-admin-0f1319), 점 1.5) 가로 12줄 383 부터 10 간격 · 세로 7줄 4 부터 8 간격 · 세로 칸 3개 28×54 (505 · 538 · 571, 위 3, var(--color-admin-14181d) · 선 0.5 var(--color-admin-3a444e) — 9번 칸과 같은 색).
 *  LAN 아래 글씨 '→ 행정망 SW P22' (Inter 4 var(--color-admin-8fa5bb), 가운데 284) */
const REAR_DOTS = Array.from({ length: 12 }, (_, i) => 383 + i * 10).flatMap((x) => [4, 12, 20, 28, 36, 44, 52].map((y) => [x, y] as const))

function RearDrawing() {
  return (
    <svg width="609" height="87" viewBox="0 0 609 87" className="shrink-0" role="img" aria-label="상황전파메신저 서버 후면 그림">
      <rect x="0" y="17" width="609" height="60" rx="2" fill="var(--color-admin-20262e)" />
      <InnerPsu x={1} bar="var(--color-admin-3a444e)" watt="450W" />
      <InnerPsu x={89} bar="var(--color-admin-3a444e)" watt="450W" />
      <g transform="translate(0 17)">
        {REAR_DOTS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="0.75" fill="var(--color-admin-0f1319)" />
        ))}
        {[505, 538, 571].map((x) => (
          <rect key={x} x={x + 0.25} y="3.25" width="27.5" height="53.5" fill="var(--color-admin-14181d)" stroke="var(--color-admin-3a444e)" strokeWidth="0.5" />
        ))}
        <rect x="191.357" y="4.357" width="0.0" height="20.286" rx="3" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-4da3ff)" strokeWidth="0.714" />
        <rect x="191.357" y="32.357" width="0.0" height="19.286" rx="3" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-4da3ff)" strokeWidth="0.714" />
        <rect x="238.4" y="29.4" width="23.2" height="19.2" rx="0.9" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-2ecc9e)" strokeWidth="0.8" />
        {[272, 292, 312].map((x) => (
          <Part key={x} x={x} y={5} w={16} h={18} vw={14} vh={15}>
            <path d="M11.9593 0.357422H1.24988C0.756987 0.357422 0.357422 0.756987 0.357422 1.24988V13.7442C0.357422 14.2371 0.756987 14.6367 1.24988 14.6367H11.9593C12.4522 14.6367 12.8518 14.2371 12.8518 13.7442V1.24988C12.8518 0.756987 12.4522 0.357422 11.9593 0.357422Z" fill="var(--color-admin-3a5fbf)" strokeWidth="0.713964" stroke="var(--color-admin-3a444e)" />
          </Part>
        ))}
        {[
          [272, 'var(--color-admin-f2d230)'],
          [300, 'var(--color-admin-0e1319)'],
        ].map(([x, fill]) => (
          <Part key={x} x={Number(x)} y={32} w={23} h={19} vw={19} vh={15}>
            <path d="M17.3141 0.357422H1.24988C0.756987 0.357422 0.357422 0.756987 0.357422 1.24988V13.7442C0.357422 14.2371 0.756987 14.6367 1.24988 14.6367H17.3141C17.8069 14.6367 18.2065 14.2371 18.2065 13.7442V1.24988C18.2065 0.756987 17.8069 0.357422 17.3141 0.357422Z" fill={String(fill)} strokeWidth="0.713964" stroke="var(--color-admin-3a444e)" />
          </Part>
        ))}
        <rect x="341.25" y="11.25" width="21.5" height="13.5" rx="0.9" fill="var(--color-admin-170a0c)" stroke="var(--color-admin-3a444e)" strokeWidth="0.5" />
        <g fontFamily="Inter, sans-serif" textAnchor="middle" dominantBaseline="central">
          <text x="352" y="18" fill="var(--color-admin-f2c549)" fontSize="7" fontWeight="700">
            AD
          </text>
          <g fill="var(--color-admin-8fa5bb)" fontSize="3.5">
            <text x="208" y="14.5">VGA</text>
            <text x="208" y="42">COM</text>
          </g>
          <g fill="var(--color-admin-8fa5bb)" fontSize="4">
            <text x="250" y="25">Mgmt</text>
            <text x="298" y="55">GbE ×2</text>
          </g>
        </g>
      </g>
      <rect x="0.357" y="17.357" width="608.286" height="59.286" rx="2" fill="none" stroke="var(--color-admin-3f5568)" strokeWidth="0.714" />
      <g fontFamily="Inter, sans-serif" fontSize="4" textAnchor="middle" dominantBaseline="central">
        <g fill="var(--color-admin-f2d230)">
          <text x="45" y="14">↑ UPS전원 PDU(좌)</text>
          <text x="133" y="84">↓ 상시전원 PDU(우)</text>
        </g>
        <text x="284" y="84" fill="var(--color-admin-8fa5bb)">
          → 행정망 SW P22
        </text>
      </g>
      <WidthDim x={0} w={609} mm="439.5 mm" />
    </svg>
  )
}

/** 전면 표 2묶음 — 디자인 캡처 (사용자 10-23). 캡처에서 '…' 로 잘린 칸은 다른 랙 서버와 같은 글자로 채움 (화면에선 같은 자리에서 잘림):
 *  BAY3·4 상태 '빈 트레이', 확인 칸 '확인 필요' */
const BAY = (name: string): PortRow => ({ name, mount: '4TB SATA · RAID1', used: true, state: '장착', tone: 'ok', usage: '— / 4TB' })
const EMPTY_BAY = (name: string): PortRow => ({ name, mount: '—', state: '빈 트레이', tone: 'idle', usage: '증설 자리' })
const CHECK = (name: string, mount: string): PortRow => ({ name, mount, used: true, state: '확인 필요', tone: 'warn', usage: '—' })
/** 2묶음이라 칸이 넓음 — 항목 65 · 상태 59 · 사용/용량 60, 장착 내용은 남는 폭 (캡처 글자 시작 자리에서 잼, 사용자 10-23) */
const FRONT_COLS = ['w-[65px]', '', 'w-[59px]', 'w-[60px]']
const FRONT: PortRow[][] = [
  [BAY('BAY1'), BAY('BAY2'), EMPTY_BAY('BAY3'), EMPTY_BAY('BAY4'), { name: '전원 버튼', mount: '우측 하단', used: true, state: '켜짐', tone: 'ok', usage: '—' }, CHECK('ID 버튼', '—')],
  [CHECK('LED1', '녹색 점등'), CHECK('LED2', '녹색 점등'), CHECK('LED3', '녹색 점등'), CHECK('USB1', '—'), CHECK('USB2', '—'), CHECK('VGA (전면)', '—')],
]

/** 후면 표 3묶음 — 디자인 캡처 (사용자 10-23). 캡처에서 '…' 로 잘린 칸은 어림해 채움 (화면에선 같은 자리에서 잘림):
 *  이름 'COM (시리얼)' · 'VGA (후면)' · 'PCIe1~3' · 'POST 표시', 연결 상대 '행정망 SW P22' · '케이블에 가려짐', 상태 '미사용' · '비어 있음' · '확인 필요' · '공란' · 'AD 표시',
 *  트래픽 '— / 450W' · '측정 제외'. 실제 글자 받으면 바꿈 */
const REAR: PortRow[][] = [
  [
    { name: 'PSU1', mount: 'PDU 미확인', used: true, state: '공급', tone: 'ok', usage: '— / 450W' },
    { name: 'PSU2', mount: 'PDU 미확인', used: true, state: '공급', tone: 'ok', usage: '— / 450W' },
    { name: 'COM (시리얼)', mount: '—', state: '미사용', tone: 'idle', usage: '—' },
    { name: 'VGA (후면)', mount: '—', state: '미사용', tone: 'idle', usage: '—' },
    { name: 'LAN1', mount: '행정망 SW P22', used: true, state: '결선', tone: 'ok', usage: '측정 제외' },
  ],
  [
    { name: 'LAN2', mount: '—', state: '미사용', tone: 'idle', usage: '—' },
    { name: 'Mgmt', mount: '—', used: true, state: '미확인', tone: 'warn', usage: '—' },
    { name: 'USB1', mount: '—', state: '비어 있음', tone: 'idle', usage: '—' },
    { name: 'USB2', mount: '—', state: '비어 있음', tone: 'idle', usage: '—' },
    { name: 'USB3', mount: '케이블에 가려짐', used: true, state: '확인 필요', tone: 'warn', usage: '—' },
  ],
  [
    ...['PCIe1', 'PCIe2', 'PCIe3'].map((name): PortRow => ({ name, mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' })),
    { name: 'POST 표시', mount: '7-seg', used: true, state: 'AD 표시', tone: 'warn', usage: '—' },
  ],
]

/** 13번 상황전파메신저 상세 — 9~12번처럼 전면·후면 반반 (사용자 10-23) */
export const MessengerDetail = memo(function MessengerDetail() {
  const p = useParts(13)
  return (
    <DetailLayout
      label="상황전파메신저 상세"
      summary={<HostSummary seq={13} label="상황전파메신저 요약" title="13. (전파) 상황전파메신저" />}
      front={
        <DetailBox front half drawing={<FrontDrawing />} rows={partRows(FRONT, p?.front)} cols={FRONT_COLS} note="[행정망 — 자동 측정 제외] 장착 내용은 규격서·사진 기준 · 사용/용량은 관리자 프로그램(SMART·df) 연동 후 실시간 · 노랑 = 실측 미확인" />
      }
      rear={<DetailBox half drawing={<RearDrawing />} rows={partRows(REAR, p?.rear)} note="[행정망 — 자동 측정 제외] 연결 상대는 케이블 태그 실측 · PDU 배선·BMC IP 미확인" />}
    />
  )
})
