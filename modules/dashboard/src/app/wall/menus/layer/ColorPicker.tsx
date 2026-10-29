// 레이어 색 바꾸기 팝업 (336×477) — 색 점을 누르면 그 왼쪽 10px 에 뜬다. 바깥 누르면 닫힘.
//   ScaledFrame 축소 밖(document.body)에 붙여 화면 좌표 그대로 쓴다.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { HexColorPicker } from 'react-colorful'
import { hexToRgb } from '@/shared/styles/palette'
import './colorPicker.css'


interface Props {
  /** 누른 색 점 */
  anchor: HTMLElement
  initial: string
  recent: readonly string[]
  onApply: (color: string) => void
  onClose: () => void
}

/** 창 높이 */
const PICKER_H = 477
const swatch = 'border border-black/10'
const btn = 'flex h-10 w-[200px] items-center justify-center gap-2.5 rounded-lg px-4 py-[13px] font-sans text-[14px] font-medium'

export function ColorPicker({ anchor, initial, recent, onApply, onClose }: Props) {
  const [color, setColor] = useState(initial)
  // 뜰 때 한 번 잰다 (색 점 왼쪽 10px, 위 맞춤)
  const [pos] = useState(() => {
    const r = anchor.getBoundingClientRect()
    // 아래쪽 레이어는 창이 화면 밖으로 잘리지 않게 위로 올린다 (아래 여백 8)
    const top = Math.max(8, Math.min(r.top, window.innerHeight - PICKER_H - 8))
    return { left: r.left - 10 - 336, top, shifted: top !== r.top }
  })

  return createPortal(
    <>
      <div className="fixed inset-0 z-[5000]" onClick={onClose} />
      <div
        role="dialog"
        aria-label="색상 변경"
        className={`fixed z-[5001] inline-flex h-[477px] w-[336px] flex-col items-start bg-white/85 ${pos.shifted ? 'rounded-[20px]' : 'rounded-[20px_0_20px_20px]'} backdrop-blur-[20px]`}
        style={{ left: pos.left, top: pos.top }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-start gap-4 self-stretch px-5 pt-5 pb-1.5">
          <span className="font-sans text-[18px] leading-6 font-semibold text-neutral-900">색상 변경</span>
        </div>
        <div className="flex flex-col items-start gap-2.5 self-stretch px-7 py-3.5">
          <div className="cp-sat h-[180px] self-stretch">
            <HexColorPicker color={color} onChange={setColor} style={{ width: '100%', height: '100%' }} />
          </div>
          <div className="cp-hue mt-1.5 h-3 w-[278px] self-center">
            <HexColorPicker color={color} onChange={setColor} style={{ width: '100%', height: 12 }} />
          </div>
          <div className="flex items-center gap-3 self-stretch">
            <div className={`h-8 w-10 rounded-md ${swatch}`} style={{ background: color }} />
            <span className="font-sans text-[13px] font-medium text-neutral-900">RGB</span>
            <span className={`flex-1 rounded-md bg-white/60 px-2.5 py-1.5 font-sans text-[13px] text-neutral-900 ${swatch}`}>{hexToRgb(color)}</span>
          </div>
          <span className="mt-1 self-stretch font-sans text-[13px] font-medium text-neutral-900">최근 색상</span>
          <div className="flex items-center gap-2">
            {recent.map((c, i) => (
              <button key={`${c}-${i}`} type="button" aria-label={`최근 색상 ${c}`} onClick={() => setColor(c)} className={`size-8 rounded-lg ${swatch}`} style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="mt-auto flex justify-end gap-2.5 self-stretch px-7 pt-2.5 pb-5">
          <button type="button" onClick={onClose} className={`${btn} border border-white/24 bg-white/8 text-neutral-900 hover:border-primary-dark/40 hover:bg-white/40`}>
            취소
          </button>
          <button type="button" onClick={() => onApply(color)} className={`${btn} bg-primary-dark text-white hover:bg-primary-light hover:shadow-button-hover`}>
            적용
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
