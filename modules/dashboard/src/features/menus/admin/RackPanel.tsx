// 랙 판 — 랙 칸 안에 들어가는 장비 앞면 (154×26).
//   판 자체가 배경(#40454B)이고 padding 4 자리까지 칠해져 부속들을 전부 품는다.
//   부속(브랜드 / 포트 묶음 / 타공 …) 은 children 으로 넘기면 gap 2 로 나란히 놓인다.

interface Props {
  children?: React.ReactNode
}

export function RackPanel({ children }: Props) {
  return <div className="admin-rack-panel">{children}</div>
}
