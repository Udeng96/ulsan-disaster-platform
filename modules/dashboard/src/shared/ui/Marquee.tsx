// 한 줄 글씨 — 칸보다 길면 같은 글씨를 두 번 이어 왼쪽으로 계속 흘린다 (기상특보).
//   짧으면 그대로 (centered 면 가운데).
import { memo, useLayoutEffect, useRef, useState } from 'react'
import { cn } from './cn'

interface Props {
  text: string
  /** 글씨 className (크기·색·윤곽선) */
  className?: string
  centered?: boolean
}

export const Marquee = memo(function Marquee({ text, className, centered = false }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLSpanElement>(null)
  const [over, setOver] = useState(false)

  useLayoutEffect(() => {
    const measure = () => {
      if (wrap.current && inner.current) setOver(inner.current.scrollWidth > wrap.current.clientWidth + 1)
    }
    measure()
    const obs = new ResizeObserver(measure)
    if (wrap.current) obs.observe(wrap.current)
    return () => obs.disconnect()
  }, [text])

  return (
    <div ref={wrap} className={cn('relative min-w-0 flex-1 overflow-hidden', centered && !over ? 'text-center' : 'text-left')}>
      <div className={cn('inline-flex gap-12', centered && 'align-top', over && 'animate-marquee')}>
        <span ref={inner} className={cn('whitespace-nowrap', className)}>
          {text}
        </span>
        {over && (
          <span aria-hidden className={cn('whitespace-nowrap', className)}>
            {text}
          </span>
        )}
      </div>
    </div>
  )
})
