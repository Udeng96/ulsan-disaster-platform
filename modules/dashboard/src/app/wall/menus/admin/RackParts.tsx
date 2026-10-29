// 새 화면 랙 장비 앞면 — 옛 화면 그림(features/menus/admin/Rack*)을 그대로 쓰고, 박스 크기만 피그마 값으로 맞춘다 (사용자 10-22).
//   옛 부품의 고정 크기는 감싸는 칸에서 자식 선택자로 덮는다 (옛 화면 그림은 그대로). 타공 면은 점 간격 때문에 피그마대로 새로 그림.
import { Fragment, type ReactNode } from 'react'
import { RackPort1G } from '@/features/menus/admin/RackPort1G'

/** 1G — 너비 28(옛 30), 포트 줄은 칸 너비에 맞춰 고르게 (피그마 justify-between), 높이는 포트 높이만큼.
 *  포트 테두리는 바깥에 그린다(피그마 stroke 처럼) — 안쪽에 그리면 어두운 포트만 작아 보여 켜진 포트가 더 커 보였다 (사용자 10-22) */
export function Port1G() {
  return (
    <div className="flex self-stretch [&_.rack-1g-pair]:h-auto [&_.rack-1g-pair]:flex-[1_0_0] [&_.rack-1g-port]:shadow-[0_0_0_0.168px_var(--color-admin-9ea8b2)] [&_.rack-1g-ports]:h-auto [&_.rack-1g-ports]:w-full [&>.rack-1g]:w-[28px]">
      <RackPort1G />
    </div>
  )
}

/** 타공 면 (4·5번째 박스) — 새로 그림, 값은 모두 정수 (사용자 10-22).
 *  박스 25×18 (남은 폭을 둘이 나눔), 여백 위아래 3·좌우 3 → 점 판 19×10 이 딱 들어간다.
 *  점 1×1, 줄 안 gap 2 (한 칸 3), 줄 사이 gap 2. 위에서부터 홀수 줄 7개, 짝수 줄 6개 (가운데 정렬 → 반 칸 엇갈림) */
const ROWS = [7, 6, 7, 6]

function Dots({ n }: { n: number }) {
  return (
    <div className="flex gap-[2px]">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="size-px shrink-0 rounded-full bg-[var(--color-admin-727a81)]" />
      ))}
    </div>
  )
}

export function Vent({ children }: { children?: ReactNode }) {
  return (
    <div className="relative flex min-w-px flex-[1_0_0] items-center justify-center self-stretch rounded-[1px] bg-[var(--color-admin-33393e)] p-[3px]">
      <div className="flex flex-col items-center gap-[2px]">
        {ROWS.map((n, i) => (
          <Dots key={i} n={n} />
        ))}
      </div>
      {children}
    </div>
  )
}

/** 이름표 — 타공 면 위 흰 판 10×3 (var(--color-admin-f4f6f8), 둥글기 1), 가운데에서 아래로 0.5 (피그마), 글씨 Roboto 1px 700 var(--color-admin-1a2430).
 *  글씨는 판 정중앙 (사용자 10-22). 1px 글씨를 그냥 쓰면 글꼴마다 위아래 여백이 달라 한쪽으로 쏠려서,
 *  10배로 그린 SVG 를 판 크기로 줄여 가운데(text-anchor middle, 기준선 central)에 놓는다.
 *  central 만으로는 한글이 0.2 아래로 쳐져서 y 를 15 → 13.6 으로 올림 (판 높이 30 기준) */
export function NamePlate({ label }: { label: string }) {
  return (
    <Vent>
      <svg role="img" aria-label={label} viewBox="0 0 100 30" className="absolute top-[calc(50%+0.5px)] left-1/2 h-[3px] w-[10px] -translate-1/2 overflow-visible">
        <rect width="100" height="30" rx="10" fill="var(--color-admin-f4f6f8)" />
        <text x="50" y="13.6" textAnchor="middle" dominantBaseline="central" fill="var(--color-admin-1a2430)" fontFamily="Roboto, sans-serif" fontSize="10" fontWeight="700">
          {label}
        </text>
      </svg>
    </Vent>
  )
}

