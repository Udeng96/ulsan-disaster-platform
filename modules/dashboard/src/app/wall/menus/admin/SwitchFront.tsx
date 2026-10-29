// 스위칭 허브 상세 오른쪽 위 — 전면 · 포트 구성. 상자·제목은 방화벽 전면과 같다 (사용자 10-22).
//   그림 칸은 피그마 742.38×94.39 → 742×94 정수. 표는 방화벽 전면 표(FirewallFront Group)를 촘촘한 줄로 같이 씀 (사용자 10-22)
import { memo, useRef, type ReactNode } from 'react'
import { ScrollBar } from '@/shared/ui/ScrollBar'
import { overview, switchPorts } from './data'
import { Group, type PortRow } from './FirewallFront'
import { switchRows } from './liveRows'

/** 표 3묶음 — 줄 순서·내용은 디자인 캡처 (각 11줄). 캡처에서 말줄임으로 잘린 글은 짐작해서 채움. 포트 줄은 /switch/ports 값으로 덮는다 (liveRows) */
const UNKNOWN: Omit<PortRow, 'name'> = { mount: '태그 미판독', used: true, state: '확인 필요', tone: 'warn' }
const GROUPS: PortRow[][] = [
  [
    { name: 'LED SYS', mount: '시스템', used: true, state: '점등', tone: 'ok' },
    { name: 'LED PWR', mount: '전원', used: true, state: '점등', tone: 'ok' },
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ name: `P${n}`, ...UNKNOWN })),
  ],
  [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((n) =>
    n === 13 ? { name: 'P13', mount: '← 9 (연계) 내부연계서버', used: true, state: '결선', tone: 'ok', usage: '측정 전' } : { name: `P${n}`, ...UNKNOWN },
  ),
  [
    { name: 'P21', ...UNKNOWN },
    { name: 'P22', ...UNKNOWN },
    { name: 'P23', ...UNKNOWN },
    { name: 'P24', mount: '← 10 (연계) SecureGate-IN', used: true, state: '결선', tone: 'ok', usage: '측정 전' },
    { name: 'SFP1', mount: '—', state: '빈 슬롯', tone: 'idle' },
    { name: 'SFP2', mount: '← 1 (보안) 방화벽', used: true, state: '결선', tone: 'ok', usage: '측정 전' },
    { name: 'SFP3', mount: '—', state: '빈 슬롯', tone: 'idle' },
    { name: 'SFP4', mount: '—', state: '빈 슬롯', tone: 'idle' },
    { name: 'CONSOLE', mount: '—', state: '미결선', tone: 'idle' },
    { name: 'MGMT', mount: '—', state: '미결선', tone: 'idle' },
    { name: 'USB', mount: '펌웨어용', state: '미사용', tone: 'idle' },
  ],
]

/** 포트 한 칸 21×23 — 피그마 14×15 × 1.52 (육각형으로 잰 배율) → 정수 (사용자 10-22).
 *  모양은 랙 2번 포트(RackParts SwitchPort, 5×8)와 같은 그림: 테두리 var(--color-admin-2a343e), 가운데 구멍, 아래 가운데 걸쇠 — 가로·세로 비율대로 늘림 (10배 좌표).
 *  테두리 두께 가로 10% · 세로 8.4%, 둥글기 폭의 7.6%, 걸쇠 폭 29~64.5% · 높이 10% (랙 포트 값) */
const PORT_PATH =
  'M16 0H194Q210 0 210 16V214Q210 230 194 230H16Q0 230 0 214V16Q0 0 16 0Z' + 'M21 19.3V210.7H74.5V187.7H135.5V210.7H189V19.3Z'
function Port({ x, y }: { x: number; y: number }) {
  return (
    <svg x={x} y={y} width="21" height="23" viewBox="0 0 210 230" aria-hidden>
      <path d={PORT_PATH} fill="var(--color-admin-2a343e)" fillRule="evenodd" />
    </svg>
  )
}

/** 10G 사각 포트 24×23 — 랙 10G 사각(6×8)이 1G 포트(5×8)의 1.2배 폭이라 21 × 1.2 → 24 (피그마 캡처 26 : 23 과도 비슷). 높이는 다른 포트와 같은 23 (사용자 10-22).
 *  테두리만 var(--color-admin-3a444e), 두께는 1G 포트와 같게 (가로 2.1 · 세로 1.93), 둥글기 랙 비율 (10배 좌표) */
