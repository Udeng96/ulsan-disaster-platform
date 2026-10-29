// 랙 서버 상세 공통 틀 — 3번 데이터베이스부터 8번 CCTV까지 그림 구조가 같고 디테일만 다르다 (사용자 10-23).
//   왼쪽 요약 상자(장비마다 따로) + 오른쪽 위 전면 · 아래 후면. 그림·표 모양은 데이터베이스에서 맞춘 그대로,
//   장비마다 다른 것(이름판 글씨, 채운 드라이브 칸 수, 전원 W, USB 수, 확장 슬롯 수, 표 내용)만 RackSpec 으로 받는다
import type { ReactNode } from 'react'
import { useParts } from './data'
import { Group, type PortRow } from './FirewallFront'
import { partRows } from './liveRows'

export type Bay = { plate: string; spec?: boolean } | null

export type RackSpec = {
  /** 이름판 글씨 · 그림 이름 */
  name: string
  /** 전면 아래 드라이브 칸 4개 — 용량 판 글씨, spec 은 규격서에만 있고 실측 전(판을 어둡게), null 은 빈 칸 */
  bays: Bay[]
  /** 전원 장치 글씨 (1200W 등) */
  psu: string
  /** GbE 포트 위 이름 글씨 */
  gbe: string
  /** 후면 USB 포트 수 — 2 또는 4 */
  usb: 2 | 4
  /** USB 위 이름 글씨 — 데이터베이스만 있음 (솔루션·IoT 캡처엔 없음) */
  usbLabel?: string
  /** 첫 확장 슬롯에 FC 카드 (IoT 캡처 10-23) */
  fc?: boolean
  /** 후면 오른쪽 확장 슬롯 수 */
  slots: number
  front: PortRow[][]
  frontNote: string
  rear: PortRow[][]
  rearNote: string
}

/** 왼쪽 상자 안 — 랙 3번 서버 왼쪽 상자(RackParts ServerSide)와 같은 구성, 위에서부터 (사용자 10-22, 피그마 × 1.031 정수).
 *  크기: 하늘색 원 6 (피그마 5.712) · 원형 포트 5 두 개 (피그마 4.641) + 오른쪽 위 초록 불 2 (피그마 1.606) · 사각 포트 10×12 (피그마 svg) · 파란 막대 18×2 (피그마 17.849×2.142).
 *  위치는 피그마 캡처에서 잰 값 — 원 가운데 6·18·27, 사각 34, 막대 50 (상자 위에서). 색·선은 랙과 같음.
 *  맨 아래 세로 글씨 RE2208 — Inter 400 4 (피그마 3.57), var(--color-admin-8fa5bb), 위로 90° 돌림. 상자 왼쪽에서 8 (피그마 7.59), 아래에서 1 (피그마 1.23) */
function FrontLeft() {
  return (
    <g transform="translate(0 17)">
      <circle cx="11" cy="6" r="2.643" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-4da3ff)" strokeWidth="0.714" />
      {[18, 27].map((y) => (
        <g key={y}>
          <circle cx="11" cy={y} r="2.143" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-5a6672)" strokeWidth="0.714" />
          <circle cx="14" cy={y - 3} r="0.803" fill="var(--color-admin-2ecc5e)" />
        </g>
      ))}
      <path transform="translate(7 34)" d="M8.38951 0.357422H1.24988C0.756987 0.357422 0.357422 0.756987 0.357422 1.24988V10.1744C0.357422 10.6673 0.756987 11.0669 1.24988 11.0669H8.38951C8.8824 11.0669 9.28197 10.6673 9.28197 10.1744V1.24988C9.28197 0.756987 8.8824 0.357422 8.38951 0.357422Z" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-4da3ff)" strokeWidth="0.713964" />
      <rect x="2" y="50" width="18" height="2" fill="var(--color-admin-4da3ff)" />
      <text transform="translate(10 80) rotate(-90)" dominantBaseline="central" fill="var(--color-admin-8fa5bb)" fontFamily="Inter" fontSize="4">
        RE2208
      </text>
    </g>
  )
}

