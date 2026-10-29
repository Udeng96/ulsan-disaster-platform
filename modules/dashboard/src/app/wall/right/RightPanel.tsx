// 우측 패널 (480×1080) — 헤더 띠 + 배수펌프장 가동 요약 + 아래 3칸(육갑문·급경사지·지진가속도).
import { memo, useMemo } from 'react'
import { fetchPumpStations, type PumpStation } from '@/api/pumpStation'
import { usePolling } from '@/shared/hooks'
import { PanelHeader, StatusPill, type PillStatus } from '@/shared/ui'
import { AREAS } from '@/features/menus/steep-slope/data'

// 가동 대수에 세는 장비 — 원동기·전동기·일반 펌프 (부속 펌프·밸브·수문 등은 제외)
const MOTOR = new Set(['MOTOR_ORIG', 'MOTOR_ELEC', 'PUMP_GENERIC'])

const LINE_BREAK: Record<string, string> = { 가상시설0274: '도산\n사거리', '가상시설0718': '태화강\n역앞', 가상시설0479: '가상시설04723\n배수문' }

function summarize(stations: readonly PumpStation[]) {
  const items = [...stations]
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    .map((s) => {
      const motors = s.equipments.filter((e) => MOTOR.has(e.category))
      // TODO(확인 필요): 옛 코드는 state === 'ON' 과 비교해(실제 state 는 숫자) 늘 0 대였다. 가동 값이 정해지면 센다.
      return { id: s.id, name: LINE_BREAK[s.name] ?? s.name, on: 0, total: motors.length }
    })
  return { items, running: items.filter((i) => i.on > 0).length }
}

const accent = (on: number) => (on > 0 ? 'text-accent-green' : 'text-accent-blue')
const dark = 'rounded-b-2xl border-x border-b border-line-dark bg-panel-body'
const inner = 'rounded-[14px] bg-panel-inner'

function ColumnHeader({ title, big = false }: { title: string; big?: boolean }) {
  return (
    // 큰 헤더는 shrink 허용 — 옛 화면에서 아래 칸이 944 를 넘쳐 헤더가 50 으로 눌려 보인다 (그 모습 그대로)
    <PanelHeader className={`h-14 self-stretch rounded-t-2xl pt-[9px] pb-[4.5px] ${big ? '' : 'shrink-0'}`}>
      <span className={`text-center font-display text-neutral-50 [-webkit-text-stroke:1px_var(--color-neutral-500)] ${big ? 'text-h3 leading-8' : 'text-h4 leading-6'}`}>{title}</span>
    </PanelHeader>
  )
}

