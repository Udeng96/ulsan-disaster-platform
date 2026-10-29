// 서버실 랙 — 본문 왼쪽 세로 칸. 바깥 테두리(높이 672) 안에 랙 전체 박스, 그 안에 장비 칸을 위에서부터 쌓는다 (값은 사용자 10-22).
//   너비는 칸(192)에 맞춰 정해진다: 192 + 안쪽 박스 여백 8×2 + 바깥 여백 8×2 = 224.
//   장비 앞면 부품은 왼쪽부터 SECUI · 포트 8개 · 1G · 타공 면 · 이름표 면 (사용자 10-22).
import { memo } from 'react'
import { admin } from './state'
// 1번 방화벽 앞면 부품 — 옛 화면에서 만든 그림 그대로 (스타일은 index.css rack-*)
import { RackPortGrid } from '@/features/menus/admin/RackPortGrid'
import { RackSecui } from '@/features/menus/admin/RackSecui'
import { BayTop, ConsolePort, type DiskState, NamePlate, Port1G, Disks, Ports10G, ServerBay, ServerRightSide, ServerSide, SmallServer, OwlServer, SwitchFace, SwitchPort, SwitchPorts, Vent } from './RackParts'

/** 장비 번호 원 — 22 폭, 위아래 여백 2. 글씨는 옛 화면 번호 원과 같게 (Roboto 14·500·줄 높이 16·primary) */
export function Index({ no }: { no: number }) {
  return (
    <span className="flex w-[22px] shrink-0 items-center justify-center rounded-full border border-primary-dark bg-neutral-700 py-0.5 text-center font-['Roboto',sans-serif] text-[14px] leading-4 font-medium text-primary">
      {no}
    </span>
  )
}

/** 서버 테두리(162, 여백 4, 흰 10%) 안에 서버 박스(154×26, 여백 4, 간격 2, var(--color-admin-0c1117), 넘치면 자름).
 *  테두리는 피그마 164 에서 162 로 — 박스 오른쪽에 남던 2 를 없앤다 (박스는 그대로, 사용자 10-22) — 앞면 부품이 박스 안에 나란히 (사용자 10-22) */
function Device({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-[162px] items-center justify-between overflow-clip rounded-md bg-white/10 p-1">
      <div className="flex h-[26px] w-[154px] shrink-0 items-center gap-0.5 overflow-clip rounded bg-[var(--color-admin-0c1117)] p-1">{children}</div>
    </div>
  )
}

/** 2번 서버 — 테두리(162×34, 여백 위아래 2·좌우 4, 흰 10%) 안에 박스(154×26, var(--color-admin-14181d)). 내용은 디자인 받으면 채움 (사용자 10-22).
 *  테두리는 피그마 164 에서 162 로 — 1번처럼 박스 오른쪽에 남던 2 를 없앤다 */
function Device2({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex h-[34px] w-[162px] items-center justify-between rounded-md bg-white/10 px-1 py-0.5">
      <div className="relative h-[26px] w-[154px] shrink-0 overflow-clip rounded bg-[var(--color-admin-14181d)]">{children}</div>
    </div>
  )
}

/** 3~8번 서버 — 테두리(162, 여백 4, 흰 10%) 안에 상자(154×48, var(--color-admin-0c1117)). 피그마 164 → 162 (오른쪽 남는 2 없앰), 상자 47.8 → 48 (사용자 10-22) */
function Device3({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex w-[162px] items-center justify-between rounded-md bg-white/10 p-1">
      <div className="relative h-[48px] w-[154px] shrink-0 overflow-clip rounded bg-[var(--color-admin-0c1117)]">{children}</div>
    </div>
  )
}

/** 3~8번 서버 — 모양은 같고 이름과 디스크만 다르다 (피그마 3~8번, 사용자 10-22) */
const SERVERS: Record<number, { name: string; disks: DiskState[] }> = {
  3: { name: '데이터베이스', disks: ['on', 'on', 'on', 'on'] },
  4: { name: '(운영) 솔루션', disks: ['on', 'on', null, null] },
  5: { name: '(운영) 대시보드', disks: ['on', 'on', null, null] },
  6: { name: '(운영) IoT', disks: ['on', 'on', null, null] },
  7: { name: '(운영) GIS', disks: ['on', 'on', 'warn', 'warn'] },
  8: { name: '(연계) CCTV', disks: ['on', 'on', null, null] },
}