/** 가운데 본체 안 — 랙 3번 서버 가운데 박스(RackParts ServerBay·Disks·BayTop)와 같은 구성 (사용자 10-23, 피그마 × 1.031 정수). 본체 왼쪽 위(25,17) 기준.
 *  아래 드라이브 칸 4개 98×26 (var(--color-admin-14181d), 선 0.535 var(--color-admin-3a444e), 피그마 95.493×24.989) — 본체 바닥에 붙이고 빈틈 없이 이어서, 남는 6 은 양옆 3씩.
 *    칸 안: 왼쪽 20×26 (var(--color-admin-1a2028), 피그마 19.634) · 그 위 파란 막대 20×3 (var(--color-admin-4da3ff), 피그마 2.677) · 막대 밑 가운데 파란 원 2 (피그마 2.32) ·
 *    용량 판 24×7 (var(--color-admin-f2d230), 피그마 23.204×7.14, 칸 안 왼 36·위 16 — 캡처에서 잼), 글씨 480G Roboto 500 4 var(--color-admin-1a2430) 가운데 (랙과 같은 글씨, 크기만 비율).
 *    빈 칸(솔루션 캡처 10-23): 더 어두운 바탕 var(--color-admin-0e1319) + 점선 테두리 — 색·점선 간격은 캡처에서 어림.
 *    규격서만 있는 칸(GIS 캡처 10-23): 용량 판을 어둡게 var(--color-admin-372e03) (캡처에서 뽑음), 글씨는 판과 같은 색 계열 var(--color-admin-8c7a1c) (캡처에선 안 보여 어림).
 *  그 위 빈 칸 4개 98×26 (선만 0.535 var(--color-admin-3a444e), 피그마 같은 크기).
 *  맨 위: 서버 이름 판 64×11 (var(--color-admin-f2d230), 피그마 62.472×10.709, 글씨 Inter 700 4 var(--color-admin-1a2430) 가운데) · 오른쪽 사각형 55×7 (var(--color-admin-171d23), 선 0.535 var(--color-admin-3a444e), 피그마 53.547×7.14).
 *    본체 가장자리에서 12, 판 위 7 · 사각형 위 9 로 세로 가운데가 같게 (캡처에서 잼). 본체 테두리는 맨 위에 그림 (랙과 같음) */
const BAYS = [0, 1, 2, 3].map((i) => 28 + i * 98)
const LINE = { fill: 'none', stroke: 'var(--color-admin-3a444e)', strokeWidth: 0.535 } as const

function FrontBay({ name, bays }: { name: string; bays: Bay[] }) {
  return (
    <g>
      <rect x="37" y="24" width="64" height="11" fill="var(--color-admin-f2d230)" />
      <text x="69" y="29.5" textAnchor="middle" dominantBaseline="central" fill="var(--color-admin-1a2430)" fontFamily="Inter, sans-serif" fontSize="4" fontWeight="700">
        {name}
      </text>
      <rect x="356.268" y="26.268" width="54.465" height="6.465" fill="var(--color-admin-171d23)" stroke="var(--color-admin-3a444e)" strokeWidth="0.535" />
      {BAYS.map((x, i) => {
        const bay = bays[i]
        return (
        <g key={x}>
          <rect x={x + 0.268} y="46.268" width="97.465" height="25.465" {...LINE} />
          {bay ? (
            <>
              <rect x={x} y="72" width="98" height="26" fill="var(--color-admin-14181d)" />
              <rect x={x} y="72" width="20" height="26" fill="var(--color-admin-1a2028)" />
              <rect x={x} y="72" width="20" height="3" fill="var(--color-admin-4da3ff)" />
              <circle cx={x + 10} cy="76" r="1" fill="var(--color-admin-4da3ff)" />
              <rect x={x + 36} y="88" width="24" height="7" fill={bay.spec ? 'var(--color-admin-372e03)' : 'var(--color-admin-f2d230)'} />
              <text x={x + 48} y="91.5" textAnchor="middle" dominantBaseline="central" fill={bay.spec ? 'var(--color-admin-8c7a1c)' : 'var(--color-admin-1a2430)'} fontFamily="Roboto, sans-serif" fontSize="4" fontWeight="500">
                {bay.plate}
              </text>
              <rect x={x + 0.268} y="72.268" width="97.465" height="25.465" {...LINE} />
            </>
          ) : (
            <rect x={x + 0.268} y="72.268" width="97.465" height="25.465" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-3a444e)" strokeWidth="0.535" strokeDasharray="1.5 1" />
          )}
        </g>
        )
      })}
    </g>
  )
}

