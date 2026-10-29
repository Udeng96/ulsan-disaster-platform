// 라벨보기 토글 — W 40 × H 24, off Neutral-400 / on Primary. 안 circle SVG (drop shadow).

import { COLORS } from '@/styles/designTokens'
import { useId } from 'react'

export function LabelToggle({
  on,
  onChange,
}: {
  on: boolean
  onChange: (v: boolean) => void
}) {
  const offFilterId = useId()
  const onFilterId = useId()
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="relative shrink-0"
      style={{
        width: '40px',
        height: '24px',
        padding: '2px',
        borderRadius: '99px',
        background: on ? COLORS.primary : COLORS.neutral450,
        transition: 'background 0.2s',
      }}
      aria-pressed={on}
    >
      <span
        className="absolute block"
        style={{
          top: '2px',
          left: on ? '18px' : '2px',
          width: '22px',
          height: '22px',
          transition: 'left 0.2s',
        }}
      >
        {on ? (
          /* on — white circle + drop shadow */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
          >
            <g filter={`url(#${onFilterId})`}>
              <circle cx="10" cy="10" r="10" fill="white" />
            </g>
            <defs>
              <filter
                id={onFilterId}
                x="0"
                y="0"
                width="22"
                height="22"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feColorMatrix
                  in="SourceAlpha"
                  type="matrix"
                  values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                  result="hardAlpha"
                />
                <feOffset dx="1" dy="1" />
                <feGaussianBlur stdDeviation="0.5" />
                <feComposite in2="hardAlpha" operator="out" />
                <feColorMatrix
                  type="matrix"
                  values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0"
                />
                <feBlend
                  mode="normal"
                  in2="BackgroundImageFix"
                  result="effect1_dropShadow"
                />
                <feBlend
                  mode="normal"
                  in="SourceGraphic"
                  in2="effect1_dropShadow"
                  result="shape"
                />
              </filter>
            </defs>
          </svg>
        ) : (
          /* off — Neutral-200 circle (opacity 0.75) + drop shadow */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
          >
            <g opacity="0.75" filter={`url(#${offFilterId})`}>
              <circle cx="10" cy="10" r="10" fill="#B8C8D6" />
            </g>
            <defs>
              <filter
                id={offFilterId}
                x="0"
                y="0"
                width="22"
                height="22"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feColorMatrix
                  in="SourceAlpha"
                  type="matrix"
                  values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                  result="hardAlpha"
                />
                <feOffset dx="1" dy="1" />
                <feGaussianBlur stdDeviation="0.5" />
                <feComposite in2="hardAlpha" operator="out" />
                <feColorMatrix
                  type="matrix"
                  values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0"
                />
                <feBlend
                  mode="normal"
                  in2="BackgroundImageFix"
                  result="effect1_dropShadow"
                />
                <feBlend
                  mode="normal"
                  in="SourceGraphic"
                  in2="effect1_dropShadow"
                  result="shape"
                />
              </filter>
            </defs>
          </svg>
        )}
      </span>
    </button>
  )
}