/** 9~12번 서버 (이름·디스크는 피그마 화면, 사용자 10-22) — 테두리(162, 여백 4) 안에 상자(154×25, var(--color-admin-0c1117), 피그마 24.55) (사용자 10-22) */
function Device9({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex w-[162px] items-center justify-between rounded-md bg-white/10 p-1">
      <div className="relative h-[25px] w-[154px] shrink-0 overflow-clip rounded bg-[var(--color-admin-0c1117)]">{children}</div>
    </div>
  )
}

/** 13번 — 테두리(162, 여백 4) 안에 상자(154×26, var(--color-admin-0c1117)) (피그마 13번) */
function Device2Like({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex w-[162px] items-center justify-between rounded-md bg-white/10 p-1">
      <div className="relative h-[26px] w-[154px] shrink-0 overflow-clip rounded bg-[var(--color-admin-0c1117)]">{children}</div>
    </div>
  )
}

const SMALL_SERVERS: Record<number, { name: string; disks: (string | null)[] }> = {
  9: { name: '내부연계서버', disks: ['2TB', '2TB', null, null] },
  10: { name: 'SecureGate-IN', disks: ['2TB', '2TB', null, null] },
  11: { name: 'SecureGate-OUT', disks: ['2TB', '2TB', null, null] },
  12: { name: '외부연계서버', disks: ['447G', '447G', null, null] },
}

/** 장비 칸 한 줄 — 1·2번 192×34, 3~8번 192×56, 9~12번 192×33: 번호 원 + 장비 앞면 */
/** 랙 칸 — 누르면 장비 선택 (서버 리스트와 같음). 번호는 그대로, 서버 칸에만 테두리 (사용자 10-23 비교 후 오른쪽 안).
 *  기타 탭에서는 고르지 않고 마우스 올림만 (흐름도 강조용). 같은 번호의 서버 리스트 줄과 마우스 올림·선택을 함께 보임 (admin.hover · admin.device, 사용자 10-23).
 *  선택: 테두리 2 var(--color-admin-4da3ff) · 바깥 빛 var(--color-admin-rgba-77-163-255-6) / 마우스 올림: 테두리 1 var(--color-admin-7fb2e8) · 바탕 var(--color-admin-rgba-77-163-255-25) — 색은 예제 캡처에서 뽑음 */
