// 트리 들여쓰기 'ㄴ' 아이콘 — 24×24, dashed stroke.
// TreeSelect 의 마지막 level 칸에 표시 (나머지 칸은 동일 폭의 invisible spacer).
//
// 사용처:
//   - DisasterPanel (자동 음성 통보 / 재해 문자 전광판 트리)
//   - DropdownPanel (이벤트 검색 트리)
export function LevelIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 20 20"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M8 6V14H16"
        stroke="white"
        strokeOpacity="0.64"
        strokeWidth="1.4"
        strokeDasharray="2 2"
      />
    </svg>
  )
}
