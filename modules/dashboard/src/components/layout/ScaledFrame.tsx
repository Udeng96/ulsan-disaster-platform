import { useLayoutEffect, useRef, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** 작업 영역 W (default 1920 — IP wall main) */
  width?: number
  /** 작업 영역 H (default 1080 — IP wall main) */
  height?: number
  /** 배경 url (default 없음 — main 화면용 bg-center) */
  background?: string
}

// W × H 작업 영역을 viewport 에 맞춰 축소/확대한다.
// main(tablet): 1920×1080 (default) / wall: 2880×1080
// IP wall 에선 1:1 표출, 작은 viewport 에선 비례 축소.
//
// 축소는 transform: scale 로 한다.
//   CSS zoom 도 시도했으나, zoom 은 하위 iframe 의 devicePixelRatio 까지 배율만큼 바꿔버려서
//   외부 사이트(하천시설물 iframe) 레이아웃이 깨진다. scale 은 iframe 내부에 영향이 없다.
export function ScaledFrame({
  children,
  width = 1920,
  height = 1080,
  background = "url('/images/common/bg-center.png') lightgray 50% / cover no-repeat",
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = frameRef.current
    if (!el) return

    function fit() {
      const scale = Math.min(
        window.innerWidth / width,
        window.innerHeight / height,
      )
      el!.style.transform = `scale(${scale})`
    }

    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [width, height])

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <div
        ref={frameRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          flexShrink: 0,
          background,
        }}
      >
        {children}
      </div>
    </div>
  )
}
