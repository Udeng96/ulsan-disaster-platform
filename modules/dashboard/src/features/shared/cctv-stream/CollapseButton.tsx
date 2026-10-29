import { useId } from 'react'

// CCTV modal 축소 button — 48×48 외곽, absolute bottom 36 right 36
// normal: 36×36 SVG (외곽 안 가운데), hover: 48×48 SVG (외곽 가득, Primary-light overlay)
// state — normal / hover / disabled

interface CollapseButtonProps {
  disabled?: boolean
  onClick?: () => void
}

// normal — 36×36, gray glass + white arrow
function NormalIcon({ clipId }: { clipId: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
    >
      <foreignObject x="-18" y="-18" width="72" height="72">
        <div
          style={{
            backdropFilter: 'blur(9px)',
            clipPath: `url(#${clipId})`,
            height: '100%',
            width: '100%',
          }}
        />
      </foreignObject>
      <g opacity="0.9" data-figma-bg-blur-radius="18">
        <rect
          width="36"
          height="36"
          rx="9"
          fill="#737373"
          fillOpacity="0.45"
          style={{ mixBlendMode: 'plus-darker' }}
        />
        <rect
          x="0.5625"
          y="0.5625"
          width="0.0"
          height="0.0"
          rx="8.4375"
          stroke="black"
          strokeOpacity="0.15"
          strokeWidth="1.125"
        />
      </g>
      <path
        d="M17.7806 25.0347H25.1987V17.8347M17.7806 25.0347H10.7988V10.6348H17.9988M17.7806 25.0347V17.8347H11.3303"
        stroke="white"
        strokeWidth="1.44971"
      />
      <path
        d="M24.6362 15.1236L20.6495 15.1236L20.6495 11.1963"
        stroke="white"
        strokeWidth="1.44971"
      />
      <path
        d="M25.1395 10.6924L20.6172 15.2147"
        stroke="white"
        strokeWidth="1.44971"
      />
      <defs>
        <clipPath id={clipId} transform="translate(18 18)">
          <rect width="36" height="36" rx="9" />
        </clipPath>
      </defs>
    </svg>
  )
}

// hover — 48×48, gray glass (진함) + Primary-light overlay + Primary-light border + white arrow
function HoverIcon({ clipId }: { clipId: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
    >
      <foreignObject x="-12" y="-11.9996" width="72" height="72">
        <div
          style={{
            backdropFilter: 'blur(6px)',
            clipPath: `url(#${clipId})`,
            height: '100%',
            width: '100%',
          }}
        />
      </foreignObject>
      <g opacity="0.9" data-figma-bg-blur-radius="12">
        <rect
          y="0.000366211"
          width="48"
          height="48"
          rx="12"
          fill="#737373"
          fillOpacity="0.6"
          style={{ mixBlendMode: 'plus-darker' }}
        />
        <rect
          y="0.000366211"
          width="48"
          height="48"
          rx="12"
          fill="#42B8FF"
          fillOpacity="0.3"
        />
        <rect
          x="0.375"
          y="0.375366"
          width="47.25"
          height="47.25"
          rx="11.625"
          stroke="#42B8FF"
          strokeOpacity="0.45"
          strokeWidth="0.75"
        />
      </g>
      <path
        d="M23.7077 33.3794H33.5985V23.7795M23.7077 33.3794H14.3987V14.1796H23.9986M23.7077 33.3794V23.7795H15.1073"
        stroke="white"
        strokeWidth="1.93295"
      />
      <path
        d="M32.8481 20.1647L27.5325 20.1647L27.5325 14.9283"
        stroke="white"
        strokeWidth="1.93295"
      />
      <path
        d="M33.5195 14.2561L27.4897 20.2859"
        stroke="white"
        strokeWidth="1.93295"
      />
      <defs>
        <clipPath id={clipId} transform="translate(12 11.9996)">
          <rect y="0.000366211" width="48" height="48" rx="12" />
        </clipPath>
      </defs>
    </svg>
  )
}

export function CollapseButton({ disabled, onClick }: CollapseButtonProps) {
  const normalClipId = useId()
  const hoverClipId = useId()

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group absolute flex items-center justify-center disabled:opacity-30"
      style={{
        width: '48px',
        height: '48px',
        bottom: '36px',
        right: '36px',
      }}
      aria-label="축소"
    >
      {/* normal — 36×36 (외곽 48 안 가운데) */}
      <span className="block group-enabled:group-hover:hidden">
        <NormalIcon clipId={normalClipId} />
      </span>
      {/* hover — 48×48 (외곽 가득) */}
      <span className="hidden group-enabled:group-hover:block">
        <HoverIcon clipId={hoverClipId} />
      </span>
    </button>
  )
}