/** 오른쪽 상자 안 — 위에서부터 (사용자 10-23, 피그마 × 1.031 정수). 상자 왼쪽 위(425,17) 기준, 가로는 상자 가운데.
 *  사각 포트 9×11 (var(--color-admin-0e1319), 선 0.714 var(--color-admin-4da3ff), 피그마 8.925×10.709, 둥글기는 왼쪽 상자 사각 포트와 같게) ·
 *  파란 막대 18×2 (var(--color-admin-4da3ff), 피그마 17.849×2.142) · 원 17 (선 0.714 var(--color-admin-5a6672), 피그마 16.064) 안에 UW (Inter 400 4 var(--color-admin-5a6672), 피그마 3.57).
 *  위치는 피그마 캡처에서 잰 값 — 사각 위 15, 막대 30, 원 가운데 54 */
function FrontRight() {
  return (
    <g transform="translate(425 17)">
      <rect x="8.357" y="15.357" width="8.286" height="10.286" rx="0.9" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-4da3ff)" strokeWidth="0.714" />
      <rect x="4" y="30" width="18" height="2" fill="var(--color-admin-4da3ff)" />
      <circle cx="12.5" cy="54" r="8.143" fill="none" stroke="var(--color-admin-5a6672)" strokeWidth="0.714" />
      <text x="12.5" y="54" textAnchor="middle" dominantBaseline="central" fill="var(--color-admin-5a6672)" fontFamily="Inter, sans-serif" fontSize="4">
        UW
      </text>
    </g>
  )
}

/** 전면 그림 — 랙의 3번 서버 그림 구조 그대로 크게 (사용자 10-22). 피그마 값 × 1.031 (전면 상자 764 → 788) 을 정수로.
 *  왼쪽 상자 23×81 (var(--color-admin-171d23), 피그마 22.311×78.536) · 가운데 본체 398×81 (var(--color-admin-20262e), 선 0.714 var(--color-admin-3f5568), 피그마 386.433) ·
 *  오른쪽 상자 25×81 (var(--color-admin-171d23), 피그마 24.096). 상자 사이 2 (피그마 2 × 1.031). 본체 둥글기 2 는 스위칭 허브 본체와 같게.
 *  선은 안쪽으로 그려 바깥 크기가 그대로 (선 두께 반 0.357 만큼 들임). 위 17 은 폭 치수 433 mm (가운데 본체 위) */
function FrontDrawing({ name, bays }: { name: string; bays: Bay[] }) {
  return (
    <svg width="450" height="98" viewBox="0 0 450 98" className="shrink-0" role="img" aria-label={`${name} 서버 전면 그림`}>
      <rect x="0" y="17" width="23" height="81" fill="var(--color-admin-171d23)" />
      <FrontLeft />
      <rect x="25" y="17" width="398" height="81" rx="2" fill="var(--color-admin-20262e)" />
      <FrontBay name={name} bays={bays} />
      <rect x="25.357" y="17.357" width="397.286" height="80.286" rx="2" fill="none" stroke="var(--color-admin-3f5568)" strokeWidth="0.714" />
      <rect x="425" y="17" width="25" height="81" fill="var(--color-admin-171d23)" />
      <FrontRight />
      <WidthDim x={25} w={398} />
    </svg>
  )
}

