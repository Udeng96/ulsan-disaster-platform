// 랙 판 부품 — 포트 격자 파트. 회색 판(#40454B) 안에 포트를 2행 4열로 놓는다.
//   filled 배열로 칸별 연결 상태를 준다 (없으면 전부 비활성).

import { RackPortWindow } from './RackPortWindow'

const PORT_COUNT = 8

interface Props {
  /** 칸별 연결 상태 — 위 행 왼쪽부터. */
  filled?: boolean[]
}

export function RackPortGrid({ filled = [] }: Props) {
  return (
    <div className="rack-port-grid">
      <div className="rack-port-grid-inner">
        {Array.from({ length: PORT_COUNT }, (_, i) => (
          <RackPortWindow key={i} filled={filled[i] ?? false} />
        ))}
      </div>
    </div>
  )
}