const Square10G = ({ x, y }: { x: number; y: number }) => (
  <svg x={x} y={y} width="24" height="23" viewBox="0 0 240 230" aria-hidden>
    <path d="M12 0H228Q240 0 240 12V218Q240 230 228 230H12Q0 230 0 218V12Q0 0 12 0ZM21 19.3V210.7H219V19.3Z" fill="var(--color-admin-3a444e)" fillRule="evenodd" />
  </svg>
)

/** 10G 양옆 점 — 3×4 칸에 타원 var(--color-admin-5a6672) (랙 점 0.69:1 비율), 포트 세로 가운데 */
const Dot10G = ({ x, y }: { x: number; y: number }) => <ellipse cx={x + 1.5} cy={y + 11.5} rx="1.4" ry="2" fill="var(--color-admin-5a6672)" />

/** CONSOLE 포트 21×23 — 점선 테두리 var(--color-admin-5a6672). 랙 콘솔(5×8, 선 0.21 · 점선 0.6/0.43 · 둥글기 0.4)을 1G 포트와 같은 비율(4.2배)로 키움 (10배 좌표) */
const ConsolePort = ({ x, y }: { x: number; y: number }) => (
  <svg x={x} y={y} width="21" height="23" viewBox="0 0 210 230" aria-hidden>
    <rect x="4.4" y="4.4" width="201.2" height="221.2" rx="17" fill="none" stroke="var(--color-admin-5a6672)" strokeWidth="8.8" strokeDasharray="25 18" />
  </svg>
)

/** 스위치 그림 틀 — 742×94 칸에 본체 틀 var(--color-admin-20262e), 테두리 0.714 var(--color-admin-3f5568) (사용자 10-22) + 치수선. 전면·후면이 같이 씀 (후면은 안 내용 없이, 사용자 10-22).
 *  칸 안 본체 위치·크기(2,17 · 705×71)는 피그마 캡처에서 잼 — 테두리 바깥 끝이 정수에 오게 0.357 안쪽으로 그림 */
export function SwitchFrame({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <svg width="742" height="94" viewBox="0 0 742 94" className="shrink-0" role="img" aria-label={label}>
      <rect x="2.357" y="17.357" width="704.286" height="70.286" rx="2" fill="var(--color-admin-20262e)" stroke="var(--color-admin-3f5568)" strokeWidth="0.714" />
      {children}
      {/* 치수선 — 방화벽 그림과 같은 모양(1 선 + 끝 눈금, var(--color-admin-6f93b5) · 글씨 Roboto 500 var(--color-admin-a9c8e4)). 위치·글씨 크기(9)는 피그마 캡처에서 잼 (사용자 10-22) */}
      <g fill="var(--color-admin-6f93b5)">
        {/* 가로 440 mm — 본체 폭(3~708) 위 10 */}
        <rect x="3" y="10" width="705" height="1" />
        <rect x="3" y="5" width="1" height="10" />
        <rect x="707" y="5" width="1" height="10" />
        {/* 세로 44 mm — 본체 높이(17~88) 오른쪽 */}
        <rect x="719" y="17" width="1" height="71" />
        <rect x="715" y="17" width="10" height="1" />
        <rect x="715" y="87" width="10" height="1" />
      </g>
      <g fill="var(--color-admin-a9c8e4)" fontFamily="Roboto, sans-serif" fontSize="9" fontWeight="500" textAnchor="middle" dominantBaseline="central">
        <text x="355" y="4">440 mm</text>
        <text x="732" y="52.5" transform="rotate(90 732 52.5)">
          44 mm
        </text>
      </g>
    </svg>
  )
}

