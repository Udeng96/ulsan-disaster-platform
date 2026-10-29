import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Token } from './Token'
import { DropdownPanel, type TreeNode } from './DropdownPanel'
import { Toast } from '@/components/notifications/Toast'
import {
  fetchRegions,
  fetchEventTypes,
  type RegionItem,
  type EventTypeItem,
  type EventSearchParams,
} from '@/api/event'

// 트리 노드 id prefix —
//   지역: "region:all" | "region:{동 id}"
//   이벤트: "event:all" | "event:{종류 id}"
const REGION_ALL_ID = 'region:all'
const EVENT_ALL_ID = 'event:all'
/** 소분류 leaf 키 — 대분류 id 와 겹치지 않게 group 을 붙인다. */
const eventLeafId = (groupId: number, childId: number) =>
  `event:${groupId}:${childId}`
/** 소분류가 없는 대분류('공지/안내')는 그 자체가 leaf. */
const eventGroupId = (groupId: number) => `event:group:${groupId}`

// dropdown 화살표 (활성 시 180 회전)
function DropdownArrow({ open }: { open: boolean }) {
  return (
    <img
      src="/ic/ic_arrow_up_line_normal_white_12.svg"
      alt=""
      width={12}
      height={12}
      style={{
        transform: open ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.2s',
      }}
    />
  )
}

interface FilterRowTokenItem {
  /** 토큰 라벨 (예: "가상시설0480", "화재") */
  label: string
  /** 토큰 제거 클릭 시 (선택 해제). 미지정 시 X 버튼 안 나옴 (예: "전체" 토큰). */
  onRemove?: () => void
}