/** 육각 표시등 2×3 (var(--color-accent-red)) — 피그마 1.684×2.834 를 정수로 늘림 (사용자 10-22) */
const Hexagon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 2 3" className={`absolute h-[3px] w-[2px] ${className ?? ''}`} aria-hidden>
    <path d="M1 0L2 0.75V2.25L1 3L0 2.25V0.75Z" fill="var(--color-accent-red)" />
  </svg>
)

/** 2번 스위치 왼쪽 면 — 박스 31×22 (var(--color-admin-1c2027), 왼 3·위 2), 흰 판 23×4 (왼 6·위 3), 글씨 Inter 2px 700 var(--color-admin-3c4c5c) 판 정중앙,
 *  표시등 육각 둘 (왼 7·10, 위 12). 피그마 소수점 값은 모두 정수로 (사용자 10-22). 글씨는 이름표처럼 SVG 로 가운데 */
export function SwitchFace({ label }: { label: string }) {
  return (
    <>
      <div className="absolute top-[2px] left-[3px] h-[22px] w-[31px] rounded-[1px] bg-[var(--color-admin-1c2027)]" />
      <svg role="img" aria-label={label} viewBox="0 0 230 40" className="absolute top-[3px] left-[6px] h-[4px] w-[23px]">
        <rect width="230" height="40" rx="5" fill="var(--color-admin-f4f6f8)" />
        <text x="115" y="25.5" textAnchor="middle" dominantBaseline="central" fill="var(--color-admin-3c4c5c)" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="700">
          {label}
        </text>
      </svg>
      <Hexagon className="top-[12px] left-[7px]" />
      <Hexagon className="top-[12px] left-[10px]" />
    </>
  )
}

/** 스위치 포트 한 칸 5×8 (var(--color-admin-2a343e) 테두리, 가운데 구멍, 아래 가운데 걸쇠) — 피그마 5.36×8.37 을 정수로.
 *  칸 크기만 정수로 두고 안쪽 구멍·걸쇠는 피그마 비율대로 10배 SVG 로 그린다 (구멍은 비워서 박스 색이 보임) */
const PORT_PATH = 'M3.8 0H46.2Q50 0 50 3.8V76.2Q50 80 46.2 80H3.8Q0 80 0 76.2V3.8Q0 0 3.8 0Z' + 'M5 6.7V73.3H17.75V65.3H32.25V73.3H45V6.7Z'
export function SwitchPort({ x, y }: { x: number; y: number }) {
  return (
    <svg viewBox="0 0 50 80" className="absolute h-[8px] w-[5px]" style={{ left: x, top: y }} aria-hidden>
      <path d={PORT_PATH} fill="var(--color-admin-2a343e)" fillRule="evenodd" />
    </svg>
  )
}

/** 스위치 포트 24개 — 한 줄 12개, 두 줄. 왼쪽 박스(끝 34)에서 2 떨어진 36 부터 (피그마 4.31 — 오른쪽 글씨 자리 확보, 사용자 10-22) 5 + 간격 2 (피그마 간격 1.45 → 2),
 *  윗줄 위 4, 아랫줄 위 15 (피그마 4.29 · 14.9 반올림) (사용자 10-22) */