const Pumps = memo(function Pumps() {
  const { data } = usePolling(() => fetchPumpStations())
  const { items, running } = useMemo(() => summarize(data ?? []), [data])
  return (
    <>
      <ColumnHeader title="배수펌프장" big />
      <div className={`flex h-[636px] flex-col items-center gap-2 self-stretch px-4 pt-3 pb-4 ${dark}`}>
        <div className={`flex h-20 w-[432px] shrink-0 items-center justify-center gap-3.5 self-stretch font-sans text-[30px] leading-8 font-semibold text-center ${inner}`}>
          <span className="text-neutral-100">총</span>
          <span>
            <span className={accent(running)}>{running}</span>
            <span className="text-neutral-100"> / {items.length} 개소</span>
          </span>
          <span className={accent(running)}>가동</span>
        </div>
        <div className="grid shrink-0 grid-cols-[212px_212px] gap-2">
          {items.map((p) => (
            <div key={p.id} className={`flex h-20 w-[212px] items-center justify-center gap-2.5 font-sans text-[22px] leading-6 font-semibold ${inner}`}>
              <span className="text-center whitespace-pre-line text-neutral-100">{p.name}</span>
              <span>
                <span className={accent(p.on)}>{p.on}</span>
                <span className="text-neutral-100"> / {p.total}대 </span>
                <span className={accent(p.on)}>가동</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
})

// 아래 3칸 — 아직 연동 전이라 모두 평상시(0) 값
type Row = { label: string; status: string; kind: PillStatus }
const GATES: Row[] = ['가상시설0286', '가상시설0733', '가상시설0738'].map((label) => ({ label, status: '0', kind: 'normal' }))
const SLOPES: Row[] = AREAS.map((a) => ({ label: a === '가상시설0432' ? '가상시설0429' : a, status: '0', kind: 'normal' }))
const INSTRUMENTS = [
  { code: '가상시설0206', description: '가상시설0683(3축)', level: '0' },
  { code: '가상시설0204', description: '가상시설0714(Y,X)', level: '0' },
  { code: '가상시설0205', description: '가상시설0714(Y)', level: '0' },
  { code: '가상시설0203', description: '가상시설0715(3축)', level: '0' },
]
// 진도 라벨 → 바탕·글씨 (I~V 는 밝은 바탕이라 어두운 글씨). 모르는 값('0' 등)은 I 로.
const LEVELS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']
const LEVEL_BG = ['bg-intensity-1', 'bg-intensity-2', 'bg-intensity-3', 'bg-intensity-4', 'bg-intensity-5', 'bg-intensity-6', 'bg-intensity-7', 'bg-intensity-8', 'bg-intensity-9']
function level(label: string) {
  const i = Math.max(0, LEVELS.indexOf(label))
  return { label: LEVELS[i], bg: LEVEL_BG[i], text: i >= 5 ? 'text-white' : 'text-neutral-900' }
}

const b4 = 'text-center text-b4 leading-4 whitespace-pre-line text-white'

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex w-[148px] flex-col items-start rounded-[20px] shadow-card">
      <ColumnHeader title={title} />
      <div className={`flex flex-col items-center gap-2 self-stretch px-4 pt-3 pb-4 ${dark}`}>
        <div className="flex h-[168px] w-[116px] flex-col items-start gap-1 self-stretch">{children}</div>
      </div>
    </div>
  )
}

function StatusTable({ rows }: { rows: Row[] }) {
  return (
    <>
      <div className="flex h-7 w-[116px] items-center justify-between self-stretch">
        <div className="flex w-[62px] items-center justify-center">
          <span className={b4}>구분</span>
        </div>
        <div className="flex w-[50px] items-center justify-center">
          <span className={b4}>상태</span>
        </div>
      </div>
      <div className="flex h-[136px] flex-col items-center gap-2 self-stretch">
        {rows.map((r) => (
          <div key={r.label} className="flex h-10 items-center justify-between self-stretch">
            <div className="flex h-10 w-[62px] flex-col items-center justify-center self-stretch">
              <span className={b4}>{r.label}</span>
            </div>
            <div className="flex h-8 w-[50px] items-center justify-center">
              <StatusPill status={r.kind}>{r.status}</StatusPill>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

const Bottom = memo(function Bottom() {
  return (
    <div className="mt-2 flex items-center gap-2.5 self-stretch">
      <Column title="육갑문">
        <StatusTable rows={GATES} />
      </Column>
      <Column title="급경사지">
        <StatusTable rows={SLOPES} />
      </Column>
      <Column title="지진가속도">
        {/* 표와 달리 4칸을 gap 8 로 (부모 gap 4 대신) */}
        <div className="flex h-[168px] w-[116px] flex-col items-center gap-2 self-stretch">
          {INSTRUMENTS.map((inst) => {
            const lv = level(inst.level)
            return (
              <div key={inst.code} className="flex h-9 items-center justify-between gap-1 self-stretch">
                <div className="flex flex-[1_1_auto] flex-col items-start justify-center gap-0.5">
                  <span className="font-sans text-[13px] leading-[14px] font-semibold text-white text-stroke">{inst.code}</span>
                  <span className="font-sans text-[11px] leading-3 font-medium text-neutral-100-dim">{inst.description}</span>
                </div>
                <div className={`flex h-8 w-[50px] items-center justify-center rounded-[99px] border border-line-pill ${lv.bg}`}>
                  <span className={`font-sans text-[13px] leading-[14px] font-semibold ${lv.text}`}>{lv.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </Column>
    </div>
  )
})

export function RightPanel() {
  return (
    <div className="relative h-[1080px] w-[480px] bg-neutral-900">
      <div className="relative flex h-[120px] w-[480px] items-center py-2 pr-4">
        <div className="absolute top-2 right-4 h-[104px] w-[504px] rounded-r-2xl bg-panel-header shadow-panel-header" />
      </div>
      <div className="flex h-[944px] w-[464px] flex-col items-center rounded-[20px] shadow-card">
        <Pumps />
        <Bottom />
      </div>
    </div>
  )
}
