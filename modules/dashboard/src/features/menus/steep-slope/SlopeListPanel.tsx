// 급경사지 총괄·관제 — 우측 내용 패널 본문 (568×617.461).
//   검색 (48) → 검색 결과 요약 (18) → 결과 목록 (483.461), gap 12.
//   목록은 헤더 + 스크롤 영역, 항목 526 (좌우 padding 16, 셀 합 494).

import { useEffect, useMemo, useRef, useState } from 'react'
import { useManagedAreas } from './useManagedAreas'

import { GRADE_COLOR } from './variants'

// 등급 배지 배경 — 단계 색 70% 를 흰 바탕에 얹은 시안 규격.
function gradeBackground(color: string): string {
  return `linear-gradient(0deg, ${color}B3 0%, ${color}B3 100%), #FFF`
}

// 드롭다운이 달리는 헤더 컬럼.
type FilterKey = 'grade' | 'agency' | 'dept'

// 필터 옵션 — '전체' + 중복 제거한 값 (빈 값 제외).
function distinct(values: (string | null)[]): string[] {
  const set = new Set<string>()
  for (const v of values) {
    const t = v?.trim()
    if (t) set.add(t)
  }
  return ['전체', ...[...set].sort()]
}

// 등급 필터 — '전체' + A~E.
const GRADES = ['전체', 'A', 'B', 'C', 'D', 'E'] as const

interface Props {
  /** 검색 결과 문구의 등급 표기 override (미지정 시 선택된 등급). */
  gradeLabel?: string
  /** 항목 클릭 — 지도 이동/강조는 부모가 처리. 재클릭(해제) 시 null. */
  onSelectRow?: (area: { name: string; lng: number; lat: number; managedAreaId: number } | null) => void
  selectedAreaId?: number | null
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <g filter="url(#slope-search-shadow)">
        <path
          d="M9.86523 2.75098C13.4444 2.93254 16.291 5.89232 16.291 9.5166L16.2822 9.86523C16.2085 11.3189 15.6759 12.6513 14.8271 13.7217L17.8105 16.7061C18.1155 17.0112 18.1156 17.5055 17.8105 17.8105C17.5055 18.1156 17.0112 18.1155 16.7061 17.8105L13.7217 14.8271C12.5663 15.7433 11.1055 16.291 9.5166 16.291L9.16797 16.2822C5.70414 16.1068 2.92668 13.329 2.75098 9.86523L2.74219 9.5166C2.74219 5.77532 5.77532 2.74219 9.5166 2.74219L9.86523 2.75098ZM9.5166 4.4043C6.69349 4.4043 4.4043 6.69349 4.4043 9.5166C4.40442 12.3396 6.69356 14.6279 9.5166 14.6279C12.3395 14.6278 14.6278 12.3395 14.6279 9.5166C14.6279 6.69356 12.3396 4.40442 9.5166 4.4043Z"
          fill="white"
        />
      </g>
      <defs>
        <filter
          id="slope-search-shadow"
          x="1.24219"
          y="1.24219"
          width="18.2969"
          height="18.2969"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="0.75" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.16 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  )
}

function CaretIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M8.5 11.0938L12 14.5938L15.5 11.0938"
        stroke="#DCE6EE"
        strokeWidth="1.3125"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SlopeListPanel({ gradeLabel, onSelectRow, selectedAreaId }: Props) {
  const areas = useManagedAreas()
  // 입력값과 적용된 검색어를 분리 — 엔터 / 검색 버튼으로만 필터가 걸린다.
  const [input, setInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [grade, setGrade] = useState<string>('전체')
  // 선택된 항목 — 지도 마커 강조와 짝 (id 기준).
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const activeId = selectedAreaId === undefined ? selectedId : selectedAreaId
  const [org, setOrg] = useState<string>('전체')
  const [dept, setDept] = useState<string>('전체')

  // 관리기관 옵션 — 응답 값에서 중복 없이 (빈 값 제외).
  const orgOptions = useMemo(() => distinct(areas.map((a) => a.org)), [areas])
  // 관리부서 옵션 — 선택된 관리기관의 부서만. 기관 미선택('전체')이면 전부.
  const deptOptions = useMemo(
    () =>
      distinct(
        areas
          .filter((a) => org === '전체' || a.org === org)
          .map((a) => a.department),
      ),
    [areas, org],
  )
  // 기관을 바꿔서 현재 부서가 목록에 없어지면 부서 필터 해제.
  useEffect(() => {
    if (dept !== '전체' && !deptOptions.includes(dept)) setDept('전체')
  }, [deptOptions, dept])
  // 급경사지명 / 관리번호 부분 일치.
  const rows = useMemo(() => {
    const kw = keyword.trim()
    return areas.filter(
      (a) =>
        (grade === '전체' || a.grade === grade) &&
        (org === '전체' || a.org === org) &&
        (dept === '전체' || a.department === dept) &&
        (!kw || a.name.includes(kw) || a.mgmtNo.includes(kw)),
    )
  }, [areas, keyword, grade, org, dept])
  // 헤더 필터 레이어 열림 — 한 번에 하나만. 바깥 클릭 시 닫힘.
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null)
  const toggle = (key: FilterKey) =>
    setOpenFilter((prev) => (prev === key ? null : key))
  const headRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!openFilter) return
    const onDown = (e: MouseEvent) => {
      if (!headRef.current?.contains(e.target as Node)) setOpenFilter(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [openFilter])

  const filterLayer = (
    options: readonly string[],
    selected: string,
    onSelect: (v: string) => void,
    variant?: string,
  ) => (
    <div className={`slope-filter-layer ${variant ?? ''}`}>
      <div className="slope-filter-options">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            className={`slope-filter-option ${o === selected ? 'is-active' : ''}`}
            onClick={() => {
              onSelect(o)
              setOpenFilter(null)
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )

  const headCell = (
    label: string,
    width: number,
    key?: FilterKey,
    layer?: React.ReactNode,
  ) => (
    <div
      className="slope-list-cell"
      style={{ width, position: 'relative' }}
    >
      {/* 라벨과 caret 은 붙어 있어야 한다 — 라벨을 늘리지 않는다. */}
      <span>{label}</span>
      {key && (
        <button
          type="button"
          className={`slope-list-caret ${openFilter === key ? 'is-open' : ''}`}
          onClick={() => toggle(key)}
        >
          <CaretIcon />
        </button>
      )}
      {key && openFilter === key && layer}
    </div>
  )

  return (
    <div className="slope-list-body">
      {/* 검색 */}
      <div className="slope-list-search">
        <input
          className="slope-list-search-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setKeyword(input)
          }}
          placeholder="급경사지 검색"
        />
        <button
          type="button"
          className="slope-list-search-btn"
          onClick={() => setKeyword(input)}
        >
          <SearchIcon />
        </button>
      </div>

      {/* 검색 결과 요약 — 등급 필터 + 표출 개소. */}
      <div className="slope-list-count">
        <span>
          {gradeLabel ?? grade}등급 {rows.length}개소 표시 중
        </span>
      </div>

      {/* 결과 목록 */}
      <div className="slope-list">
        <div className="slope-list-head" ref={headRef}>
          {headCell('급경사지명', 128)}
          {headCell('등급', 65, 'grade', filterLayer(GRADES, grade, setGrade))}
          {headCell(
            '관리기관',
            158,
            'agency',
            filterLayer(
              orgOptions,
              org,
              (v) => {
                setOrg(v)
                // 기관을 '전체' 로 되돌리면 등급 필터도 초기화 (검색 조건 리셋).
                if (v === '전체') setGrade('전체')
              },
              'is-auto',
            ),
          )}
          {headCell(
            '관리부서',
            134,
            'dept',
            filterLayer(deptOptions, dept, setDept, 'is-auto is-right'),
          )}
        </div>
        <div className="slope-list-scroll">
          {/* 조건에 맞는 결과 없음 — 이벤트 목록과 같은 placeholder 스타일. */}
          {rows.length === 0 && (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                color: 'rgba(255, 255, 255, 0.45)',
                fontFamily: 'Roboto',
                fontSize: '16px',
                fontWeight: 500,
              }}
            >
              검색 조건에 해당하는 결과가 없습니다
            </div>
          )}
          {rows.map((r) => (
            <div
              key={r.id}
              className={`slope-list-row ${r.id === activeId ? 'is-active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                // 같은 항목을 다시 누르면 선택 해제.
                const next = r.id === activeId ? null : r.id
                setSelectedId(next)
                // 좌표 없는 건은 지도 이동 대상이 아니다 (lat/lng nullable).
                onSelectRow?.(
                  next === null || r.lat === null || r.lng === null
                    ? null
                    : { name: r.name, lng: r.lng, lat: r.lat, managedAreaId: r.id },
                )
              }}
            >
              {/* 급경사지명 — 셀 폭 넘치면 말줄임. */}
              <div className="slope-list-cell" style={{ width: 138 }}>
                <span className="cell-text" title={r.name}>
                  {r.name}
                </span>
              </div>
              <div className="slope-list-cell is-grade" style={{ width: 65 }}>
                <span
                  className="slope-grade-badge"
                  style={{
                    background: gradeBackground(
                      (r.grade && GRADE_COLOR[r.grade]) ?? '#1EA7FF',
                    ),
                  }}
                >
                  {/* 배지 중앙보다 살짝 위로 떠 보여서 1px 내림. */}
                  <span style={{ position: 'relative', top: '1px' }}>
                    {r.grade}
                  </span>
                </span>
              </div>
              {/* 관리기관 / 관리부서 — 셀 폭 넘치면 말줄임. */}
              <div className="slope-list-cell" style={{ width: 158 }}>
                <span className="cell-text" title={r.org ?? ''}>
                  {r.org}
                </span>
              </div>
              <div className="slope-list-cell" style={{ width: 134 }}>
                <span className="cell-text" title={r.department ?? ''}>
                  {r.department}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