/** 전면 그림 — 그림 틀 안에 앞면 부품 */
function SwitchFrontDrawing() {
  return (
    <SwitchFrame label="스위칭 허브 전면 그림">
      {/* 왼쪽 박스 — 랙 2번 앞면 왼쪽 박스와 같은 색 var(--color-admin-1c2027). 피그마 131.19×63.99 → 131×64, 본체 왼쪽에서 14 · 위에서 4 (피그마 캡처).
          둥글기는 랙 박스(31 폭에 1)를 같은 비율로 키워 4 (사용자 10-22) */}
      <rect x="16" y="21" width="131" height="64" rx="4" fill="var(--color-admin-1c2027)" />
      {/* 흰 이름표 — 피그마 95.99×12.8 → 96×13. 왼쪽 박스 안 왼쪽 13 · 위 3 — 랙 이름표 여백 비율(박스 31 에 왼쪽 3 · 오른쪽 5, 높이 22 에 위 1)대로 (사용자 10-22).
          모양·글씨는 랙 이름표와 같은 비율: 바탕 var(--color-admin-f4f6f8), 둥글기 높이의 1/8, 글씨 Inter 700 var(--color-admin-3c4c5c).
          글씨 크기 6 — 피그마 육각형(폭 4.4)이 캡처에서 6.7 로 보여 피그마 값 × 1.52 배, font-size 4 × 1.52 ≈ 6. 세로 가운데 (피그마) */}
      <svg x="29" y="24" width="96" height="13" viewBox="0 0 960 130" aria-label="재난통합플랫폼 SW">
        <rect width="960" height="130" rx="16" fill="var(--color-admin-f4f6f8)" />
        <text x="480" y="65" textAnchor="middle" dominantBaseline="central" fill="var(--color-admin-3c4c5c)" fontFamily="Inter, sans-serif" fontSize="60" fontWeight="700">
          재난통합플랫폼 SW
        </text>
      </svg>
      {/* 포트 부분 전체 — 위(18)·아래(79) 끝을 본체(17~88) 위아래 가운데로 4 내림: 위 5 · 아래 5 (사용자 10-22) */}
      <g transform="translate(0 4)">
        {/* 포트 24개 — 한 줄 12개 두 줄. 첫 칸 왼쪽 233 (피그마 캡처), 칸 사이 7 (캡처 7.45 → 7), 윗줄 위 25 · 아랫줄 위 56 (본체 위에서 8, 줄 사이 8, 캡처) */}
        {/* 포트 위 표시 — 랙과 같은 모양: 칸마다 왼쪽 끝 ▼ · 오른쪽 끝 ▲ (var(--color-admin-5a6672)), 가운데 번호 "1 2" … "23 24" (Inter 400 흰색).
            본체 위(17)와 포트(25) 사이가 8 뿐이라 크기는 피그마 캡처대로 — 삼각형 2.4×3 (위 18, 랙 0.8:1 비율), 번호 4 (기준선 24) */}
        <g fill="var(--color-admin-5a6672)">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={`M${233 + i * 28} 18h2.4l-1.2 3z M${233 + i * 28 + 18.6} 21h2.4l-1.2 -3z`} />
          ))}
        </g>
        <g fill="var(--color-intensity-1)" fontFamily="Inter, sans-serif" fontSize="4" textAnchor="middle">
          {Array.from({ length: 12 }, (_, i) => (
            <text key={i} x={243.5 + i * 28} y="24">{`${i * 2 + 1} ${i * 2 + 2}`}</text>
          ))}
        </g>
        {[25, 56].map((y) => Array.from({ length: 12 }, (_, i) => <Port key={`${y}-${i}`} x={233 + i * 28} y={y} />))}
        {/* 10G 묶음 — 점 · 사각 · 사각 · 점, 두 줄 (같은 줄 높이). 1G 끝(562)에서 점까지 3, 점과 사각 2, 사각 사이 4, 사각과 점 2 (피그마 캡처 간격) */}
        {[25, 56].map((y) => (
          <g key={`10g-${y}`}>
            <Dot10G x={565} y={y} />
            <Square10G x={570} y={y} />
            <Square10G x={598} y={y} />
            <Dot10G x={624} y={y} />
          </g>
        ))}
        {/* MGMT(윗줄) · CONSOLE(아랫줄) — 오른쪽 점에서 2 (피그마 캡처), 1G 포트와 같은 21×23 */}
        <Port x={629} y={25} />
        <ConsolePort x={629} y={56} />
        {/* 포트 이름 — 번호와 같은 글씨 크기 4. 10G 는 묶음(565~627) 가운데 700 var(--color-admin-9db2c6), MGMT 는 MGMT 포트 위, CONSOLE 은 콘솔 포트 바로 위 (랙과 같은 자리) */}
        <g fontFamily="Inter, sans-serif" fontSize="4" textAnchor="middle">
          <text x="596" y="24" fill="var(--color-admin-9db2c6)" fontWeight="700">
            10G
          </text>
          <text x="639.5" y="24" fill="var(--color-intensity-1)">
            MGMT
          </text>
          <text x="639.5" y="55" fill="var(--color-intensity-1)">
            CONSOLE
          </text>
        </g>
        {/* 콘솔 오른쪽 "*" — 랙과 같은 Inter 400 var(--color-admin-8fa5bb), 크기는 랙(2)의 4.2배 → 8. 콘솔 끝(650)에서 4, 콘솔 세로 가운데보다 조금 위 (피그마 캡처) */}
        <text x="654" y="70" fill="var(--color-admin-8fa5bb)" fontFamily="Inter, sans-serif" fontSize="8">
          *
        </text>
        {/* 모델 이름 — 랙과 같은 글씨: SubGate Arial 700 흰색, SG2428GX Arial 400 var(--color-admin-8fa5bb). 크기는 랙(1.25 · 1)의 4.2배 → 5.25 · 4.2.
            * 오른쪽에 붙임 — * 끝(658)에서 2 띄운 660 부터 왼쪽 정렬 (사용자 10-22), 기준선 66 · 73 (피그마 캡처) */}
        <g fontFamily="Arial, sans-serif">
          <text x="660" y="66" fill="var(--color-intensity-1)" fontSize="5.25" fontWeight="700">
            SubGate
          </text>
          <text x="660" y="73" fill="var(--color-admin-8fa5bb)" fontSize="4.2">
            SG2428GX
          </text>
        </g>
      </g>
      {/* 빨간 정육각형 2개 — 피그마 폭 4.4 · 높이 5.08 (var(--color-accent-red)) × 1.52 → 7×8 정수. 왼쪽 박스 안 왼쪽 16 · 29, 위 28 (피그마 캡처) */}
      <g fill="var(--color-accent-red)">
        <path d="M35.5 49L39 51V55L35.5 57L32 55V51Z" />
        <path d="M48.5 49L52 51V55L48.5 57L45 55V51Z" />
      </g>
    </SwitchFrame>
  )
}