interface FilterRowProps {
  label: string
  /** 다중 선택 시 각 항목별 토큰. 비어있으면 "전체" placeholder 토큰 1개 표출. */
  tokens: FilterRowTokenItem[]
  /** 0 선택 또는 전체 선택 시 표출할 placeholder 텍스트 (예: "#지역 전체") */
  emptyPlaceholder: string
  data: TreeNode[]
  checked: Set<string>
  onChange: (next: Set<string>) => void
  /** dropdown 열림 — 부모가 hub 로 관리 (한 번에 한 row 만 열리도록). */
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

function FilterRow({
  label,
  tokens,
  emptyPlaceholder,
  data,
  checked,
  onChange,
  isOpen: open,
  onOpenChange,
}: FilterRowProps) {

  // 토큰 overflow 개수 측정.
  // 가드: 실제로 scrollWidth > clientWidth (= 자식 총합 > wrapper 가로) 일 때만 카운트.
  //       그렇지 않으면 sub-pixel 오차로 잘못된 +1 이 표출되는 케이스 방지.
  const tokenWrapperRef = useRef<HTMLDivElement>(null)
  const [overflowCount, setOverflowCount] = useState(0)
  useLayoutEffect(() => {
    const wrapper = tokenWrapperRef.current
    if (!wrapper || tokens.length === 0) {
      setOverflowCount(0)
      return
    }
    // 실제 overflow 없으면 0
    if (wrapper.scrollWidth <= wrapper.clientWidth) {
      setOverflowCount(0)
      return
    }
    const maxW = wrapper.clientWidth
    const children = Array.from(wrapper.children) as HTMLElement[]
    let overflow = 0
    children.forEach((child) => {
      // 1px sub-pixel 허용
      if (child.offsetLeft + child.offsetWidth > maxW + 1) overflow++
    })
    setOverflowCount(overflow)
  }, [tokens])

  return (
    <div
      className="flex items-center"
      style={{ width: '452px', gap: '16px' }}
    >
      {/* 제목 — 점 (3×3 Primary-light) + 텍스트 B5 Neutral-200 / W 68px 고정 */}
      <div
        className="flex shrink-0 items-center whitespace-nowrap"
        style={{
          gap: '4px',
          width: '68px',
          minWidth: '68px',
          maxWidth: '68px',
        }}
      >
        <span
          style={{
            width: '3px',
            height: '3px',
            background: '#42B8FF',
            flexShrink: 0,
          }}
        />
        <span className="text-b5" style={{ color: '#B8C8D6' }}>
          {label}
        </span>
      </div>

      {/* select box (W 358 H 40, padding 4/6/4/4, gap 8, radius 10).
          H 40 = Token (32) + padding (4+4) — 토큰 있을 때/없을 때 동일 높이 유지.
          normal bg #002A54, hover #003060, active(open) bg #002247 + border Primary */}
      <div
        className={`relative flex shrink-0 items-center justify-between rounded-[10px] border transition-colors ${
          open
            ? 'border-[#1EA7FF] bg-[#002247]'
            : 'border-transparent bg-[#002A54] hover:bg-[#003060]'
        }`}
        style={{
          width: '358px',
          height: '40px',
          padding: '4px 6px 4px 4px',
          gap: '8px',
          boxSizing: 'border-box',
        }}
      >
        {/* token wrapper + "+N" indicator
            0개 선택 시: placeholder 토큰 1개 (X 없음).
            1+ 선택 시: 각 선택 항목별 토큰 (X 있음), max-width 272 로 visual overflow 자름.
            잘린 토큰 수만큼 우측에 "+N" badge 표출. */}
        <div className="flex items-center" style={{ gap: '4px' }}>
          {/* token wrapper — gap 4, max-width 272, overflow hidden (가로 넘으면 잘림) */}
          <div
            ref={tokenWrapperRef}
            className="flex shrink-0 flex-nowrap items-center"
            style={{
              gap: '4px',
              maxWidth: '272px',
              overflow: 'hidden',
            }}
          >
            {tokens.length === 0 ? (
              <span
                className="text-b5"
                style={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  padding: '0 4px',
                  whiteSpace: 'nowrap',
                }}
              >
                {emptyPlaceholder}
              </span>
            ) : (
              tokens.map((t) => (
                <Token key={t.label} text={t.label} onRemove={t.onRemove} />
              ))
            )}
          </div>

          {/* "+N" indicator — overflow 발생 시 잘린 토큰 수 표출 */}
          {overflowCount > 0 && (
            <div
              className="flex shrink-0 items-center justify-center"
              style={{
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #42B8FF',
                height: '32px',
                boxSizing: 'border-box',
                color: '#42B8FF',
                fontFamily: 'Pretendard, system-ui, sans-serif',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '16px',
              }}
            >
              +{overflowCount}
            </div>
          )}
        </div>

        {/* dropdown button (28×28, padding 7, arrow) — 우측 */}
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="flex shrink-0 items-center justify-center"
          style={{ width: '28px', height: '28px', padding: '7px' }}
          aria-label={`${label} dropdown`}
        >
          <DropdownArrow open={open} />
        </button>

        {/* active(open) 시 아래 panel */}
        {open && (
          <DropdownPanel
            data={data}
            checked={checked}
            onChange={onChange}
            onClose={() => onOpenChange(false)}
          />
        )}
      </div>
    </div>
  )
}

interface EventSearchFormProps {
  /** 조회 button 클릭 시 — 현재 선택된 filter 로 부모에게 검색 요청 */
  onSearch: (params: EventSearchParams) => void
}