export function SwitchPorts() {
  return (
    <>
      {/* 포트 번호 "1 2" … "23 24" — Inter 1px(피그마 1.017) 400 흰색, 각 칸 가운데 위. 위 2 (피그마 2.61, 포트와 1 띄움).
          1px 글씨는 10배 SVG 로 그려 칸 가운데에 정확히 놓는다. 숫자·영문은 기준선(y 8.6 = 가운데 5 + 대문자 높이 절반)으로 —
          dominantBaseline central 은 Inter 에서 1 위로 떠서 안 씀 */}
      {/* 칸마다 왼쪽 끝 ▼, 오른쪽 끝 ▲ (var(--color-admin-5a6672)) — 피그마 0.536×0.67 비율 그대로 높이 1 (폭 0.8).
          숫자보다 위 — 위 1 (피그마 삼각형 2.17, 숫자 2.61) (사용자 10-22) */}
      <svg viewBox="0 0 820 10" className="absolute top-px left-[36px] h-px w-[82px] overflow-visible" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d={`M${i * 70} 0h8l-4 10z M${i * 70 + 42} 10h8l-4 -10z`} fill="var(--color-admin-5a6672)" />
        ))}
      </svg>
      <svg viewBox="0 0 820 10" className="absolute top-[2px] left-[36px] h-px w-[82px] overflow-visible" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <text key={i} x={25 + i * 70} y="8.6" textAnchor="middle" fill="var(--color-intensity-1)" fontFamily="Inter, sans-serif" fontSize="10">
            {`${i * 2 + 1} ${i * 2 + 2}`}
          </text>
        ))}
      </svg>
      {[4, 15].map((y) => Array.from({ length: 12 }, (_, i) => <SwitchPort key={`${y}-${i}`} x={36 + i * 7} y={y} />))}
    </>
  )
}

/** 10G 포트 — 한 줄에 점 · 사각형 · 사각형 · 점 (가운데를 기준으로 좌우 뒤집힌 모양), 모두 간격 1. 두 줄 (위 4 · 15, 1G 포트와 같은 줄).
 *  사각형 6×8 (var(--color-admin-3a444e), 피그마 6.125×8.37) — 테두리만, 두께는 1G 포트와 같게 (사용자 10-22), 점 1×1 칸에 타원 (var(--color-admin-5a6672), 피그마 0.69×1 비율) 사각형 세로 가운데.
 *  시작은 포트 끝(118)에서 1 띄운 119 (피그마 119.71) (사용자 10-22) */
const Dot10G = ({ x, y }: { x: number; y: number }) => (
  <svg viewBox="0 0 10 10" className="absolute size-px" style={{ left: x, top: y }} aria-hidden>
    <ellipse cx="5" cy="5" rx="3.45" ry="5" fill="var(--color-admin-5a6672)" />
  </svg>
)
const Square10G = ({ x, y }: { x: number; y: number }) => (
  <svg viewBox="0 0 60 80" className="absolute h-[8px] w-[6px]" style={{ left: x, top: y }} aria-hidden>
    <path d="M3 0H57Q60 0 60 3V77Q60 80 57 80H3Q0 80 0 77V3Q0 0 3 0ZM5 6.7V73.3H55V6.7Z" fill="var(--color-admin-3a444e)" fillRule="evenodd" />
  </svg>
)
export function Ports10G() {
  return (
    <>
      {/* "10G" — Inter 1px(피그마 1.202) 700 var(--color-admin-9db2c6), 포트 묶음(119~136) 가운데 위, 위 2 (피그마 2) */}
      <svg viewBox="0 0 170 10" className="absolute top-[2px] left-[119px] h-px w-[17px] overflow-visible" aria-hidden>
        <text x="85" y="8.6" textAnchor="middle" fill="var(--color-admin-9db2c6)" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="700">
          10G
        </text>
      </svg>
      {[4, 15].map((y) => (
        <Fragment key={y}>
          <Dot10G x={119} y={y + 4} />
          <Square10G x={121} y={y} />
          <Square10G x={128} y={y} />
          <Dot10G x={135} y={y + 4} />
        </Fragment>
      ))}
    </>
  )
}

/** CONSOLE 포트 — 점선 테두리 5×8 (var(--color-admin-5a6672), 피그마 5.59×8.6 · 선 0.23 · 점선 0.67/0.48 을 비율대로) (사용자 10-22) */
export function ConsolePort({ x, y }: { x: number; y: number }) {
  return (
    <svg viewBox="0 0 50 80" className="absolute h-[8px] w-[5px]" style={{ left: x, top: y }} aria-hidden>
      <rect x="1.15" y="1.15" width="47.7" height="77.7" rx="4" fill="none" stroke="var(--color-admin-5a6672)" strokeWidth="2.1" strokeDasharray="6 4.3" />
    </svg>
  )
}

