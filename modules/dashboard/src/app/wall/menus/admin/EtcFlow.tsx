// 기타 탭 — 왼쪽 랙·서버 리스트는 서버 운영과 같고, 오른쪽 장비 상세 자리(1360×672) 전체가 큰 상자 하나 · 그 안에 서버 흐름도 (사용자 10-23).
//   흐름도는 디자인 캡처 그대로 — 위치·색은 캡처에서 재고, 장비 상자 크기(196×46)·줄 높이는 같게 맞춤 (사용자 10-23 '크기 예쁘게 맞춰')
import { Fragment, memo, useState, type ReactNode } from 'react'
import { admin } from './state'

type Kind = 'link' | 'ops' | 'store' | 'ext'

/** 종류별 테두리 · 바탕 (캡처에서 뽑음). 바탕은 조금 비쳐서 통신 빗금이 보이게 */
const KIND: Record<Kind, { stroke: string; fill: string }> = {
  link: { stroke: 'var(--color-admin-5dbb63)', fill: 'var(--color-admin-rgba-42-74-70-0-9)' },
  ops: { stroke: 'var(--color-admin-5b8fe0)', fill: 'var(--color-admin-rgba-38-60-108-0-9)' },
  store: { stroke: 'var(--color-admin-ead140)', fill: 'var(--color-admin-rgba-66-70-60-0-9)' },
  ext: { stroke: 'var(--color-admin-8c9bb5)', fill: 'var(--color-admin-2b3956)' },
}

const W = 196
const H = 46

/** 장비 상자 — 번호 동그라미(지름 26) + 이름. x·y 는 상자 왼쪽 위 */
const DEVICES: { no: number; name: string; kind: Kind; x: number; y: number }[] = [
  { no: 12, name: '(연계) 외부', kind: 'link', x: 120, y: 86 },
  { no: 13, name: '(전파) 상황전파메신저', kind: 'ext', x: 120, y: 292 },
  { no: 11, name: '(연계) 외부망', kind: 'link', x: 120, y: 371 },
  { no: 10, name: '(연계) 내부망', kind: 'link', x: 120, y: 450 },
  { no: 9, name: '(연계) 내부', kind: 'link', x: 390, y: 86 },
  { no: 6, name: '(운영) IoT', kind: 'ops', x: 390, y: 165 },
  { no: 8, name: '(연계) CCTV', kind: 'link', x: 390, y: 387 },
  { no: 5, name: '(운영) 대시보드', kind: 'ops', x: 635, y: 234 },
  { no: 7, name: '(운영) GIS', kind: 'ops', x: 635, y: 387 },
  { no: 4, name: '(운영) 솔루션', kind: 'ops', x: 870, y: 234 },
  { no: 3, name: '(저장) 데이터베이스', kind: 'store', x: 870, y: 387 },
]

/** 바깥 상자 — 외부망·다누시스·행안부는 92 폭, Wall 은 장비 상자 크기 */
const OUTSIDE: { lines: string[]; x: number; y: number; w: number }[] = [
  { lines: ['외부망'], x: 0, y: 86, w: 92 },
  { lines: ['다누시스', 'CCTV'], x: 0, y: 201, w: 92 },
  { lines: ['행안부', '부엉이'], x: 0, y: 292, w: 92 },
  { lines: ['Wall'], x: 1099, y: 86, w: W },
]

/** 화살표 [x1, y1, x2, y2] — 상자 가장자리끼리 */
const ARROWS: [number, number, number, number][] = [
  [92, 109, 118, 109],
  [316, 109, 338, 109],
  [92, 224, 338, 224],
  [92, 315, 118, 315],
  [218, 338, 218, 369],
  [218, 417, 218, 448],
  [316, 473, 338, 473],
  [364, 257, 633, 257],
  [364, 410, 388, 410],
  [586, 410, 633, 410],
  [831, 410, 868, 410],
  [588, 126, 628, 244],
  [831, 257, 868, 257],
  [968, 280, 968, 385],
  [829, 282, 875, 385],
  [865, 385, 819, 282],
]

const LINE = 'var(--color-admin-b4c2d9)'