/** 전면 · 포트 구성 상자 — 여백 좌우 20 · 위아래 12 (후면 표까지 672 안에 들어가게, 사용자 10-22), 줄 사이 4, 둥글기 16, Neutral-600, 제목 B1 흰색 (방화벽 전면과 같음) */
export const SwitchFront = memo(function SwitchFront() {
  const tableRef = useRef<HTMLDivElement>(null)
  const groups = switchRows(GROUPS, switchPorts.use('poll'), overview.use('poll')?.cards)
  return (
    <section aria-label="전면 포트 구성" className="flex min-h-0 flex-col items-start gap-1 self-stretch rounded-2xl bg-neutral-600 px-5 py-3 font-['Roboto',sans-serif]">
      <h3 className="text-b1 text-white">전면 - 포트 구성</h3>
      <div className="flex justify-center self-stretch">
        <SwitchFrontDrawing />
      </div>
      {/* 표 — 방화벽 전면 표와 같은 모양, 머리 포함 12줄이라 줄을 촘촘하게(compact) — 3묶음 가로로, 넘치면 가로 스크롤 */}
      <div ref={tableRef} className="flex gap-2.5 self-stretch overflow-x-auto [scrollbar-width:none]">
        {groups.map((g) => (
          <Group key={g[0].name} rows={g} compact />
        ))}
      </div>
      {/* 스크롤바 + 안내 문구 — 문구는 스크롤바 1 아래 (사용자 10-22). 글씨 B6 var(--color-admin-5a708a) (사용자 10-22) */}
      <div className="flex flex-col gap-px self-stretch">
        <ScrollBar target={tableRef} axis="x" />
        <p className="text-[12px] leading-[14px] font-medium text-[color:var(--color-admin-5a708a)]">결선 명칭은 케이블 라벨 판독 기준 — 네트워크 구성도 수령 후 확정</p>
      </div>
    </section>
  )
})