/** 3번 서버 왼쪽 상자 — 8×38 (var(--color-admin-171d23), 왼 1·위 5, 피그마 7.809×38.24). 안쪽은 위에서부터 (사용자 10-22, 소수점은 정수로):
 *  둥근 포트 2×3 (위 7 — 상자에서 2), 원형 포트 2×3 두 개 (간격 3), 원형 포트 오른쪽 위 대각선에 초록 불 1×1,
 *  사각 포트 4×6, 그 밑 파란 막대 6×1 (간격 2, 피그마 2.2). 가로는 모두 상자 가운데 */
export function ServerSide() {
  return (
    <>
      <div className="absolute top-[5px] left-px h-[38px] w-[8px] bg-[var(--color-admin-171d23)]" />
      {/* 맨 위 포트 — 채움 var(--color-admin-0e1319), 선 var(--color-admin-4da3ff) 0.347, border-radius 50% (사용자 10-22) */}
      <span className="absolute top-[7px] left-[4px] h-[3px] w-[2px] rounded-[50%] bg-[var(--color-admin-0e1319)] shadow-[inset_0_0_0_0.35px_var(--color-admin-4da3ff)]" />
      {[13, 19].map((y) => (
        <Fragment key={y}>
          {/* 원형 포트 — 채움 var(--color-admin-0e1319), 선 var(--color-admin-5a6672) 0.308, border-radius 50% (사용자 10-22) */}
          <span className="absolute left-[4px] h-[3px] w-[2px] rounded-[50%] bg-[var(--color-admin-0e1319)] shadow-[inset_0_0_0_0.3px_var(--color-admin-5a6672)]" style={{ top: y }} />
          {/* 초록 불 — 원형 포트 오른쪽 위 대각선 */}
          <svg viewBox="0 0 10 10" className="absolute left-[6px] size-px" style={{ top: y - 1 }} aria-hidden>
            <ellipse cx="5" cy="5" rx="3.6" ry="5" fill="var(--color-admin-2ecc5e)" />
          </svg>
        </Fragment>
      ))}
      {/* 원형 포트 아래 사각 포트 — 채움 var(--color-admin-0e1319), 선 var(--color-admin-4da3ff) 0.308 */}
      <svg viewBox="0 0 40 60" className="absolute top-[25px] left-[3px] h-[6px] w-[4px]" aria-hidden>
        <rect x="1.5" y="1.5" width="37" height="57" rx="3" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-4da3ff)" strokeWidth="3" />
      </svg>
      <div className="absolute top-[33px] left-[2px] h-px w-[6px] bg-[var(--color-admin-4da3ff)]" />
    </>
  )
}

/** 3번 서버 가운데 박스 — 136×38 (var(--color-admin-20262e), 선 0.308 var(--color-admin-3f5568), 둥글기 1 — 피그마 화면 기준), 왼 9·위 5 (피그마 135.258×38.24, 왼쪽 상자와 0.6).
 *  안쪽 칸 4개가 빈틈없이 34 씩 들어가게 폭 136, 왼쪽 상자에 붙임 (사용자 10-22) */
export function ServerBay({ children }: { children?: ReactNode }) {
  return (
    <div className="absolute top-[5px] left-[9px] h-[38px] w-[136px] overflow-clip rounded-[1px] bg-[var(--color-admin-20262e)]">
      {children}
      {/* 박스 테두리도 맨 위에 — 아래 칸들이 테두리 안에 들어가 보이게 (사용자 10-22) */}
      <span className="pointer-events-none absolute inset-0 rounded-[1px] shadow-[inset_0_0_0_0.3px_var(--color-admin-3f5568)]" />
    </div>
  )
}