/** 칸 너비 — 묶음 셋이 상자 폭(748)을 나눠 가짐: 항목 40 · 상태 34 · 사용/용량 50, 장착 내용은 남는 폭 (캡처에서 잼, 사용자 10-23) */
const COLS = ['w-[40px]', '', 'w-[34px]', 'w-[50px]'] as const
const REAR_HEADERS = ['포트', '연결 상대', '상태', '트래픽']

/** 전면·후면 상자 하나 — 제목 · 가운데 그림 · 표 3묶음 · 아래 설명 (데이터베이스부터 12번까지 같이 씀, 사용자 10-23).
 *  전면(front)은 높이가 내용대로, 후면은 전면 넣고 남은 높이 (사용자 10-23). 그림 비율은 피그마 764 → 788 (× 1.031).
 *  모양은 방화벽·스위칭 허브 전면과 같음 (여백 좌우 20 · 위아래 10, 줄 사이 4, 둥글기 16, Neutral-600, 제목 B1 흰색).
 *  위아래 여백은 치수까지 넣으면 후면이 26 모자라 12 로, 솔루션 후면 표가 7줄이라 4 더 모자라 10 으로 줄임 (사용자 10-23).
 *  cols — 칸 너비 (기본은 3묶음용 COLS, 13번 전면처럼 2묶음이면 더 넓게).
 *  half — 전면도 남은 높이를 나눠 가져 전면·후면이 반반 (9번 내부, 사용자 10-23). 자리가 남아 위아래 여백도 기본 20 그대로, 표 줄도 스펙대로 여백 6 (roomy) (사용자 10-23). 다른 장비는 안 씀.
 *  표 — 방화벽 표와 같은 모양(여백 6, 칸 사이 10, 글씨 B6). 묶음 셋이 폭 안에 다 들어가고 긴 글자는 '…' (사용자 10-23 캡처), 스크롤 없음 */
export function DetailBox({ front, half, drawing, rows, note, cols = COLS }: { front?: boolean; half?: boolean; drawing: ReactNode; rows: PortRow[][]; note: string; cols?: readonly string[] }) {
  return (
    <section
      aria-label={front ? '전면 드라이브 베이' : '후면 네트워크 전원'}
      className={`flex ${front && !half ? 'shrink-0' : 'min-h-0 flex-[1_0_0]'} flex-col items-start gap-1 self-stretch rounded-2xl bg-neutral-600 px-5 ${half ? 'py-5' : 'py-2.5'} font-['Roboto',sans-serif]`}
    >
      <h3 className="text-b1 text-white">{front ? '전면 - 드라이브 베이' : '후면 - 네트워크·전원'}</h3>
      <div className="flex justify-center self-stretch">{drawing}</div>
      <div className="flex gap-2.5 self-stretch">
        {rows.map((g) => (
          <Group key={g[0].name} rows={g} fit roomy={half} cols={cols} headers={front ? undefined : REAR_HEADERS} />
        ))}
      </div>
      <p className="text-[12px] leading-[14px] font-medium text-[color:var(--color-admin-5a708a)]">{note}</p>
    </section>
  )
}

/** 폭 치수 — 스위칭 허브 그림과 같은 모양 (1 선 + 끝 눈금 var(--color-admin-6f93b5), 글씨 Roboto 500 9 var(--color-admin-a9c8e4), 선 위 10 · 눈금 5~15 · 글씨 가운데 4) (사용자 10-23).
 *  x 는 선 왼쪽 끝, w 는 폭, mm 은 글씨 (기본 433 mm, 9번 내부 436 mm) */
