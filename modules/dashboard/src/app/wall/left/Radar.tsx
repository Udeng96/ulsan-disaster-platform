// 위성 지도(레이더) — 기상청 레이더 최근 12장(5분 간격)을 0.5초마다 넘겨 보여준다. 1분마다 최신 시각 확인.
//   재생 상태는 RadarProvider 하나에 두고 작은 카드와 확대 모달이 같이 본다 (전환해도 같은 장면).
//   프레임이 넘어갈 때 다시 그려지는 건 RadarView 뿐 (좌측 패널 전체가 아님).
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { fetchRadarLatest } from './api'
import { usePolling } from '@/shared/hooks'

const FRAME_COUNT = 12
const FRAME_STEP_MS = 5 * 60_000
const PLAY_MS = 500
const LAST_HOLD_MS = 1500 // 마지막 장면은 길게
const REFRESH_MS = 60_000

interface Frame {
  epoch: number
  url: string
}

const p2 = (n: number) => String(n).padStart(2, '0')
/** epoch → 기상청 파일명 시각 (KST YYYYMMDDHHmm) */
function kstStamp(epoch: number): string {
  const d = new Date(epoch + 9 * 3600_000)
  return `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}`
}
const DAY = ['일', '월', '화', '수', '목', '금', '토']
function badge(epoch: number): string {
  const d = new Date(epoch + 9 * 3600_000)
  return `${DAY[d.getUTCDay()]} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`
}

/** 최신 시각 기준 과거 12장 — 미리 불러보고 실패한 장은 뺀다. */
async function loadFrames(latestKst: string): Promise<Frame[]> {
  const last = new Date(latestKst).getTime()
  const all = Array.from({ length: FRAME_COUNT }, (_, i) => {
    const epoch = last - (FRAME_COUNT - 1 - i) * FRAME_STEP_MS
    return { epoch, url: `/kma-radar/repositary/image/rdr/img/RDR_CMP_WRC_${kstStamp(epoch)}.png` }
  })
  const ok = await Promise.all(
    all.map(
      (f) =>
        new Promise<Frame | null>((done) => {
          const img = new Image()
          img.onload = () => done(f)
          img.onerror = () => done(null)
          img.src = f.url
        }),
    ),
  )
  return ok.filter((f): f is Frame => f !== null)
}

interface Player {
  frames: readonly Frame[]
  idx: number
}
const Ctx = createContext<Player>({ frames: [], idx: 0 })

export function RadarProvider({ children }: { children: ReactNode }) {
  const latest = usePolling((s) => fetchRadarLatest().then((r) => (s.aborted ? null : r.observedAtKst)), { intervalMs: REFRESH_MS })
  const [player, setPlayer] = useState<Player>({ frames: [], idx: 0 })

  // 최신 시각이 바뀌면 프레임을 다시 불러온다. 보던 위치는 유지 (짧아지면 마지막으로).
  const latestKst = latest.data
  useEffect(() => {
    if (!latestKst) return
    let alive = true
    void loadFrames(latestKst).then((frames) => {
      if (alive && frames.length) setPlayer((p) => ({ frames, idx: Math.min(p.idx, frames.length - 1) }))
    })
    return () => {
      alive = false
    }
  }, [latestKst])

  const { frames, idx } = player
  useEffect(() => {
    if (frames.length < 2) return
    const t = setTimeout(() => setPlayer((p) => ({ ...p, idx: (p.idx + 1) % p.frames.length })), idx === frames.length - 1 ? LAST_HOLD_MS : PLAY_MS)
    return () => clearTimeout(t)
  }, [frames, idx])

  return <Ctx.Provider value={player}>{children}</Ctx.Provider>
}

// 폭을 꽉 채우고 가운데 기준으로 위아래를 자른다 (원본이 거의 정사각).
const img = 'absolute top-1/2 left-1/2 h-auto w-full max-w-none -translate-x-1/2 -translate-y-1/2'

export function RadarView({ updateToast = false }: { updateToast?: boolean }) {
  const { frames, idx } = useContext(Ctx)
  const latest = frames.length ? frames[frames.length - 1].epoch : null
  const prev = useRef<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  // 모달에서만 — 최신 장면이 바뀌면 3초 알림 (처음 열 때는 안 띄움)
  useEffect(() => {
    if (latest === null) return
    const before = prev.current
    prev.current = latest
    if (!updateToast || before === null || before === latest) return
    setToast(`레이더 업데이트 · ${badge(latest)}`)
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [latest, updateToast])

  return (
    <div className="relative size-full overflow-hidden bg-neutral-800">
      {frames.length === 0 && <img src="/images/radar-default.png" alt="" className={img} />}
      {/* 장면을 모두 겹쳐 두고 보이는 것만 바꾼다 — 첫 바퀴 디코딩 깜빡임 방지 */}
      {frames.map((f, i) => (
        <img key={f.url} src={f.url} alt="" className={img} style={{ opacity: i === idx ? 1 : 0 }} />
      ))}
      {toast && (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-[18px] bg-black/70 px-4 py-2 text-[14px] leading-5 font-semibold whitespace-nowrap text-toast-ok">
          {toast}
        </div>
      )}
    </div>
  )
}