/** 디스크 칸 하나 — 34×12 (var(--color-admin-14181d), 선 0.231 var(--color-admin-3a444e), 피그마 0.0×12.167, 옆 칸과 빈틈 없이). 안쪽 왼쪽 7×12 (var(--color-admin-1a2028)),
 *  그 위 파란 막대 7×1 (var(--color-admin-4da3ff)), 막대 밑 가운데 파란 점 1×1 (border-radius 50%),
 *  용량 판 9×3 (var(--color-admin-f2d230), 칸 안 왼 12·위 8), 글씨 Roboto 1.5px 500 var(--color-admin-1a2430) 가운데 (사용자 10-22) */
function Disk({ x, label, warn }: { x: number; label: string; warn?: boolean }) {
  return (
    <div className="absolute top-[26px] h-[12px] w-[34px] bg-[var(--color-admin-14181d)]" style={{ left: x }}>
      <div className="absolute top-0 left-0 h-[12px] w-[7px] bg-[var(--color-admin-1a2028)]" />
      <div className="absolute top-0 left-0 h-px w-[7px] bg-[var(--color-admin-4da3ff)]" />
      <span className="absolute top-px left-[3px] size-px rounded-[50%] bg-[var(--color-admin-4da3ff)]" />
      <svg viewBox="0 0 90 30" className="absolute top-[8px] left-[12px] h-[3px] w-[9px]" aria-label={label} role="img">
        <rect width="90" height="30" fill={warn ? 'var(--color-admin-5b4c09)' : 'var(--color-admin-f2d230)'} />
        <text x="45" y="20.3" textAnchor="middle" fill={warn ? 'var(--color-accent-yellow)' : 'var(--color-admin-1a2430)'} fontFamily="Roboto, sans-serif" fontSize="15" fontWeight="500">
          {label}
        </text>
      </svg>
      {/* 칸 테두리는 맨 위에 — 안쪽 내용(왼쪽 칸·파란 막대)이 테두리 안에 들어가 보이게 (사용자 10-22) */}
      <span className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_0.23px_var(--color-admin-3a444e)]" />
    </div>
  )
}

/** 디스크 한 칸 상태 — 'on' 보통(노란 판), 'warn' 어두운 판에 노란 글씨(var(--color-accent-yellow), 판 색은 피그마 화면에서 뽑음), null 빈 칸(어두운 바탕 + 테두리) (사용자 10-22, 7번 피그마) */
export type DiskState = 'on' | 'warn' | null

/** 아래 디스크 4칸 — 가운데 박스 바닥에 붙여(위 26) 34 씩 빈틈 없이 (4×34 = 136, 박스 폭) — 피그마처럼 칸 사이는 선만 (사용자 10-22) */
export function Disks({ disks, label = '480G' }: { disks: DiskState[]; label?: string }) {
  return (
    <>
      {[0, 34, 68, 102].map((x, i) => (
        <Fragment key={x}>
          {/* 디스크 바로 위 빈 칸 — 34×12, 선만 0.231 var(--color-admin-3a444e) (사용자 10-22) */}
          <div className="absolute top-[14px] h-[12px] w-[34px] shadow-[inset_0_0_0_0.23px_var(--color-admin-3a444e)]" style={{ left: x }} />
          {disks[i] ? (
            <Disk x={x} label={label} warn={disks[i] === 'warn'} />
          ) : (
            // 빈 칸 — 어두운 바탕 var(--color-admin-0f1319) (피그마 화면에서 뽑음) + 테두리
            <div className="absolute top-[26px] h-[12px] w-[34px] bg-[var(--color-admin-0f1319)] shadow-[inset_0_0_0_0.23px_var(--color-admin-3a444e)]" style={{ left: x }} />
          )}
        </Fragment>
      ))}
    </>
  )
}

