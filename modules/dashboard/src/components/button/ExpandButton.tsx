import { useState } from 'react'

// 헤더 우측 상단 확장 버튼 — 32×32, 글라스 효과 (backdrop-filter blur 8) + 화살표 아이콘
// normal / hover 두 가지 SVG 상태 toggle
export function ExpandButton({
  onClick,
  style,
}: {
  onClick?: () => void
  style?: React.CSSProperties
}) {
  const [hover, setHover] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        width: '32px',
        height: '32px',
        display: 'inline-flex',
        ...style,
      }}
    >
      {hover ? <ExpandSvgHover /> : <ExpandSvgNormal />}
    </button>
  )
}

function ExpandSvgNormal() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
    >
      <foreignObject x="-16" y="-15.9999" width="64" height="64">
        <div
          style={{
            backdropFilter: 'blur(8px)',
            clipPath: 'url(#bgblur_expand_normal_clip)',
            height: '100%',
            width: '100%',
          }}
        />
      </foreignObject>
      <g opacity="0.9" data-figma-bg-blur-radius="16">
        <rect
          y="0.00012207"
          width="32"
          height="32"
          rx="16"
          fill="#ADADAD"
          fillOpacity="0.15"
          style={{ mixBlendMode: 'plus-lighter' }}
        />
        <rect
          x="0.5"
          y="0.500122"
          width="31"
          height="31"
          rx="15.5"
          stroke="white"
          strokeOpacity="0.15"
        />
      </g>
      <path
        d="M15.8056 22.253H22.3995V15.8531M15.8056 22.253H9.59961V9.45312H15.9996M15.8056 22.253V15.8531H10.072"
        stroke="white"
        strokeWidth="1.28863"
      />
      <path
        d="M18.8574 9.4523L22.4012 9.4523L22.4012 12.9432"
        stroke="white"
        strokeWidth="1.28863"
      />
      <path
        d="M22.348 9.50415L18.3281 13.524"
        stroke="white"
        strokeWidth="1.28863"
      />
      <defs>
        <clipPath
          id="bgblur_expand_normal_clip"
          transform="translate(16 15.9999)"
        >
          <rect y="0.00012207" width="32" height="32" rx="16" />
        </clipPath>
      </defs>
    </svg>
  )
}

function ExpandSvgHover() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
    >
      <foreignObject x="-16" y="-15.9999" width="64" height="64">
        <div
          style={{
            backdropFilter: 'blur(8px)',
            clipPath: 'url(#bgblur_expand_hover_clip)',
            height: '100%',
            width: '100%',
          }}
        />
      </foreignObject>
      <g opacity="0.9" data-figma-bg-blur-radius="16">
        <rect
          y="0.00012207"
          width="32"
          height="32"
          rx="16"
          fill="#ADADAD"
          fillOpacity="0.24"
          style={{ mixBlendMode: 'plus-lighter' }}
        />
        <rect
          x="0.625"
          y="0.625122"
          width="30.75"
          height="30.75"
          rx="15.375"
          stroke="white"
          strokeOpacity="0.21"
          strokeWidth="1.25"
        />
      </g>
      <path
        d="M15.8056 22.253H22.3995V15.8531M15.8056 22.253H9.59961V9.45312H15.9996M15.8056 22.253V15.8531H10.072"
        stroke="white"
        strokeWidth="1.28863"
      />
      <path
        d="M18.8574 9.4523L22.4012 9.4523L22.4012 12.9432"
        stroke="white"
        strokeWidth="1.28863"
      />
      <path
        d="M22.348 9.50415L18.3281 13.524"
        stroke="white"
        strokeWidth="1.28863"
      />
      <defs>
        <clipPath
          id="bgblur_expand_hover_clip"
          transform="translate(16 15.9999)"
        >
          <rect y="0.00012207" width="32" height="32" rx="16" />
        </clipPath>
      </defs>
    </svg>
  )
}
