// CCTV 관리 (관리자 전용, PC).
//   상단: 관리자 화면 메뉴 (지금은 '메인' 하나 — CCTV 분류)
//   좌:   목록 (검색 / 분류 필터)
//   우:   선택한 카메라 — 영상 재생 확인 · 지도 위치 · 정보 · 분류 지정
//
// 저장은 cctv-sync(/cctv-sync/api/cctv/...) — 저장이 성공해야 목록에 반영된다.
// 재해문자전광판은 전광판 1개 ↔ CCTV 1대 연결을 따로 관리한다 (/cctv-sync/api/signboard-cctv).

import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchCctvList, type CctvFacility, type CctvItem } from '@/api/cctv'
import {
  addCctvMapps,
  CctvSyncError,
  deleteCctvMapp,
  fetchSignboardCctv,
  linkSignboardCctv,
  saveCctvMapps,
} from '@/api/cctvSync'
import { fetchDisasterBoards } from '@/api/facility'
import {
  fetchCctvHistory,
  type CctvHistoryItem,
  type CctvHistoryType,
} from '@/api/cctvHistory'

/** 이력 리스트 한 페이지 크기. */
const HISTORY_PAGE_SIZE = 25
/** 전체 이력의 3파트에 미리 보여줄 개수. */
const HISTORY_PART_SIZE = 50
import { CctvPlayer } from '@/features/shared/cctv-stream/CctvPlayer'
import { AdminCctvMiniMap } from './AdminCctvMiniMap'
import { AdminCctvMap } from './AdminCctvMap'
import { CLASSIFICATIONS, CLFY_COLOR, LABEL_BY_CODE } from './classification'
import {
  distanceM,
  fetchAllFacilityPoints,
  fetchFacilityPoints,
  type FacilityPoint,
  type FacilityPointOf,
} from './facilityPoints'

/** 시설물 탭 지도·플레이어 크기 — 16:9. 둘을 세로로 쌓아도 1080 화면에서 스크롤 없이 들어가는 크기. */
const MEDIA_W = 704
const MEDIA_H = 396

/** 이력 기간 — 자정 배치 기록은 최대 30일까지 남는다. */
const HISTORY_RANGES: { label: string; days: number }[] = [
  { label: '오늘', days: 1 },
  { label: '일주일', days: 7 },
  { label: '한달', days: 30 },
]

/** 이력 종류 탭. code '' 는 전체. */
const HISTORY_TABS: { code: '' | CctvHistoryType; label: string }[] = [
  { code: '', label: '전체 이력' },
  { code: 'NEW', label: '등록 이력' },
  { code: 'UP', label: '수정 이력' },
  { code: 'DEL', label: '삭제 이력' },
]

const HISTORY_LABEL: Record<CctvHistoryType, string> = {
  NEW: '등록',
  UP: '수정',
  DEL: '삭제',
}

/** YYYY-MM-DD */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/** 일괄 등록 후보를 좁히는 반경 (m) — null 은 제한 없음. */
const RADIUS_OPTIONS: { value: number | null; label: string }[] = [
  { value: 200, label: '200m' },
  { value: 500, label: '500m' },
  { value: 1000, label: '1km' },
  { value: null, label: '전체' },
]

/** 목록에 한 번에 그리는 최대 개수 — 1,500건을 전부 그리면 스크롤이 무겁다. */
const LIST_LIMIT = 300

/** 이력 탭 노출 여부 — 기능 테스트 완료 후 true 로 되돌린다. */
const SHOW_HISTORY_TAB = false

/** 상단 메뉴 — 관리자 화면 단위. 화면이 늘어나면 여기에 추가한다. */
const MENUS: { code: string; label: string }[] = [
  { code: 'CCTV_CLASSIFY', label: '메인' },
  { code: 'FACILITY', label: '시설물' },
  ...(SHOW_HISTORY_TAB ? [{ code: 'HISTORY', label: '이력' }] : []),
]

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

/** 저장된 분류 — 서버 값(상위·하위 쌍 목록). 목록(뱃지·필터)은 이것만 본다. */
type ClassMap = Record<string, CctvFacility[]>

/** 편집 중인 분류 — 저장 전에는 목록에 반영되지 않는다. */
type Draft = CctvFacility[]

const EMPTY: Draft = []

const pairKey = (f: CctvFacility) => `${f.facClfy}/${f.facSubClfy ?? ''}`

/** 분류가 하나도 없으면 '해당 없음'(ETC) 과 같은 상태 — 비교할 때 둘을 같게 본다. */
const withoutEtc = (d: Draft) => d.filter((f) => f.facClfy !== 'ETC')

/** 상세 칩에 보여줄 값 — 서버가 빈 배열(미분류)이면 '해당 없음' 이 켜진 것으로 표시. */
const toDraft = (saved: Draft): Draft =>
  saved.length > 0 ? saved : [{ facClfy: 'ETC', facSubClfy: null }]

function samePairs(a: Draft, b: Draft): boolean {
  const ka = a.map(pairKey)
  const kb = b.map(pairKey)
  return ka.length === kb.length && ka.every((k) => kb.includes(k))
}

/** 화면 분류 → cctv-sync 배정. 서버는 하위가 필수다.
 *    '해당 없음'(ETC) 은 빈 배정, 지진가속도 상위만 고르면 하위 NONE.
 *    그 외 상위만 고른 경우는 저장할 수 없다 — 사용자에게 보여줄 문구를 돌려준다. */
function toMapps(d: Draft): CctvFacility[] | string {
  const out: CctvFacility[] = []
  for (const f of withoutEtc(d)) {
    if (f.facSubClfy) out.push(f)
    else if (f.facClfy === 'SEISMOMETER')
      out.push({ facClfy: f.facClfy, facSubClfy: 'NONE' })
    else
      return `${LABEL_BY_CODE[f.facClfy] ?? f.facClfy} 의 하위 분류를 골라 주세요.`
  }
  return out
}

/** 서버의 '하위 없음'(NONE) 은 화면에서 상위만 고른 것으로 본다. */
const fromServer = (fs: CctvFacility[]): CctvFacility[] =>
  fs.map((f) => (f.facSubClfy === 'NONE' ? { ...f, facSubClfy: null } : f))

/** 저장 실패 문구 — 서버 메시지가 있으면 그대로. */
const errText = (e: unknown) =>
  e instanceof Error ? e.message : String(e)