/** 가운데 박스 위쪽 — 서버 이름 판 22×5 (var(--color-admin-f2d230), 피그마 21.866×5.215), 글씨 Inter 2px(피그마 1.927) 700 var(--color-admin-1a2430) 판 정중앙,
 *  오른쪽 사각형 19×3 (var(--color-admin-171d23), 선 0.231 var(--color-admin-3a444e), 둥글기 1, 피그마 18.742×3.476). 큰 박스 가장자리에서 4씩 (피그마 4.3),
 *  둘은 세로 가운데가 같게 (판 위 4, 사각형 위 5) (사용자 10-22).
 *  글씨는 central 만으로 0.6 위로 떠서 y 25 → 31.2 (판 높이 50 기준, 재서 맞춤) */
export function BayTop({ name }: { name: string }) {
  return (
    <>
      <svg viewBox="0 0 220 50" className="absolute top-[4px] left-[4px] h-[5px] w-[22px]" role="img" aria-label={name}>
        <rect width="220" height="50" fill="var(--color-admin-f2d230)" />
        <text x="110" y="31.2" textAnchor="middle" dominantBaseline="central" fill="var(--color-admin-1a2430)" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="700">
          {name}
        </text>
      </svg>
      <div className="absolute top-[5px] right-[4px] h-[3px] w-[19px] rounded-[1px] bg-[var(--color-admin-171d23)] shadow-[inset_0_0_0_0.23px_var(--color-admin-3a444e)]" />
    </>
  )
}

/** 3번 서버 맨 오른쪽 상자 — 8×38 (var(--color-admin-171d23), 왼 145·위 5, 피그마 8.434×38.24). 안쪽 (위치는 피그마 비율을 정수로, 사용자 10-22):
 *  파란 테두리 사각형 3×5 (var(--color-admin-0e1319), 선 0.308 var(--color-admin-4da3ff), 둥글기 1, 피그마 3.124×5.215) 상자 안 왼 2·위 6,
 *  속이 찬 파란 막대 6×1 (var(--color-admin-4da3ff), 피그마 6.247×1.043) 왼 1·위 13,
 *  타원 6×10 (선 0.308 var(--color-admin-5a6672), border-radius 50%) 왼 1·위 20 */
export function ServerRightSide() {
  return (
    <div className="absolute top-[5px] left-[145px] h-[38px] w-[8px] bg-[var(--color-admin-171d23)]">
      <span className="absolute top-[6px] left-[2px] h-[5px] w-[3px] rounded-[1px] bg-[var(--color-admin-0e1319)] shadow-[inset_0_0_0_0.3px_var(--color-admin-4da3ff)]" />
      <span className="absolute top-[13px] left-px h-px w-[6px] bg-[var(--color-admin-4da3ff)]" />
      <span className="absolute top-[20px] left-px h-[10px] w-[6px] rounded-[50%] shadow-[inset_0_0_0_0.3px_var(--color-admin-5a6672)]" />
    </div>
  )
}

/** 9번 서버 — 박스 154×25 (피그마 24.55) 안에 왼쪽 상자 8×16 · 가운데 박스 136×16 · 오른쪽 상자 8×16 (모두 위 4, 피그마 16.241).
 *  가로 자리는 3번 서버와 같다 (왼 1 · 9 · 145). 소수점은 비율 맞는 정수로 (사용자 10-22).
 *  둥글기: 가운데 박스 1, 이름 판·용량 판 0.5 (판 높이 3 에 맞춰) */
