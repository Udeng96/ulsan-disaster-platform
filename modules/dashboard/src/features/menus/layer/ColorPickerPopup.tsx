// 컬러 피커 popup — 배수펌프 색 dot 클릭 시 좌측에 표시 (react-colorful).
// ScaledFrame transform 영향 피하려 document.body 에 portal mount.

import { COLORS } from '@/styles/designTokens'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HexColorPicker } from 'react-colorful'

// hex → "rgb(R, G, B)" 변환
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}

// 컬러 피커 popup — 배수펌프 색 dot 클릭 시 좌측 10px 떨어진 곳에 표시
// W 336 × H 477, inline-flex col, items-start
// react-colorful 라이브러리 사용 (saturation 영역 + hue bar 자동 처리)
export function ColorPickerPopup({
  anchorRef,
  initialColor,
  recentColors,
  onApply,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  initialColor: string
  recentColors: string[]
  onApply: (color: string) => void
  onClose: () => void
}) {
  const [color, setColor] = useState(initialColor)
  // anchor (배수펌프 dot button) 의 좌표 측정 + popup 위치 (좌측 10px)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useEffect(() => {
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({
      // popup right edge = anchor left - 10 → popup left = anchor left - 10 - W
      left: r.left - 10 - 336,
      top: r.top,
    })
  }, [anchorRef])

  if (!pos) return null

  // ScaledFrame 의 transform 으로 fixed 의 containing block 이 ScaledFrame 이 되는 것 방지 위해
  // document.body 에 portal mount (ScaledFrame 외부) → fixed left/top = viewport client 좌표
  return createPortal(
    <>
      {/* backdrop — 외부 클릭 시 close */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 5000 }}
        onClick={onClose}
      />
      {/* popup wrapper — W 336 × H 477, inline-flex col, items-start
          radius 20 (좌상/우하/좌하) — anchor (배수펌프 dot) 향한 우상단만 radius 0 */}
      <div
        className="inline-flex flex-col items-start"
        style={{
          position: 'fixed',
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          width: '336px',
          height: '477px',
          zIndex: 5001,
          background: 'rgba(255, 255, 255, 0.85)',
          borderRadius: '20px 0 20px 20px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 — padding 20/20/6/20, col, items-start, gap 16, H 24 (content), self-stretch */}
        <div
          className="flex flex-col items-start self-stretch"
          style={{
            padding: '20px 20px 6px 20px',
            gap: '16px',
          }}
        >
          <span
            style={{
              color: COLORS.neutral900,
              fontFamily: 'Roboto',
              fontSize: '18px',
              fontWeight: 600,
              lineHeight: '24px',
            }}
          >
            색상 변경
          </span>
        </div>

        {/* 다이얼로그 영역 (body) — padding 14 28, col, items-start, gap 10, self-stretch
            popup wrapper W 336 → body W 336, content W = 336 - 56 = 280 */}
        <div
          className="flex flex-col items-start self-stretch"
          style={{
            padding: '14px 28px',
            gap: '10px',
          }}
        >
          {/* saturation 영역 — gradient 박스 (hue bar 숨김) */}
          <div
            className="colorful-saturation-only self-stretch"
            style={{ height: '180px' }}
          >
            <HexColorPicker
              color={color}
              onChange={setColor}
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          {/* hue bar 영역 — W 278 × H 12 (saturation 숨김), saturation ↔ hue 사이 gap 16
              body gap 10 + marginTop 6 = 총 16 spacing */}
          <div
            className="colorful-hue-only"
            style={{
              width: '278px',
              height: '12px',
              alignSelf: 'center',
              marginTop: '6px',
            }}
          >
            <HexColorPicker
              color={color}
              onChange={setColor}
              style={{ width: '100%', height: '12px' }}
            />
          </div>

          {/* 현재 색 미리보기 + RGB 표시 */}
          <div
            className="flex items-center self-stretch"
            style={{ gap: '12px' }}
          >
            <div
              style={{
                width: '40px',
                height: '32px',
                borderRadius: '6px',
                background: color,
                border: '1px solid rgba(0, 0, 0, 0.10)',
              }}
            />
            <span
              style={{
                color: COLORS.neutral900,
                fontFamily: 'Roboto',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              RGB
            </span>
            <span
              className="flex-1"
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(0, 0, 0, 0.10)',
                color: COLORS.neutral900,
                fontFamily: 'Roboto',
                fontSize: '13px',
              }}
            >
              {hexToRgb(color)}
            </span>
          </div>

          {/* 최근 색상 */}
          <span
            className="self-stretch"
            style={{
              color: COLORS.neutral900,
              fontFamily: 'Roboto',
              fontSize: '13px',
              fontWeight: 500,
              marginTop: '4px',
            }}
          >
            최근 색상
          </span>
          <div
            className="flex items-center"
            style={{ gap: '8px' }}
          >
            {recentColors.map((c, i) => (
              <button
                key={`${c}-${i}`}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: c,
                  border: '1px solid rgba(0, 0, 0, 0.10)',
                }}
                aria-label={`최근 색상 ${c}`}
              />
            ))}
          </div>

        </div>

        {/* footer — 취소 / 적용 button (각 W 200 × H 40, padding 13 16, gap 10, items/justify-center) */}
        <div
          className="flex justify-end self-stretch"
          style={{
            gap: '10px',
            padding: '10px 28px 20px 28px',
            marginTop: 'auto',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="color-picker-btn-cancel flex items-center justify-center"
            style={{
              width: '200px',
              height: '40px',
              padding: '13px 16px',
              gap: '10px',
              borderRadius: '8px',
              color: COLORS.neutral900,
              fontFamily: 'Roboto',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onApply(color)}
            className="color-picker-btn-confirm flex items-center justify-center"
            style={{
              width: '200px',
              height: '40px',
              padding: '13px 16px',
              gap: '10px',
              borderRadius: '8px',
              color: COLORS.white,
              fontFamily: 'Roboto',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            적용
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