export function AdminCctvPage() {
  const [list, setList] = useState<CctvItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [menuCode, setMenuCode] = useState(MENUS[0].code)
  // 시설물 탭 — 좌측 메뉴에서 고른 시설물 ('' 는 전체).
  const [facilityCode, setFacilityCode] = useState('')
  // 시설물 탭 — 본문 상단 하위 탭 ('' 는 전체).
  const [facilitySub, setFacilitySub] = useState('')
  // 시설물 탭 — 지도에서 고른 카메라 (아래 플레이어에서 재생).
  const [facilityCctvId, setFacilityCctvId] = useState<string | null>(null)
  // 선택된 카메라가 목록 밖에 있으면 그 행으로 스크롤한다.
  const facilityRowsRef = useRef<HTMLDivElement>(null)
  const [facilityKeyword, setFacilityKeyword] = useState('')
  // 목록에서 고른 순번 — 지도 이동 트리거 (마커 클릭 선택과 구분하기 위함).
  const [facilityFocusSeq, setFacilityFocusSeq] = useState(0)
  // 일괄 등록 모드 — 이 분류에 아직 속하지 않은 CCTV 를 골라 한 번에 붙인다.
  const [registerMode, setRegisterMode] = useState(false)
  const [registerChecked, setRegisterChecked] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // 후보를 좁히는 기준 — 선택한 하위 시설물 위치에서의 반경.
  const [radiusM, setRadiusM] = useState<number | null>(RADIUS_OPTIONS[0].value)
  const [facilityPoints, setFacilityPoints] = useState<FacilityPoint[]>([])
  // 확인 모달 — 열려 있으면 message 와 확인 시 실행할 동작을 담는다.
  // 이름이 잘린 행 hover — 전체 이름 툴팁 (잘리지 않은 행은 띄우지 않는다).
  const [nameTip, setNameTip] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)
  const showNameTip = (e: React.MouseEvent<HTMLElement>, text: string) => {
    const el = e.currentTarget
    if (el.scrollWidth <= el.clientWidth) return
    const r = el.getBoundingClientRect()
    setNameTip({ text, x: r.left, y: r.top })
  }

  const [confirmBox, setConfirmBox] = useState<{
    message: string
    onOk: () => void
    /** 확인 버튼만 — 저장 실패 같은 알림. */
    alertOnly?: boolean
  } | null>(null)
  const notify = (message: string) =>
    setConfirmBox({ message, onOk: () => {}, alertOnly: true })
  // 재해문자전광판 — 전광판 목록 / 전광판 id → 연결된 CCTV / 연결을 고르는 중인 전광판.
  const [boards, setBoards] = useState<
    { id: number; name: string; lat: number; lng: number }[]
  >([])
  const [boardLinks, setBoardLinks] = useState<Record<number, string | null>>({})
  const [boardId, setBoardId] = useState<number | null>(null)
  // 목록 분류 필터.
  const [filterCode, setFilterCode] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  // 서버에 저장된 값 (목록 표시 기준).
  const [classMap, setClassMap] = useState<ClassMap>({})
  // 우측에서 편집 중인 값 — 저장해야 classMap 에 반영된다.
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saving, setSaving] = useState(false)
  // 분류 영역 — 기본은 보기 모드, 편집을 눌러야 칩으로 고칠 수 있다.
  const [editMode, setEditMode] = useState(false)
  // 메인 지도 설정 — 표시할 시설물 분류 / CCTV 기준 반경.
  const [allFacilities, setAllFacilities] = useState<FacilityPointOf[]>([])
  // 처음엔 아무 시설물도 켜지 않는다 (켠 뒤에야 반경 설정이 의미가 있다).
  const [mapClfyOn, setMapClfyOn] = useState<Record<string, boolean>>({})
  const [mapRadiusM, setMapRadiusM] = useState<number | null>(
    RADIUS_OPTIONS[0].value,
  )
  // 이력 탭 — 기간 / 종류 / 조회 결과.
  const [historyDays, setHistoryDays] = useState(HISTORY_RANGES[0].days)
  const [historyType, setHistoryType] = useState<'' | CctvHistoryType>('')
  const [historyPage, setHistoryPage] = useState(0)
  const [historyKeyword, setHistoryKeyword] = useState('')
  // 종류별 목록/건수 — 전체 탭의 3파트와 우측 탭 배지에 함께 쓴다.
  const [historyParts, setHistoryParts] = useState<
    Record<CctvHistoryType, { items: CctvHistoryItem[]; total: number }>
  >({
    NEW: { items: [], total: 0 },
    UP: { items: [], total: 0 },
    DEL: { items: [], total: 0 },
  })
  // 종류 탭에서 보는 한 페이지.
  const [historyList, setHistoryList] = useState<CctvHistoryItem[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  // 바깥 클릭 시 필터 레이어 닫기 (급경사지 필터와 같은 동작).
  useEffect(() => {
    if (!filterOpen) return
    const onDown = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [filterOpen])

  useEffect(() => {
    fetchCctvList()
      .then((rows) => {
        setList(rows)
        // 서버가 내려준 분류를 저장본으로 삼는다.
        const saved: ClassMap = {}
        for (const c of rows) {
          if (c.facilities.length > 0) saved[c.cctvId] = fromServer(c.facilities)
        }
        setClassMap(saved)
      })
      .catch((e: unknown) => setLoadError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return list.filter((c) => {
      const cls = classMap[c.cctvId] ?? []
      if (filterCode) {
        // '해당 없음' 은 분류가 하나도 없는 것(미분류)까지 포함한다.
        const hit =
          filterCode === 'ETC'
            ? cls.length === 0 || cls.some((f) => f.facClfy === 'ETC')
            : cls.some((f) => f.facClfy === filterCode)
        if (!hit) return false
      }
      if (!kw) return true
      return (
        c.name.toLowerCase().includes(kw) ||
        (c.gbnCd ?? '').toLowerCase().includes(kw)
      )
    })
  }, [list, keyword, filterCode, classMap])

  const visible = rows.slice(0, LIST_LIMIT)

  const selected = list.find((c) => c.cctvId === selectedId) ?? null
  const saved = selectedId ? (classMap[selectedId] ?? EMPTY) : EMPTY
  // '해당 없음'(ETC) 은 미분류와 같은 뜻이라 변경 판정에서 제외한다.
  const dirty = !samePairs(withoutEtc(draft), withoutEtc(saved))

  // 카메라를 바꾸면 편집 상태를 저장값으로 되돌린다 (미저장 변경은 버린다).
  const selectCctv = (cctvId: string) => {
    setSelectedId(cctvId)
    setDraft(toDraft(classMap[cctvId] ?? EMPTY))
    setEditMode(false)
  }

  // 상위 토글 — 끄면 그 상위의 하위 쌍까지 전부 빠진다.
  //   '해당 없음'(ETC) 은 미분류를 뜻하므로 다른 분류와 함께 켜질 수 없고,
  //   반대로 아무것도 안 남으면 자동으로 '해당 없음' 이 켜진다.
  const toggleClfy = (code: string) => {
    setDraft((prev) => {
      const on = prev.some((f) => f.facClfy === code)
      const next = on
        ? prev.filter((f) => f.facClfy !== code)
        : [
            // 다른 분류를 고르면 '해당 없음' 은 해제.
            ...prev.filter((f) => f.facClfy !== 'ETC'),
            { facClfy: code, facSubClfy: null },
          ]
      // '해당 없음' 을 고른 경우 나머지는 전부 해제.
      if (!on && code === 'ETC') return [{ facClfy: 'ETC', facSubClfy: null }]
      return next.length > 0 ? next : [{ facClfy: 'ETC', facSubClfy: null }]
    })
  }

  // 하위 토글 — 같은 상위 안에서 여러 개 선택 가능.
  //   하위를 처음 고르면 하위 없는 쌍({상위, null})을 대체한다.
  const toggleSub = (clfy: string, code: string) => {
    setDraft((prev) => {
      const on = prev.some(
        (f) => f.facClfy === clfy && f.facSubClfy === code,
      )
      if (on) {
        const rest = prev.filter(
          (f) => !(f.facClfy === clfy && f.facSubClfy === code),
        )
        // 그 상위의 마지막 하위를 빼면 상위만 남긴다.
        return rest.some((f) => f.facClfy === clfy)
          ? rest
          : [...rest, { facClfy: clfy, facSubClfy: null }]
      }
      return [
        ...prev.filter((f) => !(f.facClfy === clfy && f.facSubClfy === null)),
        { facClfy: clfy, facSubClfy: code },
      ]
    })
  }

  // 저장 — 배정 통째 교체. 성공해야 classMap(목록 뱃지·필터) 에 반영된다.
  const handleSave = async () => {
    if (!selectedId) return
    const mapps = toMapps(draft)
    if (typeof mapps === 'string') return notify(mapps)
    setSaving(true)
    try {
      await saveCctvMapps(selectedId, mapps)
      setClassMap((prev) => ({ ...prev, [selectedId]: fromServer(mapps) }))
      setEditMode(false)
    } catch (e) {
      notify(`저장하지 못했습니다. ${errText(e)}`)
    } finally {
      setSaving(false)
    }
  }

  // 전체 건수 — 종류별 합.
  const historyTotalAll =
    historyParts.NEW.total + historyParts.UP.total + historyParts.DEL.total

  // 시설물이 하나라도 켜졌는지 — 반경 설정은 그때부터 의미가 있다.
  const anyClfyOn = CLASSIFICATIONS.some((c) => mapClfyOn[c.code])

  // 메인 지도에 실제로 그릴 시설물 — 체크한 분류 + (반경을 고르면) 그 반경 안.
  const mapFacilities = useMemo(() => {
    if (!selected) return []
    return allFacilities.filter((f) => {
      if (!mapClfyOn[f.clfy]) return false
      if (mapRadiusM === null) return true
      return distanceM(selected.lat, selected.lng, f.lat, f.lng) <= mapRadiusM
    })
  }, [allFacilities, mapClfyOn, mapRadiusM, selected])

  // 저장된 분류를 상위별로 묶는다 — 보기 모드에서 '상위 > 하위1, 하위2' 한 줄씩.
  const savedGroups = useMemo(() => {
    const by = new Map<string, string[]>()
    for (const f of saved) {
      const cur = by.get(f.facClfy) ?? []
      if (f.facSubClfy) cur.push(f.facSubClfy)
      by.set(f.facClfy, cur)
    }
    return [...by.entries()].map(([clfy, subs]) => ({ clfy, subs }))
  }, [saved])

  // 목록 행을 펼쳤을 때 보여줄 카메라 정보 (등록 모드·평소 목록 공용).
  const renderDetail = (c: CctvItem) => (
    <dl className="admin-cctv-pick-detail">
      <div>
        <dt>관리번호</dt>
        <dd>{c.mgtNo || '-'}</dd>
      </div>
      <div>
        <dt>구분 코드</dt>
        <dd>{c.gbnCd || '-'}</dd>
      </div>
      <div>
        <dt>PTZ</dt>
        <dd>{c.ptzYn === 'Y' ? '가능' : '불가'}</dd>
      </div>
      <div>
        <dt>좌표</dt>
        <dd>
          {c.lng}, {c.lat}
        </dd>
      </div>
      <div>
        <dt>현재 분류</dt>
        <dd>
          {(classMap[c.cctvId] ?? []).length === 0
            ? '해당 없음'
            : (classMap[c.cctvId] ?? [])
                .map(
                  (f) =>
                    `${LABEL_BY_CODE[f.facClfy] ?? f.facClfy}${
                      f.facSubClfy
                        ? ` / ${LABEL_BY_CODE[f.facSubClfy] ?? f.facSubClfy}`
                        : ''
                    }`,
                )
                .join(', ')}
        </dd>
      </div>
    </dl>
  )

  // 시설물 탭 하위 탭 목록 — 상수에 정의된 하위 + CCTV 응답의 실제 facSubClfy 값(합집합).
  //   상수 것을 빼면 아직 한 대도 등록 안 된 하위는 탭이 없어 등록조차 못 한다.
  //   서버에만 있는 코드도 그대로 노출돼 코드 수정 없이 따라온다.
  //   정렬은 상수(CLASSIFICATIONS) 순서 우선, 상수에 없는 코드는 뒤에 코드순.
  const facilitySubs = useMemo(() => {
    if (!facilityCode) return []
    const known = CLASSIFICATIONS.find((c) => c.code === facilityCode)?.subs
    const order = new Map((known ?? []).map((s, i) => [s.code, i]))
    const codes = new Set<string>((known ?? []).map((s) => s.code))
    for (const c of list) {
      for (const f of c.facilities) {
        if (f.facClfy === facilityCode && f.facSubClfy) codes.add(f.facSubClfy)
      }
    }
    return [...codes]
      .sort((a, b) => {
        const oa = order.get(a) ?? Number.MAX_SAFE_INTEGER
        const ob = order.get(b) ?? Number.MAX_SAFE_INTEGER
        return oa !== ob ? oa - ob : a.localeCompare(b)
      })
      .map((code) => ({ code, label: LABEL_BY_CODE[code] ?? code }))
  }, [list, facilityCode])

  // 이력 기간 → from/to.
  const historyRange = useMemo(() => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - (historyDays - 1))
    return { from: ymd(from), to: ymd(to) }
  }, [historyDays])

  // 전체 탭 — 종류별로 나눠 조회 (각 파트 목록 + 총 건수).
  useEffect(() => {
    if (menuCode !== 'HISTORY') return
    let alive = true
    setHistoryLoading(true)
    setHistoryError(null)
    Promise.all(
      (['NEW', 'UP', 'DEL'] as CctvHistoryType[]).map((type) =>
        fetchCctvHistory({
          ...historyRange,
          type,
          keyword: historyKeyword.trim() || undefined,
          page: 0,
          size: HISTORY_PART_SIZE,
        }).then((p) => [type, p] as const),
      ),
    )
      .then((res) => {
        if (!alive) return
        const next = {
          NEW: { items: [], total: 0 },
          UP: { items: [], total: 0 },
          DEL: { items: [], total: 0 },
        } as Record<CctvHistoryType, { items: CctvHistoryItem[]; total: number }>
        for (const [type, p] of res) next[type] = p
        setHistoryParts(next)
      })
      .catch((e: unknown) => {
        if (!alive) return
        setHistoryError(String(e))
      })
      .finally(() => alive && setHistoryLoading(false))
    return () => {
      alive = false
    }
  }, [menuCode, historyRange, historyKeyword])

  // 종류 탭 — 그 종류만 페이징 조회.
  useEffect(() => {
    if (menuCode !== 'HISTORY' || historyType === '') return
    let alive = true
    setHistoryLoading(true)
    setHistoryError(null)
    fetchCctvHistory({
      ...historyRange,
      type: historyType,
      keyword: historyKeyword.trim() || undefined,
      page: historyPage,
      size: HISTORY_PAGE_SIZE,
    })
      .then((p) => {
        if (!alive) return
        setHistoryList(p.items)
        setHistoryTotal(p.total)
      })
      .catch((e: unknown) => {
        if (!alive) return
        setHistoryList([])
        setHistoryTotal(0)
        setHistoryError(String(e))
      })
      .finally(() => alive && setHistoryLoading(false))
    return () => {
      alive = false
    }
  }, [menuCode, historyType, historyRange, historyKeyword, historyPage])

  // 메인 지도에 찍을 시설물 — 좌표가 있는 분류 전체를 한 번만 부른다.
  useEffect(() => {
    let alive = true
    fetchAllFacilityPoints()
      .then((pts) => alive && setAllFacilities(pts))
      .catch(() => alive && setAllFacilities([]))
    return () => {
      alive = false
    }
  }, [])

  // 시설물 좌표 — 일괄 등록의 반경 기준점. 시설물이 바뀔 때만 다시 부른다.
  useEffect(() => {
    if (!facilityCode) {
      setFacilityPoints([])
      return
    }
    let alive = true
    fetchFacilityPoints(facilityCode)
      .then((pts) => alive && setFacilityPoints(pts))
      .catch(() => alive && setFacilityPoints([]))
    return () => {
      alive = false
    }
  }, [facilityCode])

  const exitRegister = () => {
    setRegisterMode(false)
    setRegisterChecked(new Set())
    setExpandedId(null)
    // 반경은 기본값(가장 작은 값)으로 되돌린다 — 다음 등록이 이전 설정을 물려받지 않게.
    setRadiusM(RADIUS_OPTIONS[0].value)
  }

  // 목록/마커에서 후보를 고르면 체크 + 그 위치로 이동·확대.
  const pickRegisterRow = (cctvId: string) => {
    toggleRegisterCheck(cctvId)
    setFacilityCctvId(cctvId)
    setFacilityFocusSeq((n) => n + 1)
  }

  const toggleRegisterCheck = (cctvId: string) => {
    setRegisterChecked((prev) => {
      const next = new Set(prev)
      if (next.has(cctvId)) next.delete(cctvId)
      else next.add(cctvId)
      return next
    })
  }

  // 일괄 등록 — 체크한 CCTV 에 현재 분류(+하위)를 덧붙인다 (기존 배정 유지).
  const applyRegister = async () => {
    if (registerChecked.size === 0 || !facilityCode || !facilitySub) return
    setSaving(true)
    try {
      const ids = [...registerChecked]
      await addCctvMapps(ids, [{ facClfy: facilityCode, facSubClfy: facilitySub }])
      setClassMap((prev) => {
        const next = { ...prev }
        for (const id of ids) {
          const cur = next[id] ?? []
          next[id] = [
            ...cur,
            { facClfy: facilityCode, facSubClfy: facilitySub },
          ]
        }
        return next
      })
      exitRegister()
    } catch (e) {
      notify(`등록하지 못했습니다. ${errText(e)}`)
    } finally {
      setSaving(false)
    }
  }

  // 분류 해제 — 이 CCTV 에서 현재 하위 시설물 분류만 뗀다. 확인 모달 후 실행.
  const unassign = (cctvId: string, name: string) => {
    if (!facilityCode || !facilitySub) return
    const label = LABEL_BY_CODE[facilitySub] ?? facilitySub
    setConfirmBox({
      message: `'${name}' 을(를) ${label} 분류에서 해제하시겠습니까?`,
      onOk: async () => {
        try {
          await deleteCctvMapp(cctvId, facilityCode, facilitySub)
        } catch (e) {
          return notify(`해제하지 못했습니다. ${errText(e)}`)
        }
        setClassMap((prev) => {
          const cur = prev[cctvId] ?? []
          return {
            ...prev,
            [cctvId]: cur.filter(
              (f) =>
                !(f.facClfy === facilityCode && f.facSubClfy === facilitySub),
            ),
          }
        })
        if (facilityCctvId === cctvId) setFacilityCctvId(null)
        // 재해문자전광판 분류를 떼면 서버에서 전광판 연결도 같이 빠진다.
        if (facilitySub === 'SIGNBOARD') void reloadBoardLinks()
      },
    })
  }

  // 재해문자전광판 — 하위 탭을 열 때 전광판 목록과 연결 상태를 받는다.
  const isSignboard =
    facilityCode === 'DISASTER_ALERT' && facilitySub === 'SIGNBOARD' && !registerMode
  const reloadBoardLinks = () =>
    fetchSignboardCctv()
      .then((rows) =>
        setBoardLinks(Object.fromEntries(rows.map((r) => [r.signboardId, r.cctvId]))),
      )
      .catch((e) => notify(`전광판 연결을 불러오지 못했습니다. ${errText(e)}`))
  useEffect(() => {
    setBoardId(null)
    if (facilitySub !== 'SIGNBOARD') return
    fetchDisasterBoards()
      .then((bs) =>
        setBoards(bs.map((b) => ({ id: b.id, name: b.name, lat: b.lat, lng: b.lng }))),
      )
      .catch(() => setBoards([]))
    void reloadBoardLinks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilitySub])

  // CCTV → 연결된 전광판 이름 (목록 태그용).
  const boardNameByCctv = useMemo(() => {
    const m = new Map<string, string>()
    for (const b of boards) {
      const cid = boardLinks[b.id]
      if (cid) m.set(cid, b.name)
    }
    return m
  }, [boards, boardLinks])

  // 고른 전광판에 CCTV 연결 / 해제(null). 다른 전광판에 붙은 CCTV 는 서버가 409 로 막는다.
  const linkBoard = async (cctvId: string | null) => {
    if (boardId === null) return
    setSaving(true)
    try {
      await linkSignboardCctv(boardId, cctvId)
      setBoardLinks((prev) => ({ ...prev, [boardId]: cctvId }))
      // 연결하면 서버가 재해문자전광판 분류도 붙인다 — 목록도 같이 맞춘다.
      if (cctvId) {
        setClassMap((prev) => {
          const cur = prev[cctvId] ?? []
          return cur.some((f) => f.facClfy === 'DISASTER_ALERT' && f.facSubClfy === 'SIGNBOARD')
            ? prev
            : { ...prev, [cctvId]: [...cur, { facClfy: 'DISASTER_ALERT', facSubClfy: 'SIGNBOARD' }] }
        })
      }
    } catch (e) {
      if (e instanceof CctvSyncError && e.status === 409 && e.signboardId != null) {
        const other = boards.find((b) => b.id === e.signboardId)?.name ?? `${e.signboardId}번`
        notify(`이 CCTV 는 이미 '${other}' 전광판에 연결돼 있습니다. 그 전광판에서 먼저 연결을 해제해 주세요.`)
      } else {
        notify(`연결하지 못했습니다. ${errText(e)}`)
      }
    } finally {
      setSaving(false)
    }
  }

  // 지도에서 카메라를 고르면 우측 목록도 그 행으로 스크롤 + 활성화.
  useEffect(() => {
    if (!facilityCctvId) return
    const box = facilityRowsRef.current
    const row = box?.querySelector<HTMLElement>(
      `[data-cctv-id="${facilityCctvId}"]`,
    )
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [facilityCctvId])

  // 시설물 탭 지도에 찍을 CCTV — ''는 전체, 'ETC'는 분류가 없는 것 포함.
  const facilityCctvs = useMemo(
    () =>
      list.filter((c) => {
        const cls = classMap[c.cctvId] ?? []
        // 좌측 첫 항목 — 전체.
        if (facilityCode === '') return true
        // '해당 없음' 은 분류가 하나도 없는 것(null)까지 포함한다.
        if (facilityCode === 'ETC') {
          return cls.length === 0 || cls.some((f) => f.facClfy === 'ETC')
        }
        return cls.some(
          (f) =>
            f.facClfy === facilityCode &&
            (facilitySub === '' || f.facSubClfy === facilitySub),
        )
      }),
    [list, classMap, facilityCode, facilitySub],
  )

  // 반경 기준점 — 선택한 하위 시설물의 위치.
  const registerOrigins = useMemo(
    () => facilityPoints.filter((p) => p.subCode === facilitySub),
    [facilityPoints, facilitySub],
  )

  // 재해문자전광판 — 연결을 고르는 중인 전광판.
  const selectedBoard = isSignboard
    ? (boards.find((b) => b.id === boardId) ?? null)
    : null

  // 지도에 항상 표시할 시설물 마커 — 전광판을 고르면 그 전광판만, 하위를 고르면 그 지점만, 아니면 그 시설물 전체.
  const facilityMarkers = useMemo(
    () =>
      selectedBoard
        ? [{ subCode: 'SIGNBOARD', name: selectedBoard.name, lat: selectedBoard.lat, lng: selectedBoard.lng }]
        : facilitySub
          ? registerOrigins
          : facilityPoints,
    [selectedBoard, facilitySub, registerOrigins, facilityPoints],
  )

  // 일괄 등록 후보 — 이 하위 시설물에 아직 속하지 않은 CCTV 중 반경 안에 있는 것.
  const registerCandidates = useMemo(() => {
    if (!facilityCode || !facilitySub) return []
    return list.filter((c) => {
      const cls = classMap[c.cctvId] ?? []
      const already = cls.some(
        (f) => f.facClfy === facilityCode && f.facSubClfy === facilitySub,
      )
      if (already) return false
      if (radiusM === null || registerOrigins.length === 0) return true
      return registerOrigins.some(
        (p) => distanceM(p.lat, p.lng, c.lat, c.lng) <= radiusM,
      )
    })
  }, [list, classMap, facilityCode, facilitySub, radiusM, registerOrigins])

  // 전광판 연결 후보 — 그 전광판 반경 안 CCTV(가까운 순) + 이미 연결된 CCTV.
  //   분류가 없어도 고를 수 있다 (연결하면 서버가 재해문자전광판 분류를 붙인다).
  const boardCandidates = useMemo(() => {
    if (!selectedBoard) return null
    const linked = boardLinks[selectedBoard.id]
    const dist = (c: CctvItem) =>
      distanceM(selectedBoard.lat, selectedBoard.lng, c.lat, c.lng)
    return list
      .filter((c) => c.cctvId === linked || radiusM === null || dist(c) <= radiusM)
      .sort((a, b) => dist(a) - dist(b))
  }, [selectedBoard, boardLinks, list, radiusM])

  // 지도·목록에 올릴 CCTV — 일괄 등록 후보 / 전광판 연결 후보 / 이 분류의 CCTV.
  const baseCctvs = registerMode
    ? registerCandidates
    : (boardCandidates ?? facilityCctvs)

  // 카메라 맞추기 대상 — 시설물 지점 + 그에 속한 CCTV 가 모두 보이게.
  //   (한 곳만 있으면 그 지점으로 확 들어가지 않도록 maxZoom 은 지도 쪽에서 제한한다.)
  const facilityFitTo = useMemo(
    () => [
      ...facilityMarkers.map((p) => ({ lat: p.lat, lng: p.lng })),
      ...baseCctvs.map((c) => ({
        lat: c.lat,
        lng: c.lng,
      })),
    ],
    [facilityMarkers, baseCctvs],
  )

  // 목록 검색 — 지도 마커는 그대로 두고 목록만 좁힌다.
  const facilityRows = useMemo(() => {
    const kw = facilityKeyword.trim().toLowerCase()
    if (!kw) return baseCctvs
    return baseCctvs.filter(
      (c) =>
        c.name.toLowerCase().includes(kw) ||
        (c.gbnCd ?? '').toLowerCase().includes(kw),
    )
  }, [baseCctvs, facilityKeyword])

  // 선택한 상위 분류별로 묶어서 보여준다 — 어느 상위의 하위인지 구분되게.
  const subGroups = CLASSIFICATIONS.filter(
    (c) => draft.some((f) => f.facClfy === c.code) && c.subs.length > 0,
  )

  return (
    <div className="admin-cctv">
      <header className="admin-cctv-head">
        <h1>CCTV 관리</h1>
        <span className="admin-cctv-count">
          전체 {list.length.toLocaleString()}건
        </span>
      </header>

      {/* 상단 메뉴 — 관리자 화면 단위. */}
      <nav className="admin-cctv-tabs">
        {MENUS.map((m) => (
          <button
            key={m.code}
            type="button"
            className={`admin-cctv-tab ${m.code === menuCode ? 'is-on' : ''}`}
            onClick={() => setMenuCode(m.code)}
          >
            {m.label}
          </button>
        ))}
      </nav>

      {menuCode === 'HISTORY' && (
        <div className="admin-cctv-body">
          {/* 좌 — 이력 종류 */}
          <aside className="admin-cctv-side">
            {HISTORY_TABS.map((t) => (
              <button
                key={t.code || 'all'}
                type="button"
                className={`admin-cctv-side-item ${
                  t.code === historyType ? 'is-on' : ''
                }`}
                onClick={() => {
                  setHistoryType(t.code)
                  setHistoryPage(0)
                }}
              >
                {t.label}
                <em>
                  {(t.code === ''
                    ? historyTotalAll
                    : historyParts[t.code].total
                  ).toLocaleString()}
                </em>
              </button>
            ))}
          </aside>

          {/* 우 — 기간 + 본문 */}
          <section className="admin-cctv-history">
            <div className="admin-cctv-history-head">
              <span className="admin-cctv-history-title">기간 설정</span>
              <div className="admin-cctv-history-ranges">
                {HISTORY_RANGES.map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    className={`admin-cctv-radius-btn ${
                      r.days === historyDays ? 'is-on' : ''
                    }`}
                    onClick={() => {
                      setHistoryDays(r.days)
                      setHistoryPage(0)
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {/* 지금 적용된 조회 조건 + 총 건수. */}
              <span className="admin-cctv-history-cond">
                {historyRange.from.replaceAll('-', '/')} ~{' '}
                {historyRange.to.replaceAll('-', '/')}
                {historyKeyword.trim() && ` & ${historyKeyword.trim()}`}
              </span>
              <span className="admin-cctv-count">
                총 {historyTotalAll.toLocaleString()}건
              </span>
            </div>

            {/* 검색 — 기간 아래 줄. */}
            <input
              className="admin-cctv-history-search"
              value={historyKeyword}
              onChange={(e) => {
                setHistoryKeyword(e.target.value)
                setHistoryPage(0)
              }}
              placeholder="CCTV 명 · 변경 내용 검색"
            />


            {historyLoading && (
              <p className="admin-cctv-empty">이력 불러오는 중…</p>
            )}
            {!historyLoading && historyError && (
              <p className="admin-cctv-empty">
                이력 조회 실패 — 동기화 이력 API 연동 후 표시됩니다
              </p>
            )}

            {!historyLoading && !historyError && historyType === '' && (
              // 전체 — 등록 / 수정 / 삭제 3파트.
              <div className="admin-cctv-history-parts">
                {(['NEW', 'UP', 'DEL'] as CctvHistoryType[]).map((t) => (
                  <div key={t} className="admin-cctv-history-part">
                    <div className={`admin-cctv-history-part-head is-${t}`}>
                      {HISTORY_LABEL[t]}
                      <span>{historyParts[t].total.toLocaleString()}건</span>
                    </div>
                    <div className="admin-cctv-history-rows">
                      {historyParts[t].items.length === 0 ? (
                        <p className="admin-cctv-empty">이력이 없습니다</p>
                      ) : (
                        historyParts[t].items.map((h) => (
                          <div key={h.id} className="admin-cctv-history-row">
                            <span
                              className="admin-cctv-history-name"
                              onMouseEnter={(e) => showNameTip(e, h.name)}
                              onMouseLeave={() => setNameTip(null)}
                            >
                              {h.name}
                            </span>
                            <span className="admin-cctv-history-meta">
                              {h.gbnCd} · {h.syncedAt.slice(0, 10)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!historyLoading && !historyError && historyType !== '' && (
              // 종류별 — 리스트 + 페이징.
              <div className="admin-cctv-history-list">
                <div className="admin-cctv-listhead is-history">
                  <span>CCTV 명</span>
                  <span>구분코드</span>
                  <span>변경 내용</span>
                  <span>동기화 일시</span>
                </div>
                <div className="admin-cctv-rows">
                  {historyList.length === 0 ? (
                    <p className="admin-cctv-empty">이력이 없습니다</p>
                  ) : (
                    historyList.map((h) => (
                      <div
                        key={h.id}
                        className="admin-cctv-listhead is-history is-row"
                      >
                        <span
                          className="admin-cctv-row-name"
                          onMouseEnter={(e) => showNameTip(e, h.name)}
                          onMouseLeave={() => setNameTip(null)}
                        >
                          {h.name}
                        </span>
                        <span>{h.gbnCd}</span>
                        <span>{h.changes ?? '-'}</span>
                        <span>{h.syncedAt.replace('T', ' ').slice(0, 16)}</span>
                      </div>
                    ))
                  )}
                </div>
                {historyTotal > HISTORY_PAGE_SIZE && (
                  <div className="admin-cctv-pager">
                    <button
                      type="button"
                      disabled={historyPage === 0}
                      onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                    >
                      이전
                    </button>
                    <span>
                      {historyPage + 1} /{' '}
                      {Math.ceil(historyTotal / HISTORY_PAGE_SIZE)}
                    </span>
                    <button
                      type="button"
                      disabled={
                        historyPage + 1 >=
                        Math.ceil(historyTotal / HISTORY_PAGE_SIZE)
                      }
                      onClick={() => setHistoryPage((p) => p + 1)}
                    >
                      다음
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {menuCode === 'FACILITY' && (
        <div className="admin-cctv-body">
          {/* 좌 — 시설물 메뉴. 전체가 맨 위, 아래로 시설물 순서대로.
              분류가 없는 CCTV 는 '해당 없음' 에서 본다. */}
          <aside className="admin-cctv-side">
            <button
              type="button"
              className={`admin-cctv-side-item ${
                facilityCode === '' ? 'is-on' : ''
              }`}
              onClick={() => {
                setFacilityCode('')
                setFacilitySub('')
                setFacilityCctvId(null)
                setFacilityKeyword('')
                exitRegister()
              }}
            >
              전체
            </button>
            {CLASSIFICATIONS.map((c) => (
              <button
                key={c.code}
                type="button"
                className={`admin-cctv-side-item ${
                  facilityCode === c.code ? 'is-on' : ''
                }`}
                onClick={() => {
                  setFacilityCode(c.code)
                  setFacilitySub('')
                  setFacilityCctvId(null)
                  setFacilityKeyword('')
                }}
              >
                {c.label}
              </button>
            ))}
          </aside>

          <section className="admin-cctv-detail">
            {/* 하위 탭 — 맨 앞은 항상 전체, 하위 분류가 없으면 전체만. */}
            <nav className="admin-cctv-subtabs">
              {[{ code: '', label: '전체' }, ...facilitySubs].map((t) => (
                <button
                  key={t.code || 'all'}
                  type="button"
                  className={`admin-cctv-subtab ${
                    t.code === facilitySub ? 'is-on' : ''
                  }`}
                  onClick={() => {
                    setFacilitySub(t.code)
                    setFacilityCctvId(null)
                    setFacilityKeyword('')
                    exitRegister()
                  }}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            <div className="admin-cctv-facility-main">
              <div className="admin-cctv-facility-media">
                <AdminCctvMap
                  cctvs={baseCctvs}
                  fitTo={facilityFitTo}
                  selectedId={facilityCctvId}
                  onSelect={setFacilityCctvId}
                  focusSeq={facilityFocusSeq}
                  checked={registerMode ? registerChecked : undefined}
                  onToggleCheck={
                    registerMode ? toggleRegisterCheck : undefined
                  }
                  facilityPoints={facilityMarkers}
                  radiusM={registerMode ? radiusM : null}
                />

                {/* 지도와 같은 크기(16:9) 플레이어 — 지도에서 고른 카메라를 재생. */}
                <div className="admin-cctv-bigplayer">
                  {facilityCctvId ? (
                    <CctvPlayer
                      key={facilityCctvId}
                      cctvId={facilityCctvId}
                      width={MEDIA_W}
                      height={MEDIA_H}
                    />
                  ) : (
                    <p className="admin-cctv-empty">
                      지도에서 CCTV 마커를 클릭하면 영상이 재생됩니다
                    </p>
                  )}
                </div>
              </div>

            {/* 우 — 이 시설물의 CCTV 목록. 지도 선택과 양방향으로 연동된다. */}
            <aside className="admin-cctv-cctvlist">
              <div className="admin-cctv-cctvlist-head">
                <input
                  value={facilityKeyword}
                  onChange={(e) => setFacilityKeyword(e.target.value)}
                  placeholder="CCTV 명 · 구분코드 검색"
                />
                {/* 하위 시설물까지 좁힌 화면은 건수가 두 자리 수준이라 자리도 좁게 잡는다. */}
                <span
                  className={`admin-cctv-count ${
                    facilitySub ? 'is-compact' : ''
                  }`}
                >
                  {facilityRows.length.toLocaleString()} /{' '}
                  {baseCctvs.length.toLocaleString()}{' '}
                  (건)
                </span>
                {facilityCode &&
                  facilitySub &&
                  (registerMode ? (
                    <button
                      type="button"
                      className="admin-cctv-mode-btn"
                      onClick={exitRegister}
                    >
                      취소
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="admin-cctv-mode-btn is-on"
                      onClick={() => {
                        setRegisterMode(true)
                        setFacilityKeyword('')
                      }}
                    >
                      일괄 등록
                    </button>
                  ))}
              </div>

              {isSignboard && (
                <div className="admin-cctv-boards">
                  <p className="admin-cctv-boards-hint">
                    전광판을 고른 뒤 아래 목록에서 CCTV 를 연결하세요 (전광판 1개당 CCTV 1대)
                  </p>
                  {boards.map((b) => {
                    const cid = boardLinks[b.id] ?? null
                    const cam = cid ? list.find((c) => c.cctvId === cid) : undefined
                    return (
                      <button
                        key={b.id}
                        type="button"
                        className={`admin-cctv-board ${b.id === boardId ? 'is-on' : ''}`}
                        onClick={() => {
                          setBoardId((v) => (v === b.id ? null : b.id))
                          if (cid) {
                            setFacilityCctvId(cid)
                            setFacilityFocusSeq((n) => n + 1)
                          }
                        }}
                      >
                        <span className="admin-cctv-board-name">{b.name}</span>
                        <span className={`admin-cctv-board-cctv ${cid ? '' : 'is-none'}`}>
                          {cid ? (cam?.name ?? cid) : 'CCTV 미지정'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
              {(registerMode || selectedBoard) && (
                <div className="admin-cctv-register-bar">
                  <strong>
                    {selectedBoard?.name ?? LABEL_BY_CODE[facilitySub] ?? facilitySub} 반경
                  </strong>
                  {RADIUS_OPTIONS.map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      className={`admin-cctv-radius-btn ${
                        o.value === radiusM ? 'is-on' : ''
                      }`}
                      onClick={() => setRadiusM(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                  {!selectedBoard && registerOrigins.length === 0 && (
                    <em>시설물 좌표 없음 — 반경 미적용</em>
                  )}
                </div>
              )}
              <div className="admin-cctv-rows" ref={facilityRowsRef}>
                {/* 목록 헤더 — 등록 모드에서는 표시된 후보 전체 선택도 겸한다. */}
                <div className="admin-cctv-listhead">
                  {registerMode && (
                    <input
                      type="checkbox"
                      checked={
                        facilityRows.length > 0 &&
                        facilityRows.every((c) => registerChecked.has(c.cctvId))
                      }
                      disabled={facilityRows.length === 0}
                      onChange={(e) =>
                        setRegisterChecked(
                          e.target.checked
                            ? new Set(facilityRows.map((c) => c.cctvId))
                            : new Set(),
                        )
                      }
                    />
                  )}
                  {/* 행의 pick-main 과 같은 폭 — 오른쪽 버튼 자리는 spacer 로 비운다. */}
                  <span className="admin-cctv-listhead-main">
                    <span>CCTV 명</span>
                    <span>구분코드</span>
                  </span>
                  <span
                    className={`admin-cctv-listhead-spacer ${
                      facilitySub && !registerMode ? 'has-unassign' : ''
                    }`}
                  />
                </div>
                {facilityRows.length === 0 && (
                  <p className="admin-cctv-empty">해당하는 CCTV 가 없습니다</p>
                )}
                {facilityRows.map((c) =>
                  registerMode ? (
                    <div
                      key={c.cctvId}
                      data-cctv-id={c.cctvId}
                      className={`admin-cctv-pick ${
                        registerChecked.has(c.cctvId) ? 'is-checked' : ''
                      }`}
                    >
                      <div className="admin-cctv-pick-head">
                        <input
                          type="checkbox"
                          checked={registerChecked.has(c.cctvId)}
                          onChange={() => toggleRegisterCheck(c.cctvId)}
                        />
                        <button
                          type="button"
                          className="admin-cctv-pick-main"
                          onClick={() => pickRegisterRow(c.cctvId)}
                        >
                          <span
                            className="admin-cctv-row-name"
                            onMouseEnter={(e) => showNameTip(e, c.name)}
                            onMouseLeave={() => setNameTip(null)}
                          >
                            {c.name}
                          </span>
                          <span className="admin-cctv-row-id">{c.gbnCd}</span>
                        </button>
                        <button
                          type="button"
                          className="admin-cctv-pick-toggle"
                          onClick={() =>
                            setExpandedId((v) =>
                              v === c.cctvId ? null : c.cctvId,
                            )
                          }
                        >
                          {expandedId === c.cctvId ? '닫기' : '펼치기'}
                        </button>
                      </div>
                      {expandedId === c.cctvId && renderDetail(c)}
                    </div>
                  ) : (
                    <div
                      key={c.cctvId}
                      data-cctv-id={c.cctvId}
                      className={`admin-cctv-pick ${
                        c.cctvId === facilityCctvId ? 'is-active' : ''
                      }`}
                    >
                      <div className="admin-cctv-pick-head">
                        <button
                          type="button"
                          className="admin-cctv-pick-main"
                          onClick={() => {
                            setFacilityCctvId(c.cctvId)
                            setFacilityFocusSeq((n) => n + 1)
                          }}
                        >
                          <span
                            className="admin-cctv-row-name"
                            onMouseEnter={(e) => showNameTip(e, c.name)}
                            onMouseLeave={() => setNameTip(null)}
                          >
                            {c.name}
                          </span>
                          <span className="admin-cctv-row-id">{c.gbnCd}</span>
                        </button>
                        {isSignboard && (
                          <span
                            className={`admin-cctv-link-tag ${
                              boardNameByCctv.has(c.cctvId) ? '' : 'is-none'
                            }`}
                          >
                            {boardNameByCctv.get(c.cctvId) ?? '전광판 미지정'}
                          </span>
                        )}
                        {isSignboard && boardId !== null && (
                          <button
                            type="button"
                            className="admin-cctv-pick-toggle admin-cctv-link-btn"
                            disabled={saving}
                            onClick={() =>
                              linkBoard(boardLinks[boardId] === c.cctvId ? null : c.cctvId)
                            }
                          >
                            {boardLinks[boardId] === c.cctvId ? '연결 해제' : '연결'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-cctv-pick-toggle"
                          onClick={() =>
                            setExpandedId((v) =>
                              v === c.cctvId ? null : c.cctvId,
                            )
                          }
                        >
                          {expandedId === c.cctvId ? '닫기' : '펼치기'}
                        </button>
                        {facilitySub && !selectedBoard && (
                          <button
                            type="button"
                            className="admin-cctv-unassign"
                            onClick={() => unassign(c.cctvId, c.name)}
                            disabled={saving}
                          >
                            해제
                          </button>
                        )}
                      </div>
                      {expandedId === c.cctvId && renderDetail(c)}
                    </div>
                  ),
                )}
              </div>

              {registerMode && (
                <div className="admin-cctv-register-foot">
                  <span>{registerChecked.size.toLocaleString()}건 선택</span>
                  <button
                    type="button"
                    onClick={applyRegister}
                    disabled={registerChecked.size === 0 || saving}
                  >
                    {saving ? '등록 중…' : '등록'}
                  </button>
                </div>
              )}
            </aside>
            </div>
          </section>

        </div>
      )}

      {menuCode === 'CCTV_CLASSIFY' && (
        <div className="admin-cctv-body">
          {/* 좌 — 목록 */}
          <section className="admin-cctv-list">
            <div className="admin-cctv-filters">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="CCTV 명 · 구분코드 검색"
              />
              <div className="admin-cctv-select" ref={filterRef}>
                <button
                  type="button"
                  className="admin-cctv-select-btn"
                  onClick={() => setFilterOpen((v) => !v)}
                >
                  <span>
                    {filterCode
                      ? (LABEL_BY_CODE[filterCode] ?? filterCode)
                      : '전체 분류'}
                  </span>
                  <span
                    className={`slope-list-caret ${filterOpen ? 'is-open' : ''}`}
                  >
                    <CaretIcon />
                  </span>
                </button>
                {filterOpen && (
                  <div className="slope-filter-layer is-auto">
                    <div className="slope-filter-options">
                      {[{ code: '', label: '전체 분류' }, ...CLASSIFICATIONS].map(
                        (c) => (
                          <button
                            key={c.code || 'all'}
                            type="button"
                            className={`slope-filter-option ${
                              c.code === filterCode ? 'is-active' : ''
                            }`}
                            onClick={() => {
                              setFilterCode(c.code)
                              setFilterOpen(false)
                            }}
                          >
                            {c.label}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          {/* 분류 색 범례 — 목록의 점과 같은 색. */}
          <div className="admin-cctv-legend-bar">
            {CLASSIFICATIONS.map((c) => (
              <span key={c.code}>
                <i style={{ background: CLFY_COLOR[c.code] ?? '#7F97AF' }} />
                {c.label}
              </span>
            ))}
          </div>

          {/* 컬럼 헤더 — 행과 같은 3열 (CCTV 명 / 분류 / 구분코드). */}
          <div className="admin-cctv-listhead is-main">
            <span>CCTV 명</span>
            <span>분류</span>
            <span>구분코드</span>
          </div>

            <div className="admin-cctv-rows">
              {loading && (
                <p className="admin-cctv-empty">CCTV 목록 불러오는 중…</p>
              )}
              {loadError && (
                <p className="admin-cctv-empty">목록 조회 실패 — {loadError}</p>
              )}
              {!loading && !loadError && rows.length === 0 && (
                <p className="admin-cctv-empty">조건에 맞는 CCTV 가 없습니다</p>
              )}
              {visible.map((c) => {
                const cls = classMap[c.cctvId]
                return (
                  <button
                    key={c.cctvId}
                    type="button"
                    className={`admin-cctv-row ${
                      c.cctvId === selectedId ? 'is-active' : ''
                    }`}
                    onClick={() => selectCctv(c.cctvId)}
                  >
                    <span
                      className="admin-cctv-row-name"
                      onMouseEnter={(e) => showNameTip(e, c.name)}
                      onMouseLeave={() => setNameTip(null)}
                    >
                      {c.name}
                    </span>
                    {/* 상위 분류 — 이름 없이 색 점으로만 (중복 제거). 색은 위 범례와 같다. */}
                    <span className="admin-cctv-dots">
                      {[...new Set((cls ?? []).map((f) => f.facClfy))].map(
                        (code) => (
                          <i
                            key={code}
                            title={LABEL_BY_CODE[code] ?? code}
                            style={{ background: CLFY_COLOR[code] ?? '#7F97AF' }}
                          />
                        ),
                      )}
                    </span>
                    <span className="admin-cctv-row-id">{c.gbnCd}</span>
                  </button>
                )
              })}
              {rows.length > LIST_LIMIT && (
                <p className="admin-cctv-empty">
                  {LIST_LIMIT}건까지 표시 — 검색으로 좁혀 주세요
                </p>
              )}
            </div>

          </section>

          {/* 우 — 선택한 카메라 */}
          <section className="admin-cctv-detail">
            {!selected && (
              <p className="admin-cctv-empty">왼쪽 목록에서 CCTV 를 선택하세요</p>
            )}
            {selected && (
              <div className="admin-cctv-detail-body">
                {/* 좌 — 영상 + 위치 */}
                <div className="admin-cctv-detail-main">
                  <div className="admin-cctv-player">
                    <CctvPlayer
                      key={selected.cctvId}
                      cctvId={selected.cctvId}
                      width={640}
                      height={360}
                      onConnectedChange={setPlaying}
                    />
                  </div>
                  <div className="admin-cctv-map">
                    <AdminCctvMiniMap
                      lat={selected.lat}
                      lng={selected.lng}
                      facilities={mapFacilities}
                      radiusM={mapRadiusM}
                    />
                  </div>

                  {/* 지도 설정 — 표시할 시설물 / 반경 */}
                  <div className="admin-cctv-mapopt">
                    {/* 요약 — 지금 설정으로 지도에 뜬 시설물 수. */}
                    <p className="admin-cctv-mapopt-summary">
                      {!anyClfyOn
                        ? '시설물을 선택하세요'
                        : mapRadiusM === null
                          ? `전체 범위에 속한 시설물 ${mapFacilities.length.toLocaleString()}개`
                          : `반경 ${mapRadiusM >= 1000 ? `${mapRadiusM / 1000}km` : `${mapRadiusM}m`} 안에 속한 시설물 ${mapFacilities.length.toLocaleString()}개`}
                    </p>
                    <div className="admin-cctv-mapopt-row">
                      <span className="admin-cctv-mapopt-label">시설물</span>
                      <div className="admin-cctv-mapopt-items">
                        {CLASSIFICATIONS.filter(
                          (c) => c.code !== 'ETC',
                        ).map((c) => (
                          <label key={c.code}>
                            <input
                              type="checkbox"
                              checked={mapClfyOn[c.code] ?? false}
                              onChange={(e) =>
                                setMapClfyOn((prev) => ({
                                  ...prev,
                                  [c.code]: e.target.checked,
                                }))
                              }
                            />
                            <i
                              style={{
                                background: CLFY_COLOR[c.code] ?? '#7F97AF',
                              }}
                            />
                            {c.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div
                      className={`admin-cctv-mapopt-row ${
                        anyClfyOn ? '' : 'is-off'
                      }`}
                    >
                      <span className="admin-cctv-mapopt-label">반경</span>
                      <div className="admin-cctv-mapopt-items">
                        {RADIUS_OPTIONS.map((o) => (
                          <label key={o.label}>
                            <input
                              type="radio"
                              name="admin-map-radius"
                              checked={o.value === mapRadiusM}
                              disabled={!anyClfyOn}
                              onChange={() => setMapRadiusM(o.value)}
                            />
                            {o.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 우 — 이름·현재 분류·정보·분류 지정 */}
                <div className="admin-cctv-detail-side">
                  <div className="admin-cctv-detail-head">
                    <h2>{selected.name}</h2>
                    <span
                      className={`admin-cctv-status ${playing ? 'is-on' : 'is-off'}`}
                    >
                      {playing ? '재생 중' : '수신 없음'}
                    </span>
                  </div>

                  {/* 1줄: CCTV ID·관리번호 / 2줄: 구분 코드 · PTZ / 3줄: 좌표 */}
                  <dl className="admin-cctv-info">
                    <div className="is-wide">
                      <dt>CCTV ID · 관리번호</dt>
                      <dd>{selected.cctvId}</dd>
                    </div>
                    <div>
                      <dt>구분 코드</dt>
                      <dd>{selected.gbnCd || '-'}</dd>
                    </div>
                    <div>
                      <dt>PTZ</dt>
                      <dd>{selected.ptzYn === 'Y' ? '가능' : '불가'}</dd>
                    </div>
                    <div className="is-wide">
                      <dt>좌표</dt>
                      <dd>
                        {selected.lng}, {selected.lat}
                      </dd>
                    </div>
                  </dl>

                  <div className="admin-cctv-classify">
                    <div className="admin-cctv-classify-head">
                      <h3>시설물 분류</h3>
                      {!editMode && (
                        <button
                          type="button"
                          className="admin-cctv-mode-btn is-on"
                          onClick={() => setEditMode(true)}
                        >
                          편집
                        </button>
                      )}
                    </div>

                    {!editMode && (
                      <div className="admin-cctv-view">
                        {savedGroups.length === 0 ? (
                          <p className="admin-cctv-hint">해당 없음</p>
                        ) : (
                          savedGroups.map((g) => (
                            <p key={g.clfy} className="admin-cctv-view-row">
                              <span className="admin-cctv-view-clfy">
                                {LABEL_BY_CODE[g.clfy] ?? g.clfy}
                              </span>
                              {g.subs.length > 0 && (
                                <>
                                  <span className="admin-cctv-view-sep">/</span>
                                  <span className="admin-cctv-view-subs">
                                    {g.subs
                                      .map((c) => LABEL_BY_CODE[c] ?? c)
                                      .join(', ')}
                                  </span>
                                </>
                              )}
                            </p>
                          ))
                        )}
                      </div>
                    )}

                    {editMode && (
                      <>
                        <div className="admin-cctv-classify-sec">
                          <div className="admin-cctv-chips">
                            {CLASSIFICATIONS.map((c) => (
                              <button
                                key={c.code}
                                type="button"
                                className={`admin-cctv-chip ${
                                  draft.some((f) => f.facClfy === c.code)
                                    ? 'is-on'
                                    : ''
                                }`}
                                onClick={() => toggleClfy(c.code)}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 하위가 있는 시설물을 고른 경우에만 — '해당 없음' 등에는 하위가 없다. */}
                        {subGroups.length > 0 && (
                          <div className="admin-cctv-classify-sec">
                            <h3>하위 분류</h3>
                            {subGroups.map((g) => (
                              <div key={g.code} className="admin-cctv-sub-group">
                                <span className="admin-cctv-sub-title">
                                  {g.label}
                                </span>
                                <div className="admin-cctv-chips">
                                  {g.subs.map((sub) => (
                                    <button
                                      key={sub.code}
                                      type="button"
                                      className={`admin-cctv-chip ${
                                        draft.some(
                                          (f) =>
                                            f.facClfy === g.code &&
                                            f.facSubClfy === sub.code,
                                        )
                                          ? 'is-on'
                                          : ''
                                      }`}
                                      onClick={() => toggleSub(g.code, sub.code)}
                                    >
                                      {sub.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="admin-cctv-actions">
                          {dirty && (
                            <span className="admin-cctv-dirty">
                              저장해야 목록에 반영됩니다
                            </span>
                          )}
                          <button
                            type="button"
                            className="is-ghost"
                            onClick={() => {
                              setDraft(toDraft(saved))
                              setEditMode(false)
                            }}
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={handleSave}
                            disabled={!dirty || saving}
                          >
                            {saving ? '저장 중…' : '저장'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {nameTip && (
        <div
          className="admin-cctv-name-tip"
          style={{ left: `${nameTip.x}px`, top: `${nameTip.y - 8}px` }}
        >
          {nameTip.text}
        </div>
      )}

      {confirmBox && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setConfirmBox(null)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <p>{confirmBox.message}</p>
            <div className="admin-modal-actions">
              {!confirmBox.alertOnly && (
                <button
                  type="button"
                  className="is-ghost"
                  onClick={() => setConfirmBox(null)}
                >
                  취소
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  confirmBox.onOk()
                  setConfirmBox(null)
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
