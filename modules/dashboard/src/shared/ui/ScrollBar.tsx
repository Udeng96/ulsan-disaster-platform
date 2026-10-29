// 따로 그리는 스크롤바 — 굵기 6, 손잡이 40 고정 (가로·세로). 대상의 기본 스크롤바는 숨겨 둘 것.
//   대상이 넘칠 때만 손잡이가 보이고, 손잡이를 끌면 대상이 따라 움직인다 (화면 배율 반영).
//   <div ref={listRef} className="overflow-y-auto [scrollbar-width:none]">...</div>
//   <ScrollBar target={listRef} axis="y" />
import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { cn } from './cn'

const THUMB = 40

export function ScrollBar({ target, axis, className }: { target: RefObject<HTMLElement | null>; axis: 'x' | 'y'; className?: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState({ offset: 0, visible: false })
  const x = axis === 'x'

  useLayoutEffect(() => {
    const el = target.current
    const track = trackRef.current
    if (!el || !track) return
    const sync = () => {
      const max = x ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight
      const travel = (x ? track.clientWidth : track.clientHeight) - THUMB
      const next = max > 1 ? { offset: ((x ? el.scrollLeft : el.scrollTop) / max) * travel, visible: true } : { offset: 0, visible: false }
      setState((p) => (p.offset === next.offset && p.visible === next.visible ? p : next))
    }
    sync()
    el.addEventListener('scroll', sync)
    // 내용이 늘거나 줄면 다시 잰다 (자식 추가·삭제)
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    const mo = new MutationObserver(sync)
    mo.observe(el, { childList: true, subtree: true })
    return () => {
      el.removeEventListener('scroll', sync)
      ro.disconnect()
      mo.disconnect()
    }
  }, [target, x])

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = target.current
    const track = trackRef.current
    if (!el || !track) return
    const start = x ? e.clientX : e.clientY
    const from = state.offset
    const rect = track.getBoundingClientRect()
    const size = x ? track.clientWidth : track.clientHeight
    const scale = (x ? rect.width : rect.height) / size
    const travel = size - THUMB
    const max = x ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(Math.max(from + ((x ? ev.clientX : ev.clientY) - start) / scale, 0), travel)
      if (x) el.scrollLeft = (next / travel) * max
      else el.scrollTop = (next / travel) * max
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div ref={trackRef} className={cn('flex rounded-[99px]', x ? 'h-1.5 w-full flex-row items-center self-center' : 'w-1.5 flex-col items-start self-stretch', className)}>
      {state.visible && (
        <div
          onMouseDown={startDrag}
          style={x ? { marginLeft: state.offset } : { marginTop: state.offset }}
          className={cn('shrink-0 cursor-grab self-stretch rounded-lg bg-white/25', x ? 'w-10' : 'h-10')}
        />
      )}
    </div>
  )
}
