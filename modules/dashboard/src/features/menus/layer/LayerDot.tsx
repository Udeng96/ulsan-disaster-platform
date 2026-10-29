// 레이어 색 dot (W 22 × H 22) — dashed (배수구역) / solid + white stroke.

export function LayerDot({
  color,
  dashed,
}: {
  color?: string
  dashed?: boolean
}) {
  if (dashed) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
      >
        <circle
          cx="11"
          cy="11"
          r="9"
          stroke="#B8C8D6"
          strokeWidth="2"
          strokeDasharray="2 2"
        />
      </svg>
    )
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
    >
      <circle cx="11" cy="11" r="9" fill={color} stroke="white" strokeWidth="2" />
    </svg>
  )
}