export function WidthDim({ x, w, mm = '433 mm' }: { x: number; w: number; mm?: string }) {
  return (
    <>
      <g fill="var(--color-admin-6f93b5)">
        <rect x={x} y="10" width={w} height="1" />
        <rect x={x} y="5" width="1" height="10" />
        <rect x={x + w - 1} y="5" width="1" height="10" />
      </g>
      <text x={x + w / 2} y="4" fill="var(--color-admin-a9c8e4)" fontFamily="Roboto, sans-serif" fontSize="9" fontWeight="500" textAnchor="middle" dominantBaseline="central">
        {mm}
      </text>
    </>
  )
}

/** 피그마 svg 를 정수 크기 칸에 그대로 넣음 — 바깥 크기만 × 1.031 을 정수로 (모양은 피그마 경로 그대로) */
export function Part({ x, y, w, h, vw, vh, children }: { x: number; y: number; w: number; h: number; vw: number; vh: number; children: ReactNode }) {
  return (
    <svg x={x} y={y} width={w} height={h} viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="none" overflow="visible">
      {children}
    </svg>
  )
}

/** 전원 장치 하나 — 97×39 (var(--color-admin-252c33), 선 0.714 var(--color-admin-3a444e), 피그마 93.708×0.0). 안: 원 22 (선 0.892 var(--color-admin-5a6672), 피그마 21.419) + 가운데 채운 원 4 (피그마 4.284),
 *  꽂는 곳 24×18 (var(--color-admin-0e1319), 선 0.535 var(--color-admin-3a444e), 피그마 svg 23×17), 초록 불 3 (피그마 2.856), 1200W (Inter 700 4 var(--color-neutral-100), 피그마 4.016).
 *  위치는 피그마 캡처(10-23)에서 잰 값 — 원 가운데 (22, 19.5), 꽂는 곳 (54, 11), 불 (89.5, 11.5), 1200W 가운데 (48, 32) */
function Psu({ y, watt }: { y: number; watt: string }) {
  return (
    <g transform={`translate(1 ${y})`}>
      <rect x="0.357" y="0.357" width="96.286" height="0.0" fill="var(--color-admin-252c33)" stroke="var(--color-admin-3a444e)" strokeWidth="0.714" />
      <circle cx="22" cy="19.5" r="10.554" fill="none" stroke="var(--color-admin-5a6672)" strokeWidth="0.892" />
      <circle cx="22" cy="19.5" r="2" fill="var(--color-admin-5a6672)" />
      <Part x={54} y={11} w={24} h={18} vw={23} vh={17}>
        <path d="M0.267578 0.267578H19.9016L22.5789 2.94494V13.6544L19.9016 16.3318H0.267578V0.267578Z" fill="var(--color-admin-0e1319)" strokeWidth="0.535473" stroke="var(--color-admin-3a444e)" />
      </Part>
      <circle cx="89.5" cy="11.5" r="1.5" fill="var(--color-admin-2ecc5e)" />
      <text x="48" y="32" textAnchor="middle" dominantBaseline="central" fill="var(--color-neutral-100)" fontFamily="Inter, sans-serif" fontSize="4" fontWeight="700">
        {watt}
      </text>
    </g>
  )
}

/** 바탕 까만 점 — 점 1.4 (var(--color-admin-0f1319)), 가로 6 · 세로 5 간격 (사용자 피그마 캡처 10-23 에서 잼: 가로 6.3 · 세로 5.2 × 1.031 → 정수).
 *  가운데 포트 쪽 빈 면에만 (전원 장치 오른쪽 98 ~ 슬롯 왼쪽 278), 슬롯 칸에는 없음 (사용자 10-23).
 *  세로줄은 98~278 (180) 을 6 씩 나눠 104 ~ 272 — 양끝 상자에서 6, 줄 사이도 모두 6 (사용자 10-23: 긴 줄·짧은 줄 간격 같게).
 *  포트 상자(121~276, 41~81) 왼쪽은 긴 줄 3개(104·110·116, 위아래 다), 상자 위는 짧은 줄(122 부터, 상자 위 39 까지) */
