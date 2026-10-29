// 하천시설물 — 외부 사이트를 화면 전체(1920×1080)에 iframe 으로 띄운다 (옛 화면 RiverFacilityOverlay 그대로).
//   메뉴를 누르면 아래 가운데에서 5%→100% 로 펼쳐지고(0.45초), ✕·ESC 로 닫으면 다시 그 점으로 줄어든다.
//   ESC 는 iframe 에 포커스가 있으면 안 먹는다 (다른 출처 iframe 한계) — 그때는 ✕ 를 누른다.
import { useEffect } from 'react'
import { cn, useKept, ZOOM_MS } from '@/shared/ui'
import { dash, MENU, selectMenu } from '../../dashboard/state'

// 운영은 nginx(192.0.2.179) 전용 포트 — 그 사이트의 절대경로(/js, /css)가 살도록 앞부분 없이 중계한다.
//   개발은 vite 프록시(/south-ulsan). 주소가 바뀌면 .env 의 VITE_RIVER_FACILITY_URL 로 덮어쓴다.
//   nginx 설정: dep/202609/nginx/river-facility.{internal,dmz}.conf
const BASE = import.meta.env.VITE_RIVER_FACILITY_URL ?? (import.meta.env.PROD ? 'http://192.0.2.179:8099' : '/south-ulsan')
/** 처음 띄울 그 사이트 안 페이지 — 빈 글자면 첫 화면(우천시·평상시 등을 고르는 메뉴) */
const PATH = ''
const RIVER_URL = `${BASE.replace(/\/$/, '')}${PATH}`

/** 메뉴를 다시 눌러 끈다 (selectMenu 는 같은 메뉴면 끈다) */
const close = () => {
  if (dash.get().menu === MENU.river) selectMenu(MENU.river)
}

export function RiverOverlay() {
  const on = dash.use((s) => s.menu === MENU.river)
  // 닫히는 동안(줄어드는 0.45초)은 남겨 둔다
  const shown = useKept(on || null, ZOOM_MS)
  useEffect(() => {
    if (!on) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [on])
  if (!shown) return null
  return (
    <div className={cn('absolute inset-0 z-[10000] origin-bottom bg-[var(--color-neutral-800)] transition-zoom starting:scale-5', !on && 'scale-5')}>
      <iframe src={RIVER_URL} title="하천시설물" className="size-full border-0" />
      {/* 닫기 — 오른쪽 위 48 원, 반투명 검정·흐림 (옛 화면 값) */}
      <button
        type="button"
        onClick={close}
        aria-label="닫기"
        className="absolute top-6 right-[220px] z-[1] flex size-12 cursor-pointer items-center justify-center rounded-full border-2 border-white/35 bg-black/50 text-[20px] font-semibold text-white backdrop-blur-[8px]"
      >
        ✕
      </button>
    </div>
  )
}