/** 끝이 열린 화살촉 */
function Head({ x1, y1, x2, y2, color, size = 7, width = 1.2 }: { x1: number; y1: number; x2: number; y2: number; color: string; size?: number; width?: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  const p = (d: number) => `${x2 - size * Math.cos(a + d)},${y2 - size * Math.sin(a + d)}`
  return <polyline points={`${p(0.5)} ${x2},${y2} ${p(-0.5)}`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
}

function Arrow({ x1, y1, x2, y2, color = LINE, width = 1.2, dash, size }: { x1: number; y1: number; x2: number; y2: number; color?: string; width?: number; dash?: string; size?: number }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />
      <Head x1={x1} y1={y1} x2={x2} y2={y2} color={color} width={width} size={size} />
    </g>
  )
}

/** 번호 동그라미 — 바탕 var(--color-admin-13213f) · 테두리 var(--color-admin-3a5a91) · 숫자 var(--color-admin-6fa8ff) 굵게 */
function No({ cx, cy, no, r = 13 }: { cx: number; cy: number; no: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="var(--color-admin-13213f)" stroke="var(--color-admin-3a5a91)" strokeWidth="1" />
      <text x={cx} y={cy} textAnchor="middle" dy="0.35em" fill="var(--color-admin-6fa8ff)" fontSize={r > 10 ? 14 : 12} fontWeight="700">
        {no}
      </text>
    </g>
  )
}

/** 방화벽 — 24 폭 경고 빗금 (주황 var(--color-admin-eb9b3a) · 진갈색 var(--color-admin-3a2510) 6 씩, 45°) — 벽돌 그림 대신 (사용자 10-23 A안) */
function Barrier({ x, y, h }: { x: number; y: number; h: number }) {
  return <rect x={x} y={y} width={24} height={h} rx="3" fill="url(#etc-barrier)" stroke="var(--color-admin-eb9b3a)" strokeWidth="1" />
}

/** 랙·서버 리스트에 마우스를 올린 장비를 흐름도에서 강조 — 테두리 굵게 · 같은 색으로 빛 (사용자 10-23) */
const glow = (on: boolean, color: string) => (on ? { filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 2px ${color})` } : undefined)

function FlowDrawing() {
  const hover = admin.use((s) => s.hover)
  return (
    <svg width="1320" height="530" viewBox="0 0 1320 530" className="shrink-0 font-['Pretendard',Roboto,sans-serif]" role="img" aria-label="서버 흐름도 그림">
      <defs>
        <pattern id="etc-barrier" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="12" fill="var(--color-admin-eb9b3a)" />
          <rect x="6" width="6" height="12" fill="var(--color-admin-3a2510)" />
        </pattern>
        <pattern id="etc-hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="16" stroke="var(--color-admin-3f5f8f)" strokeWidth="1" />
        </pattern>
      </defs>
      {/* 통신(스위칭 허브) 빗금 영역 */}
      <rect x="364" y="38" width="716" height="490" rx="12" fill="url(#etc-hatch)" stroke={hover === 2 ? 'var(--color-admin-8fb0d0)' : 'var(--color-admin-3f5f8f)'} strokeWidth={hover === 2 ? 2 : 1} />
      <rect x="880" y="49" width="190" height="31" rx="8" fill="url(#etc-hatch)" stroke={hover === 2 ? 'var(--color-admin-c8d6ea)' : 'var(--color-admin-5e6e8c)'} strokeWidth={hover === 2 ? 2 : 1} style={glow(hover === 2, 'var(--color-admin-8fb0d0)')} />
      <No cx={897} cy={64.5} no={2} r={10} />
      <text x={914} y={64.5} dy="0.35em" fill="white" fontSize="12" fontWeight="700">
        (통신) 스위칭 허브
      </text>
      {/* 방화벽 이름표 + 벽돌 */}
      <rect x="256" y="2" width="168" height="30" rx="8" fill="var(--color-admin-3a353b)" stroke="var(--color-admin-e8963a)" strokeWidth={hover === 1 ? 2.5 : 1.5} style={glow(hover === 1, 'var(--color-admin-eb9b3a)')} />
      <No cx={273} cy={17} no={1} r={10} />
      <text x={290} y={17} dy="0.35em" fill="white" fontSize="12" fontWeight="700">
        (보안) 방화벽
      </text>
      <g style={glow(hover === 1, 'var(--color-admin-eb9b3a)')}>
        <Barrier x={340} y={38} h={490} />
      </g>
      {/* 선 */}
      {ARROWS.map(([x1, y1, x2, y2]) => (
        <Arrow key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
      ))}
      <Arrow x1={588} y1={204} x2={628} y2={248} color="var(--color-admin-f2d23a)" width={2} dash="5 4" />
      <Arrow x1={835} y1={246} x2={1095} y2={116} color="var(--color-admin-6cd4ff)" width={4} size={12} />
      {/* 장비 상자 */}
      {DEVICES.map((d) => (
        <g key={d.no} style={glow(hover === d.no, KIND[d.kind].stroke)}>
          <rect x={d.x} y={d.y} width={W} height={H} rx="10" fill={KIND[d.kind].fill} stroke={KIND[d.kind].stroke} strokeWidth={hover === d.no ? 3 : 1.5} />
          <No cx={d.x + 27} cy={d.y + H / 2} no={d.no} />
          <text x={d.x + 50} y={d.y + H / 2} dy="0.35em" fill="white" fontSize="14" fontWeight="700">
            {d.name}
          </text>
        </g>
      ))}
      {OUTSIDE.map((o) => (
        <g key={o.lines.join()}>
          <rect x={o.x} y={o.y} width={o.w} height={H} rx="10" fill={KIND.ext.fill} stroke={KIND.ext.stroke} strokeWidth="1.5" />
          {o.lines.map((t, i) => (
            <text key={t} x={o.x + o.w / 2} y={o.y + H / 2 + (i - (o.lines.length - 1) / 2) * 18} textAnchor="middle" dy="0.35em" fill="white" fontSize="14" fontWeight="700">
              {t}
            </text>
          ))}
        </g>
      ))}
    </svg>
  )
}

/** 범례 — 캡처 순서대로, 글씨 13 굵게 흰색 */
function Swatch({ kind }: { kind: Kind }) {
  return <span className="size-4 rounded-[4px] border-[1.5px]" style={{ borderColor: KIND[kind].stroke, background: KIND[kind].fill }} />
}

const LEGEND: { label: string; icon: ReactNode }[] = [
  {
    label: '보안',
    icon: (
      <svg width="24" height="12" viewBox="0 0 24 12" aria-hidden>
        <defs>
          <pattern id="etc-barrier-legend" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="8" fill="var(--color-admin-eb9b3a)" />
            <rect x="4" width="4" height="8" fill="var(--color-admin-3a2510)" />
          </pattern>
        </defs>
        <rect x="0.5" y="0.5" width="23" height="11" rx="2" fill="url(#etc-barrier-legend)" stroke="var(--color-admin-eb9b3a)" />
      </svg>
    ),
  },
  {
    label: '통신 (해치 영역)',
    icon: (
      <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden>
        <rect x="0.5" y="0.5" width="25" height="15" fill="none" stroke="var(--color-admin-5e6e8c)" />
        <path d="M2 15L15 2M11 15L24 2" stroke="var(--color-admin-5e6e8c)" />
      </svg>
    ),
  },
  { label: '연계', icon: <Swatch kind="link" /> },
  { label: '운영', icon: <Swatch kind="ops" /> },
  { label: '저장', icon: <Swatch kind="store" /> },
  { label: '외부·전파', icon: <Swatch kind="ext" /> },
  { label: '상황판 표출', icon: <span className="h-[3px] w-9 rounded-full bg-[var(--color-admin-6cd4ff)]" /> },
  {
    label: '미확인 경로',
    icon: (
      <svg width="28" height="3" viewBox="0 0 28 3" aria-hidden>
        <path d="M0 1.5H28" stroke="var(--color-admin-f2d23a)" strokeWidth="2.5" strokeDasharray="6 5" />
      </svg>
    ),
  },
]

/** 용어 설명 — 디자인 캡처 (사용자 10-23). CCTV 줄 '다누시스 VMS', 범례 '가는 흰선' 줄 'ESE 구성현황' 은 캡처에서 마우스에 가려 어림 */
const GLOSSARY: { title: string; rows: [string, string][] }[] = [
  {
    title: '대분류',
    rows: [
      ['보안', '밖에서 들어오는 것을 검사하고 차단하는 장비'],
      ['통신', '랙 안 장비를 서로 잇는 선. 구성도의 해치 영역은 2 스위칭 허브에 직결된 구간이다'],
      ['연계', '랙 밖 다른 기관·다른 망과 자료를 주고받는 서버·장비'],
      ['운영', '실제 업무 앱이 돌아가는 서버'],
      ['저장', '모든 데이터가 최종적으로 쌓이는 곳'],
      ['전파', '상황을 담당자에게 알리는 시스템. 행정망에 있다'],
    ],
  },
  {
    title: '데이터 흐름 (ESE 데이터 처리 현황 기준)',
    rows: [
      ['날씨·배경맵', '기상청·Vworld(외부망) → 12 (연계) 외부 → 5 (운영) 대시보드 API 처리 모듈 → 3 (저장) 데이터베이스 → 5 (운영) 대시보드 화면단'],
      ['급경사지', '공공데이터포털(외부망) → 12 (연계) 외부 → 5 API 처리 모듈 → 3 (저장) 데이터베이스 → 5 화면단. 급경사지 DB(행정망)는 5 API 처리 모듈로 직접 들어온다'],
      ['지진', '지진 DB·지진 API → 9 (연계) 내부 → 5 API 처리 모듈 → 3 (저장) 데이터베이스 → 5 화면단'],
      ['CCTV', '다누시스 VMS(관제망) → 8 (연계) CCTV 수집 → 7 (운영) GIS WebRTC 변환 → 3 (저장) 데이터베이스 → 5 화면단(play)'],
      ['부엉이', '행안부 부엉이 API → 13 (전파) 상황전파메신저(행정망) → 5 API 처리 모듈 → 3 (저장) 데이터베이스 → 5 화면단'],
      ['재난예경보', '역방향 흐름. 3 (저장) 데이터베이스 → 5 화면단 → 4 (운영) 솔루션 권한 부여·확인 → 12 (연계) 외부 → 전광판·음성통보(외부망). 4는 같은 내용을 3에도 기록한다'],
    ],
  },
  {
    title: '망 경계',
    rows: [
      ['12 (연계) 외부', 'CCTV 통합관제센터의 DMZ에 있다. 그 센터의 망연계·방화벽·백본을 거쳐 1 (보안) 방화벽으로 들어온다. 우리 랙의 10·11과는 다른 장비다'],
      ['11 · 10', '행정망(남구청)과 재난플랫폼망 사이의 망연계 한 세트. 13 (전파) 상황전파메신저가 이 뒤에 있다'],
      ['9 (연계) 내부', '2 (통신) 스위칭 허브에 직결. 지진 데이터 담당'],
      ['망연계', '공공기관은 업무망과 인터넷망을 법으로 물리적으로 끊어야 한다. 끊어진 두 망 사이에 자료만 통과시키는 전용 장비가 망연계이며 보통 2대 한 세트다'],
      ['Wall', '상황판(IP Wall). 5 (운영) 대시보드 화면단이 여기로 표출된다'],
    ],
  },
  {
    title: '미확인 — ESE 확인 대상',
    rows: [['6 (운영) IoT', '정보시스템 목록 비고에 "펌프장 데이터 (연계)"라고만 적혀 있고, 데이터 처리 현황 장표에 경로가 없다. 어느 서버를 거쳐 3 (저장) 데이터베이스에 들어가는지 확인 필요']],
  },
  {
    title: '범례',
    rows: [
      ['가는 흰선', '확정 경로. ESE 구성현황·데이터 처리 현황 근거'],
      ['굵은 하늘색선', '5 (운영) 대시보드 → Wall 상황판 표출'],
      ['굵은 노란 점선', '미확인 경로'],
    ],
  },
]

const GMARKET = "font-['GmarketSans','Noto_Sans_KR',sans-serif]"

/** ▴ 닫힘 · ▾ 열림, var(--color-admin-4da3ff) */
function Caret({ open }: { open: boolean }) {
  return <span className="text-[color:var(--color-admin-4da3ff)]">{open ? '▾' : '▴'}</span>
}

/** 용어 설명 — 예제 원본 CSS (관리자 스레드 정리 admin-work/popup-css/용어설명-팝업-CSS.md, 사용자 10-23).
 *  동작은 장비 상세 '자산 대장' 팝업과 같음 (사용자 10-23): 아래 막대는 늘 보이고 ▴/▾ 로 여닫음, 팝업은 막대 위까지(아래 66), 제목 줄·Esc 로 닫힘.
 *  닫힘 막대: 높이 40 · 둥글기 10 · 바탕 var(--color-admin-0a1830) · 테두리 var(--color-admin-rgba-100-160-230-28) (올리면 var(--color-admin-4da3ff)) · 여백 0 12 · 상자 끝에서 10 · 14 굵게 흰색.
 *  팝업: 상자 기준 위 58 · 좌우 12 · 아래 12, 바탕 var(--color-admin-rgba-13-31-60-98) · 테두리 var(--color-admin-rgba-100-160-230-4) · 둥글기 12 · 그림자 0 -8 30 · 여백 12·14 · 사이 8, 아래서 올라옴(fw-slide).
 *  제목 줄 28 (누르면 닫힘, 아래 선 흰 10%). 내용은 130px 용어 / 설명 2칸 표, 사이 2·10, 세로 스크롤 (스크롤바 6 · var(--color-admin-rgba-77-163-255-35)).
 *  묶음 제목 13 굵게 var(--color-admin-4da3ff) · 위 10 아래 2, 용어 13 var(--color-admin-8fb0d0) · 설명 14 흰색, 둘 다 위아래 3 · 아래 선 흰 6% · 줄높이 1.5 */
function Glossary() {
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen(!open)
  const cell = 'border-b border-white/[0.06] py-[3px] leading-[1.5] break-words'
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className={`mt-auto flex h-10 w-full shrink-0 cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--color-admin-rgba-100-160-230-0-28)] bg-[var(--color-admin-0a1830)] px-3 text-[14px] font-bold text-white hover:border-[var(--color-admin-4da3ff)] ${GMARKET}`}
      >
        용어 설명
        <Caret open={open} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="용어 설명"
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          className="absolute top-[58px] right-3 bottom-[66px] left-3 z-[5] flex animate-fw-slide flex-col gap-2 rounded-xl border border-[var(--color-admin-rgba-100-160-230-0-4)] bg-[var(--color-admin-rgba-13-31-60-0-98)] px-3.5 py-3 shadow-[0_-8px_30px_var(--color-admin-rgba-0-0-0-0-5)]"
        >
          <button type="button" autoFocus onClick={toggle} className={`flex h-7 shrink-0 cursor-pointer items-center gap-2 border-b border-white/10 text-[14px] font-bold text-white ${GMARKET}`}>
            용어 설명
            <Caret open />
          </button>
          <dl className="grid min-h-0 flex-1 grid-cols-[130px_1fr] content-start gap-x-2.5 gap-y-0.5 overflow-x-hidden overflow-y-auto [scrollbar-color:var(--color-admin-rgba-77-163-255-0-35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--color-admin-rgba-77-163-255-0-35)]">
            {GLOSSARY.map((g) => (
              <Fragment key={g.title}>
                <div className="col-span-full pt-2.5 pb-0.5 text-[13px] font-bold text-[color:var(--color-admin-4da3ff)]">■ {g.title}</div>
                {g.rows.map(([term, desc]) => (
                  <Fragment key={term}>
                    <dt className={`${cell} text-[13px] text-[color:var(--color-admin-8fb0d0)]`}>{term}</dt>
                    <dd className={`${cell} min-w-0 text-[14px] text-white`}>{desc}</dd>
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </dl>
        </div>
      )}
    </>
  )
}

/** 큰 상자 — 장비 상세 상자들과 같은 틀 (둥글기 16, 바탕 neutral-600, 여백 20). 흐름도 · 범례 · 용어 설명 줄 */
export const EtcFlow = memo(function EtcFlow() {
  return (
    <section aria-label="서버 흐름도" className="relative flex h-[672px] w-[1360px] shrink-0 flex-col items-center gap-4 rounded-2xl bg-neutral-600 p-5 font-['Pretendard',Roboto,sans-serif]">
      <FlowDrawing />
      <div aria-label="흐름도 범례" className="flex items-center gap-8">
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-2.5 text-[13px] font-bold text-white">
            {l.icon}
            {l.label}
          </span>
        ))}
      </div>
      <Glossary />
    </section>
  )
})