const REAR_DOTS: [number, number][] = []
for (let x = 104; x <= 272; x += 6)
  for (let y = 3; y <= 78; y += 5) if (x < 121 || y + 0.7 < 39) REAR_DOTS.push([x, y])

/** USB 포트 자리 (포트 상자 안 x). 2개: 14×15 두 개 (121·137, 사이 2), 데이터베이스는 위에 'USB3 ×2' 글씨.
 *  4개 (솔루션 캡처 10-23): GbE 오른쪽 2 부터 폭 8 · 사이 1 로 네 개 (118~153, 포트 상자 안) — 폭·사이는 캡처에서 어림 */
const USB = {
  2: { xs: [121, 137], w: 14 },
  4: { xs: [118, 127, 136, 145], w: 8 },
} as const

/** FC 카드 — 첫 확장 슬롯 자리에 보라 테두리 (var(--color-admin-7561fc), 바탕 var(--color-admin-1c2028)) + 위에 'FC 16G' (Inter 3 var(--color-admin-c6bdfd) — 4 면 슬롯 폭을 넘어 캡처처럼 안에 들게 줄임) + 포트 9×11 두 개 (var(--color-admin-7561fc)).
 *  색·위치·크기는 사용자 IoT 카드 확대 캡처(10-23)에서 뽑음 — 슬롯 폭 14 를 캡처 41 에 맞춰 잼 (글씨 가운데 11, 포트 위 18 · 39) */
function FcCard() {
  return (
    <g>
      <rect x="278.58" y="3.58" width="12.84" height="72.84" fill="var(--color-admin-1c2028)" stroke="var(--color-admin-7561fc)" strokeWidth="0.714" />
      <text x="285" y="11" textAnchor="middle" dominantBaseline="central" fill="var(--color-admin-c6bdfd)" fontFamily="Inter, sans-serif" fontSize="3">
        FC 16G
      </text>
      {[18, 39].map((y) => (
        <rect key={y} x="280.5" y={y} width="9" height="11" rx="0.9" fill="var(--color-admin-7561fc)" />
      ))}
    </g>
  )
}

/** 후면 그림 — 본체 398×81 (var(--color-admin-20262e), 선 0.714 var(--color-admin-3f5568), 피그마 386.433×78.536, 전면 본체와 같은 크기). 위 17 은 폭 치수 433 mm (본체 전체 위). 피그마 × 1.031 정수 (사용자 10-23).
 *  왼쪽 전원 장치 2개 위아래 (본체 왼 1 · 위 1, 사이 2) · 가운데 포트 상자 155×40 (var(--color-admin-171d23), 선 0.357 var(--color-admin-3a444e), 피그마 149.932×0.0, 왼 121 · 바닥에 붙임) ·
 *  오른쪽 확장 슬롯 14×74 (var(--color-admin-14181d), 선 0.446 var(--color-admin-3a444e), 피그마 13.387×71.396) — 포트 상자에서 2, 사이 3, 위 3. 데이터베이스 6개 · 솔루션 7개 (같은 크기·간격으로 하나 더) · IoT 6개 중 첫째가 FC 카드.
 *  포트 상자 안 (상자 왼쪽 위 기준, 피그마 캡처 10-23 에서 잰 위치) — 포트마다 위에 이름 글씨: VGA 29×20 (8,7) · BMC 20×16 (46,8) · GbE 20×15 두 개 (74·96, 8, 사이 2) · USB (위 USB) · COM 20×10 점선 (112,26) */
