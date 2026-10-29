// 랙 판 부품 — 타공 면. 점 줄을 세로로 쌓는다 (줄마다 개수가 엇갈린다).

/** 줄별 점 개수 — 위에서부터. */
const ROWS = [7, 6, 7, 6]

export function RackVent() {
  return (
    <div className="rack-vent">
      {ROWS.map((n, r) => (
        <div key={r} className={`rack-vent-row ${r % 2 === 0 ? 'is-odd' : 'is-even'}`}>
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className="rack-vent-dot" />
          ))}
        </div>
      ))}
    </div>
  )
}
