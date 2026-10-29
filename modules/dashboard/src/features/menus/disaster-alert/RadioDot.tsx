// 라디오 버튼 도트 — unselected / hover / selected (Figma SVG 18×18).
//   hover 는 부모 버튼의 `group` + group-hover 로 표시. 부모에 className="group" 필요.

export function RadioDot({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <rect
          x="0.5"
          y="0.5"
          width="17"
          height="17"
          rx="8.5"
          fill="#F4F8FB"
          stroke="#1EA7FF"
        />
        <circle cx="9" cy="9" r="5" fill="#1EA7FF" />
      </svg>
    )
  }
  return (
    <>
      {/* unselected */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden
        className="block group-hover:hidden"
      >
        <rect width="18" height="18" rx="9" fill="#E0F2FF" fillOpacity="0.4" />
        <rect
          x="1"
          y="1"
          width="16"
          height="16"
          rx="8"
          stroke="#E0F2FF"
          strokeOpacity="0.2"
          strokeWidth="2"
        />
      </svg>
      {/* hover */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden
        className="hidden group-hover:block"
      >
        <rect width="18" height="18" rx="9" fill="#E0F2FF" fillOpacity="0.75" />
        <rect
          x="1"
          y="1"
          width="16"
          height="16"
          rx="8"
          stroke="#E0F2FF"
          strokeOpacity="0.5"
          strokeWidth="2"
        />
      </svg>
    </>
  )
}