function RearDrawing({ spec }: { spec: RackSpec }) {
  const usb = USB[spec.usb]
  return (
    <svg width="398" height="98" viewBox="0 0 398 98" className="shrink-0" role="img" aria-label={`${spec.name} 서버 후면 그림`}>
      <g transform="translate(0 17)">
        <rect width="398" height="81" rx="2" fill="var(--color-admin-20262e)" />
        {REAR_DOTS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="0.7" fill="var(--color-admin-0f1319)" />
        ))}
        <Psu y={1} watt={spec.psu} />
        <Psu y={41} watt={spec.psu} />
        <g transform="translate(121 41)">
          <rect x="0.179" y="0.179" width="154.643" height="0.0" fill="var(--color-admin-171d23)" stroke="var(--color-admin-3a444e)" strokeWidth="0.357" />
          {/* 포트 이름 — Inter 400 4, 포트 가운데 위 (가운데 높이 3). GbE 만 노랑 var(--color-admin-f2d230), 나머지 var(--color-admin-8fa5bb). COM 은 점선 칸 밑 37.5 — 38 이면 본체 선에 글자 아래가 가려짐 (사용자 10-23, 위치는 피그마 캡처에서 잼) */}
          <g fontFamily="Inter, sans-serif" fontSize="4" textAnchor="middle" dominantBaseline="central" fill="var(--color-admin-8fa5bb)">
            <text x="22.5" y="3">VGA</text>
            <text x="56" y="3">BMC</text>
            <text x="95" y="3" fill="var(--color-admin-f2d230)">
              {spec.gbe}
            </text>
            {spec.usbLabel && (
              <text x="136" y="3">
                {spec.usbLabel}
              </text>
            )}
            <text x="122" y="37.5">COM *</text>
          </g>
          <Part x={8} y={7} w={29} h={20} vw={28} vh={19}>
            <path d="M3.03479 0.357422H24.4537L27.1311 3.03479V15.5291L24.4537 18.2065H3.03479L0.357422 15.5291V3.03479L3.03479 0.357422Z" fill="var(--color-admin-0e1319)" strokeWidth="0.713964" stroke="var(--color-admin-4da3ff)" />
          </Part>
          <Part x={46} y={8} w={20} h={16} vw={19} vh={16}>
            <path d="M17.358 0.402344H1.29382C0.800933 0.402344 0.401367 0.801909 0.401367 1.2948V13.7892C0.401367 14.2821 0.800933 14.6816 1.29382 14.6816H17.358C17.8509 14.6816 18.2505 14.2821 18.2505 13.7892V1.2948C18.2505 0.801909 17.8509 0.402344 17.358 0.402344Z" fill="var(--color-admin-0e1319)" strokeWidth="0.803209" stroke="var(--color-admin-2ecc9e)" />
          </Part>
          {[74, 96].map((x) => (
            <Part key={x} x={x} y={8} w={20} h={15} vw={19} vh={15}>
              <path d="M17.3141 0.357422H1.24988C0.756987 0.357422 0.357422 0.756987 0.357422 1.24988V13.7442C0.357422 14.2371 0.756987 14.6367 1.24988 14.6367H17.3141C17.8069 14.6367 18.2065 14.2371 18.2065 13.7442V1.24988C18.2065 0.756987 17.8069 0.357422 17.3141 0.357422Z" fill="var(--color-admin-f2d230)" strokeWidth="0.713964" stroke="var(--color-admin-3a444e)" />
            </Part>
          ))}
          {usb.xs.map((x) => (
            <Part key={x} x={x} y={8} w={usb.w} h={15} vw={14} vh={15}>
              <path d="M11.9593 0.357422H1.24988C0.756987 0.357422 0.357422 0.756987 0.357422 1.24988V13.7442C0.357422 14.2371 0.756987 14.6367 1.24988 14.6367H11.9593C12.4522 14.6367 12.8518 14.2371 12.8518 13.7442V1.24988C12.8518 0.756987 12.4522 0.357422 11.9593 0.357422Z" fill="var(--color-admin-3a5fbf)" strokeWidth="0.713964" stroke="var(--color-admin-3a444e)" />
            </Part>
          ))}
          <Part x={112} y={26} w={20} h={10} vw={19} vh={10}>
            <path d="M0.765224 0.359435C0.884252 0.300625 1.01828 0.267578 1.16003 0.267578H1.74571M0.359435 0.765224C0.300625 0.884252 0.267578 1.01828 0.267578 1.16003V1.85416M0.267578 2.84578V4.23404M0.267578 5.22566V6.61392M0.267578 7.60554V8.29967C0.267578 8.44142 0.300625 8.57545 0.359435 8.69448M0.765224 9.10027C0.884252 9.15908 1.01828 9.19212 1.16003 9.19212H1.74571M2.58238 9.19212H3.75373M4.5904 9.19212H5.76175M6.59843 9.19212H7.76977M8.60645 9.19212H9.7778M10.6145 9.19212H11.7858M12.6225 9.19212H13.7938M14.6305 9.19212H15.8019M16.6385 9.19212H17.2242C17.366 9.19212 17.5 9.15908 17.619 9.10027M18.0248 8.69448C18.0836 8.57545 18.1167 8.44142 18.1167 8.29967V7.60554M18.1167 6.61392V5.22566M18.1167 4.23404V2.84578M18.1167 1.85417V1.16003C18.1167 1.01828 18.0836 0.884253 18.0248 0.765225M17.619 0.359435C17.5 0.300625 17.366 0.267578 17.2242 0.267578H16.6385M15.8019 0.267578H14.6305M13.7938 0.267578H12.6225M11.7858 0.267578H10.6145M9.7778 0.267578H8.60645M7.76977 0.267578H6.59843M5.76175 0.267578H4.59041M3.75373 0.267578H2.58238" strokeWidth="0.535473" stroke="var(--color-admin-5a6672)" />
          </Part>
        </g>
        {Array.from({ length: spec.slots }, (_, i) =>
          i === 0 && spec.fc ? <FcCard key={i} /> : <rect key={i} x={278.223 + i * 17} y="3.223" width="13.554" height="73.554" fill="var(--color-admin-14181d)" stroke="var(--color-admin-3a444e)" strokeWidth="0.446" />,
        )}
        <rect x="0.357" y="0.357" width="397.286" height="80.286" rx="2" fill="none" stroke="var(--color-admin-3f5568)" strokeWidth="0.714" />
      </g>
      <WidthDim x={0} w={398} />
    </svg>
  )
}

