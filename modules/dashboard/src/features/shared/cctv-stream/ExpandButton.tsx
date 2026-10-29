import { useId } from 'react'

// CCTV 확장 button — 32×32, absolute bottom 12 right 12
// state — normal / hover / disabled:
//   normal: 회색 glass + white arrow
//   hover:  회색 glass (더 진함) + Primary-light overlay & border & arrow
//   disabled: normal + opacity 0.3, hover 비활성
// (clipPath id 충돌 방지 위해 useId 로 instance 별 unique id 생성)
interface ExpandButtonProps {
  disabled?: boolean
  onClick?: () => void
}

// normal SVG — gray glass + white arrow
function NormalIcon({ clipId }: { clipId: string }) {
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
            clipPath: `url(#${clipId})`,
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
          rx="8"
          fill="#737373"
          fillOpacity="0.45"
          style={{ mixBlendMode: 'plus-darker' }}
        />
        <rect
          x="0.5"
          y="0.500122"
          width="31"
          height="31"
          rx="7.5"
          stroke="black"
          strokeOpacity="0.15"
        />
      </g>
      <path
        d="M15.8049 22.253H22.3988V15.8531M15.8049 22.253H9.59888V9.45312H15.9988M15.8049 22.253V15.8531H10.0713"
        stroke="white"
        strokeWidth="1.28863"
      />
      <path
        d="M18.8552 9.4523L22.399 9.4523L22.399 12.9432"
        stroke="white"
        strokeWidth="1.28863"
      />
      <path
        d="M22.3465 9.50415L18.3267 13.524"
        stroke="white"
        strokeWidth="1.28863"
      />
      <defs>
        <clipPath id={clipId} transform="translate(16 15.9999)">
          <rect y="0.00012207" width="32" height="32" rx="8" />
        </clipPath>
      </defs>
    </svg>
  )
}

// hover SVG — gray glass (진함) + Primary-light overlay + Primary-light border & arrow
function HoverIcon({ clipId }: { clipId: string }) {
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
            clipPath: `url(#${clipId})`,
            height: '100%',
            width: '100%',
          }}
        />
      </foreignObject>
      <g opacity="0.9" data-figma-bg-blur-radius="16">
        <path
          d="M0 8.00012C0 3.58184 3.58172 0.00012207 8 0.00012207H24C28.4183 0.00012207 32 3.58184 32 8.00012V24.0001C32 28.4184 28.4183 32.0001 24 32.0001H8C3.58172 32.0001 0 28.4184 0 24.0001V8.00012Z"
          fill="#737373"
          fillOpacity="0.6"
          style={{ mixBlendMode: 'plus-darker' }}
        />
        <path
          d="M0 8.00012C0 3.58184 3.58172 0.00012207 8 0.00012207H24C28.4183 0.00012207 32 3.58184 32 8.00012V24.0001C32 28.4184 28.4183 32.0001 24 32.0001H8C3.58172 32.0001 0 28.4184 0 24.0001V8.00012Z"
          fill="#42B8FF"
          fillOpacity="0.3"
        />
        <path
          d="M8 0.500122H24C28.1421 0.500122 31.5 3.85799 31.5 8.00012V24.0001C31.5 28.1423 28.1421 31.5001 24 31.5001H8C3.85786 31.5001 0.5 28.1423 0.5 24.0001V8.00012C0.5 3.85799 3.85786 0.500122 8 0.500122Z"
          stroke="#42B8FF"
          strokeOpacity="0.45"
        />
      </g>
      <path
        d="M15.8049 22.253H22.3988V15.8531M15.8049 22.253H9.59888V9.45312H15.9988M15.8049 22.253V15.8531H10.0713"
        stroke="#42B8FF"
        strokeWidth="1.28863"
      />
      <path
        d="M18.8552 9.4523L22.399 9.4523L22.399 12.9432"
        stroke="#42B8FF"
        strokeWidth="1.28863"
      />
      <path
        d="M22.3465 9.50415L18.3267 13.524"
        stroke="#42B8FF"
        strokeWidth="1.28863"
      />
      <defs>
        <clipPath id={clipId} transform="translate(16 15.9999)">
          <path d="M0 8.00012C0 3.58184 3.58172 0.00012207 8 0.00012207H24C28.4183 0.00012207 32 3.58184 32 8.00012V24.0001C32 28.4184 28.4183 32.0001 24 32.0001H8C3.58172 32.0001 0 28.4184 0 24.0001V8.00012Z" />
        </clipPath>
      </defs>
    </svg>
  )
}

export function ExpandButton({ disabled, onClick }: ExpandButtonProps) {
  const normalClipId = useId()
  const hoverClipId = useId()

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group absolute flex items-center justify-center disabled:opacity-30"
      style={{
        width: '32px',
        height: '32px',
        bottom: '12px',
        right: '12px',
      }}
      aria-label="확장"
    >
      {/* normal — disabled 시에도 보임 (hover 비활성) */}
      <span className="block group-enabled:group-hover:hidden">
        <NormalIcon clipId={normalClipId} />
      </span>
      {/* hover — disabled 가 아닐 때만 hover 시 보임 */}
      <span className="hidden group-enabled:group-hover:block">
        <HoverIcon clipId={hoverClipId} />
      </span>
    </button>
  )
}
