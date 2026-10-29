// CCTV header 내 숫자 박스 — radius 4, border + bg.
// size:
//   small (default) — 18×18, 글씨 15/600/16
//   large           — 24×24, 글씨 20/600/21.333 (modal header)
// variant:
//   normal (default) — 지도 순번 reticle 과 동일 색 (CctvMarkersML 의 RETICLE)
//   event            — Accent-Red (bg #DE0602, border #FF4245, text white) — 이벤트 활성 시
interface NumberBadgeProps {
  number: number
  size?: 'small' | 'large'
  variant?: 'normal' | 'event'
}

const SIZE_MAP = {
  small: {
    box: 18,
    fontSize: 15,
    lineHeight: 16,
  },
  large: {
    box: 24,
    fontSize: 20,
    lineHeight: 21.333,
  },
} as const

const VARIANT_MAP = {
  normal: {
    bg: 'rgba(137, 37, 203, 0.85)',
    border: '#FFF',
    color: '#FFF',
  },
  event: {
    bg: '#DE0602',
    border: '#FF4245',
    color: '#FFF',
  },
} as const

export function NumberBadge({
  number,
  size = 'small',
  variant = 'normal',
}: NumberBadgeProps) {
  const s = SIZE_MAP[size]
  const v = VARIANT_MAP[variant]

  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{
        width: `${s.box}px`,
        height: `${s.box}px`,
        borderRadius: '4px',
        border: `1px solid ${v.border}`,
        background: v.bg,
      }}
    >
      <span
        style={{
          color: v.color,
          textAlign: 'center',
          fontFamily: 'Roboto',
          fontSize: `${s.fontSize}px`,
          fontWeight: 600,
          // 단일 글자 — line-height 1 로 em box 기준 정렬 (옆 한글 라벨과 수평 맞춤).
          lineHeight: 1,
          // 세로 보정 — 모달(large)만 1px 내린다.
          //   그리드 셀(small)은 보정 없이 두는 게 눈에 더 맞다.
          position: 'relative',
          top: size === 'large' ? '1px' : '0',
        }}
      >
        {number}
      </span>
    </div>
  )
}