/** 상세 틀 — 왼쪽 요약 상자(560) + 오른쪽(위 전면 내용 높이 · 아래 후면 남은 높이, 사이 12), 사이 12 */
export function DetailLayout({ label, summary, front, rear }: { label: string; summary: ReactNode; front: ReactNode; rear: ReactNode }) {
  return (
    <div aria-label={label} className="flex h-[672px] w-[1360px] shrink-0 gap-3">
      {summary}
      <div className="flex min-w-0 flex-[1_0_0] flex-col gap-3">
        {front}
        {rear}
      </div>
    </div>
  )
}

/** 랙 서버 상세 (3~8번) — 장비 파일이 memo 로 감쌈. 표 줄은 디자인에 서버 부품 값을 덮음 (liveRows) */
export function RackDetail({ seq, label, summary, spec }: { seq: number; label: string; summary: ReactNode; spec: RackSpec }) {
  const p = useParts(seq)
  return (
    <DetailLayout
      label={label}
      summary={summary}
      front={<DetailBox front drawing={<FrontDrawing name={spec.name} bays={spec.bays} />} rows={partRows(spec.front, p?.front)} note={spec.frontNote} />}
      rear={<DetailBox drawing={<RearDrawing spec={spec} />} rows={partRows(spec.rear, p?.rear)} note={spec.rearNote} />}
    />
  )
}
