// KMA 레이더 애니메이션 — /weather/api/radar/latest 로 최신 관측시각 조회 후,
// KMA 가 5분 간격으로 호스팅하는 과거 프레임 URL 을 역산해 루프 재생 (네이버 레이더 영상 스타일).
//   - 프레임: 최근 12장 (1시간), 5분 간격. 로드 실패 프레임은 skip.
//   - 1분 주기로 최신 관측시각 재조회 → 프레임 윈도우 갱신.
//
// 상태 공유: useRadarPlayer() 를 부모 (LeftPanel) 가 한 번 호출하고,
// 작은 카드 + 확장 모달 양쪽 <RadarLatest player={...}> 에 전달 —
// 두 화면이 항상 같은 프레임/재생 상태를 표시 (전환 시 어긋남 없음).
// 응답 전/실패 시 정적 폴백 이미지(/images/radar-default.png) 표시.

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { fetchRadarLatest } from '@/api/weather'
import { COLORS } from '@/styles/designTokens'

const FRAME_COUNT = 12 // 1시간 (5분 × 12)
const FRAME_STEP_MS = 5 * 60 * 1000
const PLAY_MS = 500 // 프레임 간격
const LAST_HOLD_MS = 1500 // 마지막 프레임 길게 유지 (네이버 동작)
const REFRESH_MS = 60 * 1000


interface RadarFrame {
  /** epoch ms (KST 관측시각) */
  epoch: number
  url: string
}

// epoch → KMA 파일명 시각 부분 (KST YYYYMMDDHHmm). TZ 무관하게 UTC+9 로 계산.
function kstStamp(epoch: number): string {
  const d = new Date(epoch + 9 * 60 * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}`
}

// epoch → 배지 표시 "요일 HH:MM" (예: "월 12:25")
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']
function badgeLabel(epoch: number): string {
  const d = new Date(epoch + 9 * 60 * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${DAY_KO[d.getUTCDay()]} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
}

/** 최신 관측시각 기준 과거 프레임 목록 생성 + 이미지 preload (실패 프레임 제외). */
async function loadFrames(latestKst: string): Promise<RadarFrame[]> {
  const latestEpoch = new Date(latestKst).getTime()
  const candidates: RadarFrame[] = Array.from(
    { length: FRAME_COUNT },
    (_, i) => {
      const epoch = latestEpoch - (FRAME_COUNT - 1 - i) * FRAME_STEP_MS
      return {
        epoch,
        url: `/kma-radar/repositary/image/rdr/img/RDR_CMP_WRC_${kstStamp(epoch)}.png`,
      }
    },
  )
  const results = await Promise.all(
    candidates.map(
      (f) =>
        new Promise<RadarFrame | null>((resolve) => {
          const img = new Image()
          img.onload = () => resolve(f)
          img.onerror = () => resolve(null)
          img.src = f.url
        }),
    ),
  )
  return results.filter((f): f is RadarFrame => f !== null)
}

export interface RadarPlayer {
  frames: readonly RadarFrame[]
  frameIdx: number
}

/** 레이더 프레임 fetch + 재생 상태 허브 — LeftPanel 이 한 번 호출, 카드/모달 공유. */
export function useRadarPlayer(): RadarPlayer {
  const [frames, setFrames] = useState<readonly RadarFrame[]>([])
  const [frameIdx, setFrameIdx] = useState(0)
  // 최신 프레임 epoch — 재조회 시 동일하면 갱신 skip (깜빡임 방지).
  const latestEpochRef = useRef<number | null>(null)

  // 최신 관측시각 조회 + 프레임 preload (1분 주기).
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const latest = await fetchRadarLatest()
        const epoch = new Date(latest.observedAtKst).getTime()
        if (cancelled || latestEpochRef.current === epoch) return
        const loaded = await loadFrames(latest.observedAtKst)
        if (cancelled || loaded.length === 0) return
        latestEpochRef.current = epoch
        setFrames(loaded)
        // 재생 위치 유지 — 윈도우가 슬라이드돼도 보던 지점 그대로 (갑작스런 점프 방지).
        // 새 목록이 더 짧아진 경우만 마지막 프레임으로 clamp.
        setFrameIdx((i) => Math.min(i, loaded.length - 1))
      } catch (err) {
        console.warn('[radar] fetch 실패', err)
      }
    }
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  // 프레임 루프 — 마지막 프레임은 길게 유지.
  useEffect(() => {
    if (frames.length < 2) return
    const delay = frameIdx === frames.length - 1 ? LAST_HOLD_MS : PLAY_MS
    const id = setTimeout(() => {
      setFrameIdx((i) => (i + 1) % frames.length)
    }, delay)
    return () => clearTimeout(id)
  }, [frames, frameIdx])

  return { frames, frameIdx }
}

export function RadarLatest({
  player,
  showUpdateToast = false,
}: {
  player: RadarPlayer
  /** 프레임 윈도우 갱신 시 toast 표출 (확장 모달 전용). */
  showUpdateToast?: boolean
}) {
  const { frames, frameIdx } = player
  // 카드/모달 공통 — 폭을 꽉 채우고(100%) 원본 정중앙 기준으로 위아래를 잘라낸다.
  //   원본이 거의 정사각이라 contain 으로 넣으면 좌우 여백이 크게 남는다.
  const imageStyle: CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: '100%',
    height: 'auto',
    maxWidth: 'none', // tailwind preflight 의 img{max-width:100%} 무력화
    transform: 'translate(-50%, -50%)',
  }

  // 업데이트 toast — 최신 프레임 epoch 이 바뀌면 3초 표출.
  //   mount 첫 관측은 제외 (모달 열 때마다 뜨지 않게).
  const latestEpoch = frames.length > 0 ? frames[frames.length - 1].epoch : null
  const prevEpochRef = useRef<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (latestEpoch === null) return
    const prev = prevEpochRef.current
    prevEpochRef.current = latestEpoch
    if (prev !== null && prev !== latestEpoch && showUpdateToast) {
      setToast(`레이더 업데이트 · ${badgeLabel(latestEpoch)}`)
      const id = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(id)
    }
  }, [latestEpoch, showUpdateToast])

  return (
    <div
      className="relative"
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    >
      {/* 배경 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: COLORS.neutral800,
        }}
      />
      {/* 폴백 이미지 (프레임 로딩 전) — 프레임과 동일한 crop 규칙 적용. */}
      {frames.length === 0 && (
        <img src="/images/radar-default.png" alt="" style={imageStyle} />
      )}
      {/* 프레임 전부 <img> 로 겹쳐두고 opacity 토글 — background 교체 방식의
          첫 사이클 디코딩 깜빡임 제거 (모든 프레임이 DOM 에 상주). */}
      {frames.map((f, i) => (
        <img
          key={f.url}
          src={f.url}
          alt=""
          style={{ ...imageStyle, opacity: i === frameIdx ? 1 : 0 }}
        />
      ))}

      {/* 업데이트 toast — 상단 중앙, 3초 후 사라짐 (확장 모달 전용) */}
      {toast && (
        <div
          className="absolute"
          style={{
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            borderRadius: '18px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#2DE76E',
            fontSize: '14px',
            fontWeight: 600,
            lineHeight: '20px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {toast}
        </div>
      )}

    </div>
  )
}