export function SmallServer({ name, disks }: { name: string; disks: (string | null)[] }) {
  return (
    <>
      <div className="absolute top-[4px] left-px h-[16px] w-[8px] bg-[var(--color-admin-171d23)]" />
      <div className="absolute top-[4px] left-[9px] h-[16px] w-[136px] overflow-clip rounded-[1px] bg-[var(--color-admin-20262e)]">
        {/* 서버 이름 판 19×3 (var(--color-admin-f2d230)), 박스 위에 붙여 왼 6 (피그마 6), 글씨 Roboto 1.5px 500 var(--color-admin-1a2430) 가운데 */}
        <svg viewBox="0 0 190 30" className="absolute top-0 left-[6px] h-[3px] w-[19px]" role="img" aria-label={name}>
          <rect width="190" height="30" rx="5" fill="var(--color-admin-f2d230)" />
          <text x="95" y="15" textAnchor="middle" dominantBaseline="central" fill="var(--color-admin-1a2430)" fontFamily="Roboto, sans-serif" fontSize="15" fontWeight="500">
            {name}
          </text>
        </svg>
        {/* 아래 디스크 4칸 — 34×12 빈틈 없이, 박스 바닥에 붙임 (피그마 0.0×12.464) */}
        {[0, 34, 68, 102].map((x, i) =>
          disks[i] ? (
            <div key={x} className="absolute top-[4px] h-[12px] w-[34px] bg-[var(--color-admin-0e1319)]" style={{ left: x }}>
              <div className="absolute top-0 left-0 h-[12px] w-[7px] bg-[var(--color-admin-1a2028)]" />
              {/* 초록 막대 7×1 (var(--color-admin-5cc46a), 피그마 6.872×1.133) */}
              <div className="absolute top-0 left-0 h-px w-[7px] bg-[var(--color-admin-5cc46a)]" />
              <svg viewBox="0 0 90 30" className="absolute top-[8px] left-[12px] h-[3px] w-[9px]" role="img" aria-label={disks[i]!}>
                <rect width="90" height="30" rx="5" fill="var(--color-admin-f2d230)" />
                <text x="45" y="20.3" textAnchor="middle" fill="var(--color-admin-1a2430)" fontFamily="Roboto, sans-serif" fontSize="15" fontWeight="500">
                  {disks[i]}
                </text>
              </svg>
              <span className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_0.22px_var(--color-admin-3a444e)]" />
            </div>
          ) : (
            // 빈 칸 — 점선 테두리 (var(--color-admin-0e1319), 선 0.216 var(--color-admin-3a444e), 점선 0.73/0.51 비율대로)
            <svg key={x} viewBox="0 0 340 120" className="absolute top-[4px] h-[12px] w-[34px]" style={{ left: x }} aria-hidden>
              <rect x="1.1" y="1.1" width="337.8" height="117.8" fill="var(--color-admin-0e1319)" stroke="var(--color-admin-3a444e)" strokeWidth="2.2" strokeDasharray="7.3 5.1" />
            </svg>
          ),
        )}
        <span className="pointer-events-none absolute inset-0 rounded-[1px] shadow-[inset_0_0_0_0.29px_var(--color-admin-3f5568)]" />
      </div>
      {/* 오른쪽 상자 8×16 (var(--color-admin-171d23), 피그마 8.434) — 큰 원 3×3 (var(--color-admin-0e1319), 선 0.323 var(--color-admin-2ecc5e)) 위 1 · 가로 가운데,
          작은 초록 원 1×1 두 개 (간격 1) 왼 1 · 위 12 (사용자 10-22) */}
      <div className="absolute top-[4px] left-[145px] h-[16px] w-[8px] bg-[var(--color-admin-171d23)]">
        <span className="absolute top-px left-1/2 size-[3px] -translate-x-1/2 rounded-full bg-[var(--color-admin-0e1319)] shadow-[inset_0_0_0_0.32px_var(--color-admin-2ecc5e)]" />
        <span className="absolute top-[12px] left-px size-px rounded-full bg-[var(--color-admin-2ecc5e)]" />
        <span className="absolute top-[12px] left-[3px] size-px rounded-full bg-[var(--color-admin-2ecc5e)]" />
      </div>
    </>
  )
}

/** 13번 부엉이 서버 — 9번과 같은 구조, 박스 154×26 (피그마). 왼쪽 상자 8×18 · 가운데 박스 137×18 · 오른쪽 상자 8×18 (위 4, 피그마 4.4 · 17.6).
 *  디스크 칸 29×14 (피그마 29.363×14.4) 를 간격 1 로 네 칸 (위 2), 칸 안 왼쪽 상자 7×14 (칸 높이만큼) · 파란 막대 7×1 (var(--color-admin-3a9fe6)).
 *  1번 칸엔 4TB 판 위에 부엉이서버 이름 판 17×3 (사용자 10-22) */
