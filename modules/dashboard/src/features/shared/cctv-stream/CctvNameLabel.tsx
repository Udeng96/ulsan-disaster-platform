// CCTV 헤더 이름 라벨 — 한 줄 고정. 헤더 폭을 넘으면 말줄임(…) 처리.

interface Props {
  name: string
  /** 글자 크기 (헤더 크기별로 다름). */
  fontSize: string
  /** baseline 보정값 (default 1px). 배지 없는 헤더는 더 내려야 중앙에 맞는다. */
  top?: string
}

export function CctvNameLabel({ name, fontSize, top = '1px' }: Props) {
  return (
    <span
      title={name}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        color: '#FFF',
        fontFamily: 'Roboto',
        fontSize,
        fontWeight: 500,
        lineHeight: 1,
        // 배지 박스 중심과 글자 잉크 중심이 1px 어긋남 (한글이 위로 뜸) — 보정.
        position: 'relative',
        top,
      }}
    >
      {name}
    </span>
  )
}