// 이벤트 검색 조건 설정 영역
// — 헤더 (검색 아이콘 + 타이틀)
// — 발생 지역 / 이벤트 유형 dropdown (DB lookup 으로 채움, 단일 선택)
// — 조회 button → onSearch(params) 호출
//
// dropdown 트리 구조 — top-level 은 "전체" (ALL).
//   지역: 전체 ▶ 가상시설0480 / 옥동 / ...
//   이벤트 유형: 전체 ▶ 119-소방 (▶ 화재 / 구급 / 구조 / 기타) / 112-경찰 (▶ ...)
export function EventSearchForm({ onSearch }: EventSearchFormProps) {
  const [regions, setRegions] = useState<RegionItem[]>([])
  const [eventTypes, setEventTypes] = useState<EventTypeItem[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // 다중 선택 (Set<id>) — 옵션 로드 후 "전체 선택" 으로 초기화.
  const [regionChecked, setRegionChecked] = useState<Set<string>>(new Set())
  const [eventChecked, setEventChecked] = useState<Set<string>>(new Set())

  // dropdown 열림 — 한 번에 하나만 (둘이 동시에 열려 겹치는 것 방지).
  const [openRow, setOpenRow] = useState<'region' | 'event' | null>(null)

  // 지역 / 이벤트 종류 옵션 로드 — mount 1회. 로드 후 전체 선택.
  useEffect(() => {
    let alive = true
    // 한쪽이 죽어도 나머지는 살린다 (regions=gis 8081 / event-types=부엉이 8082 별도 서비스).
    Promise.all([
      fetchRegions().catch((err) => {
        console.warn('[event] 행정동 조회 실패', err)
        return [] as Awaited<ReturnType<typeof fetchRegions>>
      }),
      fetchEventTypes().catch((err) => {
        console.warn('[event] 이벤트 종류 조회 실패', err)
        return [] as Awaited<ReturnType<typeof fetchEventTypes>>
      }),
    ])
      .then(([rs, ts]) => {
        if (!alive) return
        setRegions(rs)
        setEventTypes(ts)
        setRegionChecked(
          new Set([REGION_ALL_ID, ...rs.map((r) => `region:${r.id}`)]),
        )
        setEventChecked(
          new Set([
            EVENT_ALL_ID,
            ...ts.flatMap((t) =>
              (t.children ?? []).length > 0
                ? [
                    eventGroupId(t.id),
                    ...(t.children ?? []).map((c) => eventLeafId(t.id, c.id)),
                  ]
                : // 소분류가 없는 대분류는 그 자체가 leaf.
                  [eventGroupId(t.id)],
            ),
          ]),
        )
      })
      .catch((err) => console.warn('[event] 옵션 로드 실패', err))
    return () => {
      alive = false
    }
  }, [])

  const regionTree: TreeNode[] = useMemo(
    () => [
      {
        id: REGION_ALL_ID,
        label: '전체',
        children: regions.map((r) => ({
          id: `region:${r.id}`,
          label: r.name,
        })),
      },
    ],
    [regions],
  )

  const eventTypeTree: TreeNode[] = useMemo(
    () => [
      {
        id: EVENT_ALL_ID,
        label: '전체',
        children: eventTypes.map((t) => {
          const subs = t.children ?? []
          return {
            id: eventGroupId(t.id),
            label: t.name,
            // 소분류가 없으면 children 을 주지 않아 leaf 로 동작하게 한다.
            ...(subs.length > 0
              ? {
                  children: subs.map((c) => ({
                    id: eventLeafId(t.id, c.id),
                    label: c.name,
                  })),
                }
              : {}),
          }
        }),
      },
    ],
    [eventTypes],
  )

  /** 화면의 모든 소분류 leaf (전체 선택 판정 / 토큰 계산 공용). */
  const eventLeaves = useMemo(
    () =>
      eventTypes.flatMap((t) => {
        const subs = t.children ?? []
        if (subs.length === 0) {
          // 소분류 없는 대분류 — 자기 자신이 leaf.
          return [{ key: eventGroupId(t.id), name: t.name, groupId: t.id }]
        }
        return subs.map((c) => ({
          key: eventLeafId(t.id, c.id),
          name: c.name,
          groupId: t.id,
        }))
      }),
    [eventTypes],
  )

  // region 토큰 — 전체 선택이면 "#지역 전체" 1개, 미선택이면 빈 배열 (placeholder),
  //              부분 선택이면 개별 동 토큰.
  const regionTokens = useMemo(() => {
    if (regions.length === 0) return []
    const leaves = regions.filter((r) => regionChecked.has(`region:${r.id}`))
    if (leaves.length === 0) return [] // 미선택 → placeholder

    if (leaves.length === regions.length) {
      // 전체 선택 → "#지역 전체" 토큰 하나 (X 없음)
      return [{ label: '#지역 전체' }]
    }

    // 부분 선택 → 개별 토큰
    return leaves.map((r) => ({
      label: `#${r.name}`,
      onRemove: () => {
        setRegionChecked((prev) => {
          const next = new Set(prev)
          next.delete(`region:${r.id}`)
          next.delete(REGION_ALL_ID)
          return next
        })
      },
    }))
  }, [regionChecked, regions])

  // event 토큰 — 전체 선택이면 "#이벤트 전체" 1개, 미선택이면 빈 배열, 부분 선택이면 개별.
  const eventTokens = useMemo(() => {
    if (eventLeaves.length === 0) return []
    const picked = eventLeaves.filter((l) => eventChecked.has(l.key))
    if (picked.length === 0) return [] // 미선택 → placeholder

    if (picked.length === eventLeaves.length) {
      // 전체 선택 → "#이벤트 전체" 토큰 하나 (X 없음)
      return [{ label: '#이벤트 전체' }]
    }

    // 부분 선택 → 개별 토큰
    return picked.map((l) => ({
      label: `#${l.name}`,
      onRemove: () => {
        setEventChecked((prev) => {
          const next = new Set(prev)
          next.delete(l.key)
          next.delete(EVENT_ALL_ID)
          return next
        })
      },
    }))
  }, [eventChecked, eventLeaves])

  // 선택 Set → API params. 전체 선택이면 빈 배열(= 필터 없음).
  const buildParams = (): EventSearchParams => {
    // 대분류가 통째로 선택되면 typeIds, 일부만 선택되면 그 소분류를 subTypeIds 로.
    const typeIds: number[] = []
    const subTypeIds: number[] = []
    for (const g of eventTypes) {
      const children = g.children ?? []
      if (children.length === 0) {
        // 소분류 없는 대분류 — 체크되면 대분류 id 로 보낸다.
        if (eventChecked.has(eventGroupId(g.id))) typeIds.push(g.id)
        continue
      }
      const picked = children.filter((c) =>
        eventChecked.has(eventLeafId(g.id, c.id)),
      )
      if (picked.length === 0) continue
      if (picked.length === children.length) typeIds.push(g.id)
      else subTypeIds.push(...picked.map((c) => c.id))
    }
    const regionLeaves = regions.filter((r) =>
      regionChecked.has(`region:${r.id}`),
    )
    const regionIds =
      regionLeaves.length === regions.length
        ? []
        : regionLeaves.map((r) => r.id)
    return { typeIds, subTypeIds, regionIds }
  }

  return (
    <div className="flex w-full flex-col" style={{ gap: '12px' }}>
      {/* 헤더 — 아이콘 22×22 + 텍스트 B2, gap 5 */}
      <div className="flex items-center" style={{ gap: '5px' }}>
        <img
          src="/ic/common/ic_document-search_default_line_normal_color_22.svg"
          alt=""
          width={22}
          height={22}
        />
        <span className="text-b2" style={{ color: '#F4F8FB' }}>
          이벤트 검색 조건 설정
        </span>
      </div>

      {/* 검색 조건 선택 wrapper — 지역 + 유형, 내부 gap 8 */}
      <div className="flex w-full flex-col" style={{ gap: '8px' }}>
        {/* 발생 지역 row */}
        <FilterRow
          label="발생 지역"
          tokens={regionTokens}
          emptyPlaceholder="지역을 선택해주세요"
          data={regionTree}
          checked={regionChecked}
          onChange={setRegionChecked}
          isOpen={openRow === 'region'}
          onOpenChange={(o) => setOpenRow(o ? 'region' : null)}
        />

        {/* 이벤트 유형 row */}
        <FilterRow
          label="이벤트 유형"
          tokens={eventTokens}
          emptyPlaceholder="이벤트 유형을 선택해주세요"
          data={eventTypeTree}
          checked={eventChecked}
          onChange={setEventChecked}
          isOpen={openRow === 'event'}
          onOpenChange={(o) => setOpenRow(o ? 'event' : null)}
        />
      </div>

      {/* 조회 button — H 48, radius 99, Primary-dark / hover Primary-light.
          선택 안 된 조건 있으면 toast 띄우고 조회 skip. */}
      <button
        type="button"
        className="event-search-btn"
        onClick={() => {
          // 옵션 자체를 못 받은 경우(해당 서비스 다운)는 그 조건을 건너뛴다 —
          //   선택할 항목이 없는데 '선택해주세요' 로 조회를 막으면 아무것도 못 본다.
          if (regions.length > 0 && regionChecked.size === 0) {
            setToastMessage('지역 조건을 선택해주세요')
            return
          }
          if (eventLeaves.length > 0 && eventChecked.size === 0) {
            setToastMessage('이벤트 유형을 선택해주세요')
            return
          }
          onSearch(buildParams())
        }}
      >
        <img
          src="/ic/ic_search_default_line_normal_white_20.svg"
          alt=""
          width={20}
          height={20}
        />
        <span className="text-b3" style={{ color: '#FFF' }}>
          조회
        </span>
      </button>

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  )
}