function Slot({ no }: { no: number }) {
  const etc = admin.use((s) => s.tab === 'etc')
  const on = admin.use((s) => s.device === no) && !etc
  const hover = admin.use((s) => s.hover === no)
  const ring = on
    ? '[&>:last-child]:shadow-[0_0_10px_var(--color-admin-rgba-77-163-255-0-6)] [&>:last-child]:outline-2 [&>:last-child]:outline-[var(--color-admin-4da3ff)]'
    : hover
      ? '[&>:last-child]:bg-[var(--color-admin-rgba-77-163-255-0-25)] [&>:last-child]:outline-1 [&>:last-child]:outline-[var(--color-admin-7fb2e8)]'
      : '[&>:last-child]:outline-1 [&>:last-child]:outline-transparent'
  return (
    <button
      type="button"
      aria-label={`${no}번 장비`}
      aria-pressed={on}
      onClick={() => !etc && admin.set((a) => ({ device: a.device === no ? null : no }))}
      onMouseEnter={() => admin.set({ hover: no })}
      onMouseLeave={() => admin.set({ hover: null })}
      className={`flex w-[192px] cursor-pointer items-center gap-1.5 [&>:last-child]:rounded-md [&>:last-child]:outline [&>:last-child]:outline-offset-1 ${ring} ${SERVERS[no] ? 'h-[56px]' : SMALL_SERVERS[no] ? 'h-[33px]' : 'h-[34px]'}`}
    >
      <Index no={no} />
      {no === 1 && (
        <Device>
          <RackSecui />
          <RackPortGrid />
          <Port1G />
          <Vent />
          <NamePlate label="재난통합플랫폼 FW" />
        </Device>
      )}
      {no === 13 && (
        <Device2Like>
          <OwlServer />
        </Device2Like>
      )}
      {SMALL_SERVERS[no] && (
        <Device9>
          <SmallServer {...SMALL_SERVERS[no]} />
        </Device9>
      )}
      {SERVERS[no] && (
        <Device3>
          <ServerSide />
          <ServerBay>
            <BayTop name={SERVERS[no].name} />
            <Disks disks={SERVERS[no].disks} />
          </ServerBay>
          <ServerRightSide />
        </Device3>
      )}
      {no === 2 && (
        <Device2>
          <SwitchFace label="재난통합플랫폼 SW" />
          <SwitchPorts />
          <Ports10G />
          {/* MGMT 포트 — 10G 묶음 끝(136)에서 1 띄워 137, 윗줄 (피그마 135.55 · 4.29) (사용자 10-22) */}
          <SwitchPort x={137} y={4} />
          {/* "MGMT" — Inter 1px(피그마 1.017) 400 흰색, 포트 위 숫자 줄과 같은 위 2, MGMT 포트(137~142) 가운데 */}
          <svg viewBox="0 0 50 10" className="absolute top-[2px] left-[137px] h-px w-[5px] overflow-visible" aria-hidden>
            <text x="25" y="8.6" textAnchor="middle" fill="var(--color-intensity-1)" fontFamily="Inter, sans-serif" fontSize="10">
              MGMT
            </text>
          </svg>
          {/* CONSOLE 포트 — 점선, MGMT 아래 줄 */}
          <ConsolePort x={137} y={15} />
          {/* "CONSOLE" — MGMT 글씨와 같은 모양, 콘솔 포트 바로 위 13 (피그마 13), 포트 가운데 */}
          <svg viewBox="0 0 50 10" className="absolute top-[13px] left-[137px] h-px w-[5px] overflow-visible" aria-hidden>
            <text x="25" y="8.6" textAnchor="middle" fill="var(--color-intensity-1)" fontFamily="Inter, sans-serif" fontSize="10">
              CONSOLE
            </text>
          </svg>
          {/* 콘솔 오른쪽 "*" — Inter 2px(피그마 1.571) 400 var(--color-admin-8fa5bb), 콘솔 끝(142)에 붙여 143, 콘솔 세로 가운데보다 조금 위 (피그마) */}
          {/* 모델 이름 — 아랫줄 오른쪽 끝, 박스 끝에서 2 (오른쪽 152)에 오른쪽 정렬 — 포트를 당긴 뒤 \* 쪽으로 1 붙임 (사용자 10-22).
              SubGate: Arial 1.25px 700 흰색 — 아래 SG2428GX 와 너비가 같게 (피그마도 같음, 사용자 10-22), 위 17~18 / SG2428GX: Arial 1px(피그마 1.109) 400 var(--color-admin-8fa5bb), 위 19 */}
          <svg viewBox="0 0 120 40" className="absolute top-[16px] left-[140px] h-[4px] w-[12px] overflow-visible" aria-hidden>
            <text x="120" y="19.5" textAnchor="end" fill="var(--color-intensity-1)" fontFamily="Arial, sans-serif" fontSize="12.5" fontWeight="700">
              SubGate
            </text>
            <text x="120" y="38.6" textAnchor="end" fill="var(--color-admin-8fa5bb)" fontFamily="Arial, sans-serif" fontSize="10">
              SG2428GX
            </text>
          </svg>
          <svg viewBox="0 0 20 20" className="absolute top-[17px] left-[143px] size-[2px] overflow-visible" aria-hidden>
            <text x="0" y="26" fill="var(--color-admin-8fa5bb)" fontFamily="Inter, sans-serif" fontSize="20">
              *
            </text>
          </svg>
        </Device2>
      )}
    </button>
  )
}

export const AdminRack = memo(function AdminRack() {
  return (
    // 바깥 테두리
    <section aria-label="서버실 랙" className="inline-flex h-[672px] shrink-0 flex-col items-start gap-2 rounded-2xl bg-neutral-600 p-2">
      {/* 랙 전체 박스 */}
      <div className="flex flex-[1_0_0] flex-col items-start gap-1.5 self-stretch rounded-xl bg-[hsl(212.7273deg_31.4286%_6.8627%)] p-2">
        <Slot no={1} />
        <Slot no={2} />
        {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((no) => (
          <Slot key={no} no={no} />
        ))}
      </div>
    </section>
  )
})
