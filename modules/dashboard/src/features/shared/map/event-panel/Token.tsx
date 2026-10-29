interface TokenProps {
  text: string
  onRemove?: () => void
}

export function Token({ text, onRemove }: TokenProps) {
  return (
    <div
      className="inline-flex shrink-0 items-center bg-[rgba(177,190,233,0.25)] transition-colors hover:bg-[rgba(198,209,245,0.35)]"
      style={{
        padding: '8px',
        gap: '4px',
        borderRadius: '6px',
        height: '32px',
        boxSizing: 'border-box',
      }}
    >
      <span className="text-b5" style={{ color: '#FFF' }}>
        {text}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex shrink-0 items-center justify-center"
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '8px',
            border: '1px solid rgba(232, 232, 237, 0.30)',
            background: 'rgba(255, 255, 255, 0.20)',
          }}
          aria-label={`${text} 삭제`}
        >
          {/* inline SVG — viewBox 를 path bbox 에 맞춰 가운데 정렬 */}
          <svg
            width="5"
            height="5"
            viewBox="0.6 0.6 5 5"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5.59961 0.599976L0.59961 5.59998M5.59961 5.59998L0.599609 0.599976"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
