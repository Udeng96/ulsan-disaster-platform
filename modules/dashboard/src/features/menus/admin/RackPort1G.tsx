// 랙 판 부품 — 세번째 칸. 27×9 안에 6px 묶음 4개 + 묶음 사이 간격 1px.

export function RackPort1G() {
  return (
    <div className="rack-1g">
      <span className="rack-1g-label">1G</span>
      <div className="rack-1g-ports" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <div className="rack-1g-pair" key={index}>
            <span className={`rack-1g-led${index < 2 ? ' is-on' : ''}`} />
            <span className={`rack-1g-port${index === 1 ? ' is-on' : ''}`} />
          </div>
        ))}
      </div>
    </div>
  )
}