const DashedBay = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
  <svg viewBox={`0 0 ${w * 10} ${h * 10}`} className="absolute" style={{ left: x, top: y, width: w, height: h }} aria-hidden>
    <rect x="1.1" y="1.1" width={w * 10 - 2.2} height={h * 10 - 2.2} fill="var(--color-admin-0e1319)" stroke="var(--color-admin-3a444e)" strokeWidth="2.2" strokeDasharray="7.3 5.1" />
  </svg>
)
const Plate = ({ x, y, w, label }: { x: number; y: number; w: number; label: string }) => (
  <svg viewBox={`0 0 ${w * 10} 30`} className="absolute h-[3px]" style={{ left: x, top: y, width: w }} role="img" aria-label={label}>
    <rect width={w * 10} height="30" rx="5" fill="var(--color-admin-f2d230)" />
    <text x={w * 5} y="15" textAnchor="middle" dominantBaseline="central" fill="var(--color-admin-1a2430)" fontFamily="Roboto, sans-serif" fontSize="15" fontWeight="500">
      {label}
    </text>
  </svg>
)
export function OwlServer() {
  return (
    <>
      <div className="absolute top-[4px] left-px h-[18px] w-[8px] bg-[var(--color-admin-171d23)]" />
      <div className="absolute top-[4px] left-[9px] h-[18px] w-[137px] overflow-clip rounded-[1px] bg-[var(--color-admin-20262e)]">
        {[0, 30].map((x, i) => (
          <div key={x} className="absolute top-[2px] h-[14px] w-[29px] bg-[var(--color-admin-0e1319)]" style={{ left: x }}>
            <div className="absolute top-0 left-0 h-[14px] w-[7px] bg-[var(--color-admin-1a2028)]" />
            <div className="absolute top-0 left-0 h-px w-[7px] bg-[var(--color-admin-3a9fe6)]" />
            {/* 1번 칸: 4TB 위 6 · 부엉이서버 위 10 / 2번 칸: 4TB 위 10 (피그마) */}
            <Plate x={11} y={i === 0 ? 6 : 10} w={9} label="4TB" />
            {i === 0 && <Plate x={8} y={10} w={17} label="부엉이서버" />}
            <span className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_0.22px_var(--color-admin-3a444e)]" />
          </div>
        ))}
        <DashedBay x={60} y={2} w={29} h={14} />
        <DashedBay x={90} y={2} w={29} h={14} />
        {/* 맨 오른쪽 상자 — 17×14 (피그마 17.493×14.4), var(--color-admin-171d23), 테두리 0.18 var(--color-admin-3a444e). 안 왼쪽 위 1·1 에 초록 원 2×2 (피그마 위치, 사용자 10-22) */}
        <div className="absolute top-[2px] left-[120px] h-[14px] w-[17px] bg-[var(--color-admin-171d23)] shadow-[inset_0_0_0_0.18px_var(--color-admin-3a444e)]">
          <span className="absolute top-px left-px size-[2px] rounded-full bg-[var(--color-admin-0e1319)] shadow-[inset_0_0_0_0.29px_var(--color-admin-2ecc5e)]" />
        </div>
        <span className="pointer-events-none absolute inset-0 rounded-[1px] shadow-[inset_0_0_0_0.29px_var(--color-admin-3f5568)]" />
      </div>
      {/* 오른쪽 상자 — 파란 원 3×3 (테두리 0.43 var(--color-admin-3a9fe6)) 을 상자 정가운데 (사용자 10-22) */}
      <div className="absolute top-[4px] left-[146px] h-[18px] w-[8px] bg-[var(--color-admin-171d23)]">
        <span className="absolute top-1/2 left-1/2 size-[3px] -translate-1/2 rounded-full shadow-[inset_0_0_0_0.43px_var(--color-admin-3a9fe6)]" />
      </div>
    </>
  )
}
