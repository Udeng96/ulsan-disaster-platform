import { COLORS } from '@/styles/designTokens'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CctvPlayer } from '@/features/shared/cctv-stream/CctvPlayer'
import { ExpandButton } from '@/features/shared/cctv-stream/ExpandButton'
import type { FacilityListItem } from '@/api/facility'
import { getAllLeafIds, type TreeNode } from './tree'
import { MenuButton } from './MenuButton'
import { TreeSelect } from './TreeSelect'
import { Checkbox } from '@/components/inputs/Checkbox'
import {
  VoiceComposer,
  DEFAULT_VOICE_SETTINGS,
  type VoiceSettings,
} from './VoiceComposer'
import type { BroadcastTemplate } from '@/api/broadcastTemplate'
import { LoginModal } from './LoginModal'
import { SignupModal } from './SignupModal'
import {
  fetchRolesDepartments,
  type OmsRolesDepartments,
} from '@/api/eventRole'
import { dispatchBroadcast } from '@/api/broadcastDispatch'
import { dispatchSignboardAlert } from '@/api/signboardAlert'

// 재난 예·경보 사이드 패널 — W 1132 × H 840, col, items-start
// CCTV 영역 없이 지도 + 이 panel 만 본문 차지

interface DisasterPanelProps {
  /** 방송장비 시설물 목록 — DashboardPage 가 fetch 해서 주입 (자동 음성 통보 트리 + 지도 마커 공유). */
  broadcastList: FacilityListItem[]
  /** 재해전광판 시설물 목록 — 재해 문자 전광판 좌측 트리에 사용. */
  signboardList: FacilityListItem[]
  /** 체크박스 선택 변경 시 호출 — DashboardPage 가 받아서 지도 마커 강조 (emphasizedIds) 에 연동. */
  /** 지도 마커 클릭 — 그 시설물을 선택/해제한다. seq 가 바뀔 때만 반영. */
  externalToggle?: { kind: 'voice' | 'sign'; id: number; seq: number } | null
  onSelectionChange?: (
    broadcastIds: readonly number[],
    signboardIds: readonly number[],
  ) => void
  /** 재해 문자 전광판 모드 우측 미리보기 CCTV 목록.
   *  DashboardPage 가 activeSignboardId (마지막 클릭한 시설물) × signboard→CCTV 매핑으로
   *  CCTV cctvId 배열을 만들어 전달.
   *  - 비어있음 → "영상없음" placeholder
   *  - 1 개  → 우측 영역 (522×304) 전체에 단일 video */
  signboardPreviewItems?: { label: string; cctvId?: string }[]
  /** 사인 모드에서 사용자가 마지막으로 "체크 ON" 한 signboard id (uncheck 시 null).
   *  DashboardPage 가 받아서 그 id 에 매칭되는 CCTV 1 개만 미리보기로 표출 — split 안 함. */
  onActiveSignboardChange?: (id: number | null) => void
  /** voice ↔ sign 모드 전환 시 호출 — DashboardPage 가 지도 줌/중심 초기화 트리거.
   *  최초 mount 시에도 1 회 호출 (초기 모드 = voice). */
  onMenuChange?: (menu: 'voice' | 'sign') => void
  /** CCTV 셀 expand(전체화면) 버튼 클릭 — DashboardPage 의 CCTVModal 열기.
   *  shape 을 CCTVMeta 와 맞춰 부모가 openModal 바로 연결. */
  onExpandCctv?: (item: {
    number: number
    name: string
    cctvId?: string
  }) => void
}

type DisasterMenu = 'voice' | 'sign'

export function DisasterPanel({
  broadcastList,
  signboardList,
  externalToggle,
  onSelectionChange,
  signboardPreviewItems,
  onActiveSignboardChange,
  onMenuChange,
  onExpandCctv,
}: DisasterPanelProps) {
  // 두 메뉴는 radio — 항상 하나만 선택. 기본은 자동 음성 통보 (voice).
  // 같은 메뉴 재클릭 시 무시 (radio 는 선택 해제 안 됨).
  const [activeMenu, setActiveMenu] = useState<DisasterMenu>('voice')
  const voiceActive = activeMenu === 'voice'
  const signActive = activeMenu === 'sign'

  // 모드별 체크 상태 — voice (유형별/행정동별 두 tree 공유), sign (전광판 tree).
  // leaf id = `fac-{facilityId}` 만 set 에 저장 — 부모 (카테고리/행정동) 노드의 체크 상태는
  // 자손 leaf 들의 상태에서 derive 되므로, voice 의 두 tree 가 같은 facility 를 자동 동기.
  const [voiceChecked, setVoiceChecked] = useState<Set<string>>(new Set())
  const [signChecked, setSignChecked] = useState<Set<string>>(new Set())

  // 사인 모드 — 마지막으로 "체크 ON" 한 signboard id (id = facility id 숫자, leaf 의 'sign-{n}' 에서 추출).
  // 사용자가 이미 체크된 leaf 를 다시 클릭해 uncheck 하면 → null 로.
  // 다른 leaf 를 ON 으로 토글하면 → 그 id 로 교체. 부모 ('전체') 클릭은 무시 (단일 시설물 활성만 의미있음).
  const [lastActiveSignId, setLastActiveSignId] = useState<number | null>(null)

  // 텍스트 입력 (controlled) — 송출 시 reset 위해 state 로 관리. (재해 문자 전광판 모드에서 사용)
  const [textareaValue, setTextareaValue] = useState('')
  // 로그인 모달 — "로그인 후 송출" 클릭 시 open. 로그인 시 송출 실행.
  const [loginOpen, setLoginOpen] = useState(false)
  // 회원가입 모달 — 로그인 모달의 회원가입 클릭 시 open (로그인 닫고 전환).
  const [signupOpen, setSignupOpen] = useState(false)
  // 권한 확인 완료 여부 — SUCCESS 시 true → 버튼 "권한 확인 후 송출" → "송출" 로 전환.
  const [permissionVerified, setPermissionVerified] = useState(false)
  // 취소 확인 모달 — 송출 상태에서 취소 클릭 시. 진행 시 입력/권한 제거.
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  // 권한 확인 toast — SUCCESS 초록 / FAIL·요청실패 빨강. 일정 시간 후 사라짐.
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(id)
  }, [toast])
  // OMS 이벤트 권한 / 부서 목록 — 권한 확인(evetRoleId) + 권한 등록(부서/권한 리스트) 공용. mount 시 fetch.
  const [rolesDepts, setRolesDepts] = useState<OmsRolesDepartments | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchRolesDepartments()
      .then((data) => {
        if (!cancelled) setRolesDepts(data)
      })
      .catch((err) => console.warn('[roles-departments] fetch 실패', err))
    return () => {
      cancelled = true
    }
  }, [])
  // 현재 모드의 이벤트 권한 id — voice → "음성 방송", sign → "전광판" 이름으로 매칭.
  const evetRoleId = useMemo(() => {
    if (!rolesDepts) return ''
    const kw = voiceActive ? '음성' : '전광판'
    return rolesDepts.eventRoles.find((r) => r.name.includes(kw))?.id ?? ''
  }, [rolesDepts, voiceActive])
  // 전파 대상 트리 펼침 상태 (controlled) — 초기 전부 닫힘. "모두 펼치기" 와 양방향 동기.
  const [voiceExpanded, setVoiceExpanded] = useState<Set<string>>(new Set())
  // 자동 음성 통보 컴포저 — 제목 + 방송 설정 (모드 전환/초기화 시 reset).
  const [titleValue, setTitleValue] = useState('')
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(
    DEFAULT_VOICE_SETTINGS,
  )

  // 마지막 송출 결과 — 송출 버튼 좌측 표출. null 이면 미표출.
  //   voice: "성공 / 전체" 카운트
  //   sign : 현재 표출 중인 전광판 목록 (응답 targetHosts — 이전 송출분 포함)
  // 모드 전환 / 선택 변경 시에도 유지 — 다음 송출 또는 페이지 떠날 때까지 잔존.
  const [lastDispatchResult, setLastDispatchResult] = useState<
    | { kind: 'count'; success: number; total: number }
    | { kind: 'hosts'; hosts: string[] }
    | null
  >(null)

  // 모드 전환 시 비활성 쪽 체크 초기화. sign 떠나면 lastActiveSignId 도 reset.
  // 텍스트 입력 / 마지막 송출 결과도 초기화 — 모드별 컨텍스트 섞임 방지.
  // (onMenuChange 콜백은 버튼 onClick 에서 직접 호출 — useEffect 에 두면 onMenuChange 가
  //  매 렌더마다 새 함수라 deps 로 들어가면 무한 fire, 빼도 mount 시 1 회 fire 돼 의도와 어긋남.)
  useEffect(() => {
    if (activeMenu !== 'voice') setVoiceChecked(new Set())
    if (activeMenu !== 'sign') {
      setSignChecked(new Set())
      setLastActiveSignId(null)
    }
    setTextareaValue('')
    setTitleValue('')
    setVoiceSettings(DEFAULT_VOICE_SETTINGS)
    setLastDispatchResult(null)
    setPermissionVerified(false)
  }, [activeMenu])

  // 모드 토글 — radio 동작 (같은 모드 재클릭은 noop). 실제로 모드가 바뀔 때만 onMenuChange fire.
  const handleSelectMenu = (next: DisasterMenu) => {
    if (next === activeMenu) return
    setActiveMenu(next)
    onMenuChange?.(next)
  }

  // 템플릿 선택 → 제목 + 내용 자동 입력.
  const handleSelectTemplate = (t: BroadcastTemplate) => {
    if (permissionVerified) return // 권한 확인 후엔 편집 잠금
    setTitleValue(t.title)
    setTextareaValue(t.content)
  }
  // 초기화 — 제목 + 내용 + 방송 설정(기본값). 전파 대상 트리는 유지. (확인 모달은 VoiceComposer 가 처리)
  const handleVoiceReset = () => {
    setTitleValue('')
    setTextareaValue('')
    setVoiceSettings(DEFAULT_VOICE_SETTINGS)
  }
  // 미리듣기 — ⚠️ placeholder (TTS 미리듣기 연동 확정 후).
  const handleVoicePreview = () => {}

  // lastActiveSignId 변경 시 부모 (DashboardPage) 에 통보 → 단일 CCTV preview 결정.
  useEffect(() => {
    onActiveSignboardChange?.(lastActiveSignId)
  }, [lastActiveSignId, onActiveSignboardChange])

  // 체크 상태 → 부모 (DashboardPage) 에 facility id 배열로 전달 (지도 마커 강조용).
  // leaf id 패턴: voice = `fac-{id}`, sign = `sign-{id}`. 숫자 파싱 후 배열로.
  useEffect(() => {
    if (!onSelectionChange) return
    const broadcastIds: number[] = []
    voiceChecked.forEach((id) => {
      if (!id.startsWith('fac-')) return
      const n = Number(id.slice(4))
      if (Number.isFinite(n)) broadcastIds.push(n)
    })
    const signboardIds: number[] = []
    signChecked.forEach((id) => {
      if (!id.startsWith('sign-')) return
      const n = Number(id.slice(5))
      if (Number.isFinite(n)) signboardIds.push(n)
    })
    onSelectionChange(broadcastIds, signboardIds)
  }, [voiceChecked, signChecked, onSelectionChange])

  // 지도 마커 클릭 → 해당 leaf 체크 토글 (패널 목록에서 고른 것과 같은 효과).
  const externalSeqRef = useRef(externalToggle?.seq ?? 0)
  useEffect(() => {
    if (!externalToggle) return
    if (externalToggle.seq === externalSeqRef.current) return
    externalSeqRef.current = externalToggle.seq
    if (permissionVerified) return // 권한 확인 후엔 대상 편집 잠금
    if (externalToggle.kind === 'voice') {
      const leafId = `fac-${externalToggle.id}`
      setVoiceChecked((prev) => {
        const next = new Set(prev)
        if (next.has(leafId)) next.delete(leafId)
        else next.add(leafId)
        return next
      })
      return
    }
    const leafId = `sign-${externalToggle.id}`
    const wasChecked = signChecked.has(leafId)
    setSignChecked((prev) => {
      const next = new Set(prev)
      if (next.has(leafId)) next.delete(leafId)
      else next.add(leafId)
      return next
    })
    // 미리보기 CCTV 기준이 되는 '마지막 활성 전광판' 갱신.
    setLastActiveSignId((prev) =>
      wasChecked
        ? prev === externalToggle.id
          ? null
          : prev
        : externalToggle.id,
    )
  }, [externalToggle, permissionVerified, signChecked])

  // voice 모드 toggle — leaf 일괄 add/delete (부모 클릭 시 자손 전체 토글).
  const handleVoiceToggle = (node: TreeNode) => {
    if (permissionVerified) return // 권한 확인 후엔 대상 편집 잠금
    setVoiceChecked((prev) => {
      const next = new Set(prev)
      const leafs = getAllLeafIds(node)
      const fully = leafs.every((id) => next.has(id))
      if (fully) leafs.forEach((id) => next.delete(id))
      else leafs.forEach((id) => next.add(id))
      return next
    })
  }

  // 전파 대상 선택 카운트 — voiceChecked 의 leaf(fac-) 수 / 전체 방송장비 수.
  const voiceSelectedCount = useMemo(() => {
    let n = 0
    voiceChecked.forEach((id) => {
      if (id.startsWith('fac-')) n++
    })
    return n
  }, [voiceChecked])
  const voiceTotalCount = broadcastList.length

  // 사인 모드 — 선택된 전광판 leaf(sign-) 수 / 전체 전광판 수.
  const signSelectedCount = useMemo(() => {
    let n = 0
    signChecked.forEach((id) => {
      if (id.startsWith('sign-')) n++
    })
    return n
  }, [signChecked])
  const signTotalCount = signboardList.length

  // 송출 버튼 활성 조건 — 송출 대상 선택 + 내용 필수. voice 는 제목도 필수 (sign 은 제목 없음).
  //   하나라도 비면 disabled.
  const sendTargetCount = voiceActive ? voiceSelectedCount : signSelectedCount
  const sendDisabled =
    sendTargetCount === 0 ||
    !textareaValue.trim() ||
    (voiceActive && !titleValue.trim())

  // sign 모드 toggle — set 갱신 + leaf 클릭의 경우 lastActiveSignId 추적.
  //   - leaf check ON 으로 가는 경우 → 그 id 로 set
  //   - leaf check OFF (이미 체크된 leaf 클릭) → 그게 last 였으면 null
  //   - 부모 ('전체') 클릭 → lastActiveSignId 건드리지 않음 (multi-leaf 작업의 활성 의미 모호).
  const handleSignToggle = (node: TreeNode) => {
    if (permissionVerified) return // 권한 확인 후엔 대상 편집 잠금
    const isLeaf = !node.children || node.children.length === 0
    setSignChecked((prev) => {
      const next = new Set(prev)
      const leafs = getAllLeafIds(node)
      const fully = leafs.every((id) => next.has(id))
      if (fully) leafs.forEach((id) => next.delete(id))
      else leafs.forEach((id) => next.add(id))
      return next
    })
    if (!isLeaf) return
    // leaf — id 패턴 'sign-{n}'.
    const m = /^sign-(\d+)$/.exec(node.id)
    if (!m) return
    const signId = Number(m[1])
    const wasChecked = signChecked.has(node.id) // 토글 직전 상태
    if (!wasChecked) {
      // OFF → ON
      setLastActiveSignId(signId)
    } else if (lastActiveSignId === signId) {
      // ON → OFF, 그게 활성이었음 → 해제
      setLastActiveSignId(null)
    }
  }

  // 송출 — 활성 모드의 leaf 체크 수를 "선택수" 로, success = total (시뮬) 로 처리.
  // 결과 카운트는 송출 버튼 좌측에 표출, textarea 는 초기화.
  // 선택 0 개면 송출 무시 (카운트도 갱신 안 함).
  const handleDispatch = async () => {
    if (activeMenu === 'voice') {
      // 선택된 단말 id (fac-{n} → n).
      const terminalIds: number[] = []
      voiceChecked.forEach((id) => {
        const m = /^fac-(\d+)$/.exec(id)
        if (m) terminalIds.push(Number(m[1]))
      })
      if (terminalIds.length === 0) return
      let result
      try {
        result = await dispatchBroadcast({
          title: titleValue,
          content: textareaValue,
          alertSound: voiceSettings.alertSound,
          terminalIds,
        })
      } catch (err) {
        console.warn('[dispatch] 송출 요청 실패', err)
        setToast({
          message: '송출 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.',
          type: 'error',
        })
        return // 요청 자체 실패 — 입력/권한 유지 (재시도 가능).
      }
      // status FAILED — 모듈 거부/연결 실패. 이력은 저장됐지만 입력/권한 유지.
      if (result.status !== 'SUCCESS') {
        setToast({ message: '송출에 실패했습니다.', type: 'error' })
        return
      }
      setLastDispatchResult({
        kind: 'count',
        success: terminalIds.length,
        total: terminalIds.length,
      })
      setToast({ message: '송출되었습니다.', type: 'success' })
      // 송출 성공 → 초기화 + 권한 해제.
      setTextareaValue('')
      setTitleValue('')
      setVoiceSettings(DEFAULT_VOICE_SETTINGS)
      setVoiceChecked(new Set())
      setPermissionVerified(false)
      return
    }
    // sign 모드 — 전광판 송출. 선택 전광판의 host(도메인) 를 targetHosts 로.
    const selectedBoards: FacilityListItem[] = []
    signChecked.forEach((id) => {
      const m = /^sign-(\d+)$/.exec(id)
      if (!m) return
      const board = signboardList.find((s) => s.id === Number(m[1]))
      if (board) selectedBoards.push(board)
    })
    if (selectedBoards.length === 0) return
    const targetHosts = selectedBoards
      .map((b) => b.host)
      .filter((h): h is string => !!h)
    if (targetHosts.length === 0) {
      setToast({
        message: '선택한 전광판에 송출 도메인이 없습니다.',
        type: 'error',
      })
      return
    }
    let displayingHosts: string[] = targetHosts
    try {
      const res = await dispatchSignboardAlert({
        msgCn: textareaValue,
        targetHosts,
      })
      if (!res.success) {
        setToast({
          message: res.message ?? '송출에 실패했습니다.',
          type: 'error',
        })
        return
      }
      // 응답이 현재 표출 중인 전광판을 알려주면 그걸로 (이전 송출분 포함).
      if (res.displayingHosts?.length) displayingHosts = res.displayingHosts
    } catch (err) {
      console.warn('[signboard] 송출 요청 실패', err)
      setToast({
        message: '송출 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        type: 'error',
      })
      return
    }
    // 현재 표출 중인 전광판 목록 표출 (이전 송출분 포함).
    setLastDispatchResult({ kind: 'hosts', hosts: displayingHosts })
    setToast({ message: '송출되었습니다.', type: 'success' })
    setTextareaValue('')
    setTitleValue('')
    setVoiceSettings(DEFAULT_VOICE_SETTINGS)
    setSignChecked(new Set())
    setPermissionVerified(false)
  }

  // 취소 — 입력한 내용 + 권한 제거하고 편집 모드로 복귀.
  const handleCancel = () => {
    setConfirmCancelOpen(false)
    setTitleValue('')
    setTextareaValue('')
    setVoiceSettings(DEFAULT_VOICE_SETTINGS)
    if (activeMenu === 'voice') setVoiceChecked(new Set())
    else setSignChecked(new Set())
    setPermissionVerified(false)
  }

  // 좌측 전파 대상 tree — 4 level: 전체 > (건물 타입 / 지역별) > 그룹 > facility.
  //   건물 타입: 백엔드 groupType 기준 (없으면 '기타'), 가나다순. 지역별: 행정동 기준.
  //   leaf id 는 두 branch 모두 `fac-{id}` — 어느 쪽에서 체크해도 같은 시설이 동기 (voiceChecked 공유).
  const voiceTree = useMemo<TreeNode[]>(() => {
    const byType = new Map<string, FacilityListItem[]>()
    const byRegion = new Map<string, FacilityListItem[]>()
    for (const f of broadcastList) {
      const typeKey = f.groupType?.trim() || '기타'
      const regionKey = f.region?.trim() || '미지정'
      const tList = byType.get(typeKey)
      if (tList) tList.push(f)
      else byType.set(typeKey, [f])
      const rList = byRegion.get(regionKey)
      if (rList) rList.push(f)
      else byRegion.set(regionKey, [f])
    }
    const toFacNodes = (facilities: FacilityListItem[]): TreeNode[] =>
      [...facilities]
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
        .map((f) => ({ id: `fac-${f.id}`, label: f.name }))
    const typeNodes: TreeNode[] = [...byType.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'ko'))
      .map(([type, facilities]) => ({
        id: `type-${type}`,
        label: type,
        children: toFacNodes(facilities),
      }))
    const regionNodes: TreeNode[] = [...byRegion.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'ko'))
      .map(([region, facilities]) => ({
        id: `vregion-${region}`,
        label: region,
        children: toFacNodes(facilities),
      }))
    return [
      { id: 'branch-region', label: '행정동별', children: regionNodes },
      { id: 'branch-type', label: '유형별', children: typeNodes },
    ]
  }, [broadcastList])

  // 표출 중 전광판 이름 — 결과 host 를 signboardList 로 매핑 (미매칭 시 host 그대로).
  const displayingNames = useMemo(() => {
    if (lastDispatchResult?.kind !== 'hosts') return []
    return lastDispatchResult.hosts.map(
      (h) => signboardList.find((s) => s.host === h)?.name ?? h,
    )
  }, [lastDispatchResult, signboardList])

  // 트리 펼침 제어 — children 있는 부모 노드 id 전체. "모두 펼치기" 판정/토글용.
  const voiceExpandableIds = useMemo(() => {
    const ids: string[] = []
    const walk = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.children?.length) {
          ids.push(n.id)
          walk(n.children)
        }
      }
    }
    walk(voiceTree)
    return ids
  }, [voiceTree])
  // 모두 펼침 여부 — expandable 전부 열려있으면 true (직접 다 펼쳐도 자동 체크).
  const voiceAllExpanded =
    voiceExpandableIds.length > 0 &&
    voiceExpandableIds.every((id) => voiceExpanded.has(id))
  const handleVoiceToggleExpand = (id: string) => {
    setVoiceExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  // 모두 펼치기 — 다 열려있으면 전부 닫고, 아니면 전부 펼침.
  const handleVoiceToggleExpandAll = () => {
    setVoiceExpanded(voiceAllExpanded ? new Set() : new Set(voiceExpandableIds))
  }

  // 재해전광판 목록 — flat list (트리 아님). 각 항목이 독립 체크박스 카드.
  // id = `sign-{facilityId}` — signChecked set 의 키. voice 의 fac-* 와 namespace 분리.
  // 운영 DB 가 같은 이름 (가상시설0302로/삼호 등) 을 중복 insert 한 케이스 보호 — 이름 기준 dedup
  // (가장 작은 id 유지). dev 데이터는 영향 없음.
  const signItems = useMemo<TreeNode[]>(() => {
    const byName = new Map<string, FacilityListItem>()
    for (const f of signboardList) {
      const prev = byName.get(f.name)
      if (!prev || f.id < prev.id) byName.set(f.name, f)
    }
    return [...byName.values()]
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      .map((f) => ({ id: `sign-${f.id}`, label: f.name }))
  }, [signboardList])

  // CCTV 그리드 슬롯 — 3열 × 2행 = 6칸. signboardPreviewItems 를 앞에서부터 채우고
  // 나머지는 null (빈 셀 = "전광판을 선택해 주세요" placeholder).
  const cctvSlots = useMemo(() => {
    const previews = signboardPreviewItems ?? []
    return Array.from({ length: 6 }, (_, i) => previews[i] ?? null)
  }, [signboardPreviewItems])

  // CCTV 셀 닫기(✕) — 라벨로 매칭되는 전광판 항목을 체크 해제.
  const handleCctvClose = (label: string) => {
    const item = signItems.find((n) => n.label === label)
    if (item && signChecked.has(item.id)) handleSignToggle(item)
  }

  return (
    <div
      className="flex flex-col items-start"
      style={{
        width: '1132px',
        height: '840px',
        borderRadius: '16px',
        background: COLORS.neutral600,
      }}
    >
      {/* 헤더 — padding 20, col, items-start, gap 10, self-stretch, border-bottom Neutral-400 */}
      <div
        className="flex flex-col items-start self-stretch"
        style={{
          padding: '20px',
          gap: '10px',
          borderBottom: `1px solid ${COLORS.neutral450}`,
        }}
      >
        {/* 두 메뉴 button (가로 정렬, radio — 항상 하나만 선택).
            헤더 폭을 반씩 나눠 가져 각 버튼 안에서 라벨이 정확히 가운데 온다. */}
        <div
          className="flex items-center self-stretch"
          style={{ gap: '8px' }}
        >
          <MenuButton
            active={voiceActive}
            label="자동 음성 통보"
            onClick={() => handleSelectMenu('voice')}
          />
          <MenuButton
            active={signActive}
            label="재해 문자 전광판"
            onClick={() => handleSelectMenu('sign')}
          />
        </div>
      </div>

      {/* body — 헤더/푸터 사이 채움. voice = 2컬럼(전파대상 + 컴포저), sign = 기존(트리+미리보기+textarea) */}
      <div
        className="flex flex-col items-start self-stretch"
        style={{ flex: '1 0 0', minHeight: 0, padding: '20px', gap: '20px' }}
      >
        {voiceActive ? (
          /* 메인 — flex, gap 36, align flex-start (1092×616, 부모 채움) */
          <div
            className="flex items-start self-stretch"
            style={{ gap: '36px', height: '100%', minHeight: 0 }}
          >
            {/* 좌 — 전파 대상 선택 (Figma: width 350, gap 16, flex-shrink 0, align-self stretch) */}
            <div
              className="flex flex-col"
              style={{
                width: '350px',
                gap: '16px',
                flexShrink: 0,
                alignSelf: 'stretch',
                alignItems: 'center',
                minHeight: 0,
              }}
            >
              {/* 헤더 — 전파 대상 선택 (선택 N/M) + 모두 펼치기 */}
              <div
                className="flex items-center self-stretch"
                style={{ gap: '8px' }}
              >
                <span
                  style={{
                    color: COLORS.neutral100,
                    fontFamily: 'Roboto',
                    fontSize: '18px',
                    fontWeight: 500,
                    lineHeight: '1',
                    whiteSpace: 'nowrap',
                  }}
                >
                  전파 대상 선택
                </span>
                <span
                  style={{
                    color: COLORS.neutral300,
                    fontFamily: 'Roboto',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '1',
                    flex: '1 0 0',
                    whiteSpace: 'nowrap',
                  }}
                >
                  (선택 {voiceSelectedCount}/{voiceTotalCount})
                </span>
                {/* 모두 펼치기 — 트리 펼침과 양방향 동기 (다 펼치면 자동 체크) */}
                <button
                  type="button"
                  className="flex items-center"
                  style={{ gap: '6px' }}
                  onClick={handleVoiceToggleExpandAll}
                  aria-pressed={voiceAllExpanded}
                >
                  <Checkbox
                    state={voiceAllExpanded ? 'checked' : 'unchecked'}
                    size={18}
                  />
                  <span
                    style={{
                      color: COLORS.neutral200,
                      fontFamily: 'Roboto',
                      fontSize: '14px',
                      fontWeight: 500,
                      lineHeight: '1',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    모두 펼치기
                  </span>
                </button>
              </div>
              {/* 트리 — 남은 높이 채우고 스크롤 */}
              <div
                className="scrollbar-custom flex flex-col items-start self-stretch"
                style={{
                  flex: '1 0 0',
                  minHeight: 0,
                  overflowY: 'auto',
                  gap: '4px',
                  padding: '8px',
                  borderRadius: '12px',
                  border: `1px solid ${COLORS.neutral450}`,
                  background: COLORS.neutral800,
                }}
              >
                <TreeSelect
                  data={voiceTree}
                  checked={voiceChecked}
                  onToggle={handleVoiceToggle}
                  expanded={voiceExpanded}
                  onToggleExpand={handleVoiceToggleExpand}
                />
              </div>
            </div>
            {/* 우 — 컴포저 (텍스트 입력 + 메시지 템플릿 + 방송 설정) */}
            <VoiceComposer
              title={titleValue}
              onTitleChange={setTitleValue}
              content={textareaValue}
              onContentChange={setTextareaValue}
              settings={voiceSettings}
              onSettingsChange={(patch) =>
                setVoiceSettings((prev) => ({ ...prev, ...patch }))
              }
              onSelectTemplate={handleSelectTemplate}
              onReset={handleVoiceReset}
              onPreview={handleVoicePreview}
              locked={permissionVerified}
            />
          </div>
        ) : (
          /* 재해 문자 전광판 — 새 디자인 골격.
             ⚠️ 치수/스타일은 Figma 스펙 배선 예정 — 지금은 영역만 잡아둔 상태. */
          <div
            className="flex flex-col self-stretch"
            style={{ gap: '40px', flex: '1 0 0', minHeight: 0 }}
          >
            {/* 전광판 영역 — 좌 전광판 선택(292) + 우 CCTV 그리드. W 1092 × H 416, gap 16 */}
            <div
              className="flex items-center"
              style={{ width: '1092px', height: '416px', gap: '16px' }}
            >
              {/* 좌 — 송출 대상 전광판 선택 (292, col, gap 8) */}
              <div
                className="flex flex-col"
                style={{
                  width: '292px',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  gap: '8px',
                  flexShrink: 0,
                  alignSelf: 'stretch',
                }}
              >
                {/* 제목 — space-between, padding-left 2 */}
                <div
                  className="flex items-center self-stretch"
                  style={{
                    paddingLeft: '2px',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      color: COLORS.neutral200,
                      fontFamily: 'Roboto',
                      fontSize: '18px',
                      fontWeight: 500,
                      lineHeight: '1',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    송출 대상 전광판 선택
                  </span>
                  <span
                    style={{
                      color: COLORS.neutral200,
                      fontFamily: 'Roboto',
                      fontSize: '18px',
                      fontWeight: 500,
                      lineHeight: '1',
                      textAlign: 'right',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    (선택 {signSelectedCount}/{signTotalCount})
                  </span>
                </div>
                {/* 내역 박스 — padding 10, gap 6, flex 1, radius 12, border + bg, 스크롤 */}
                <div
                  className="scrollbar-custom flex flex-col items-start self-stretch"
                  style={{
                    padding: '10px',
                    gap: '6px',
                    flex: '1 0 0',
                    minHeight: 0,
                    overflowY: 'auto',
                    borderRadius: '12px',
                    border: `1px solid ${COLORS.neutral450}`,
                    background: COLORS.neutral800,
                  }}
                >
                  {/* 내역 아이템 — 각각 독립 체크박스 카드 (padding 16/10, gap 10) */}
                  {signItems.map((node) => {
                    const isChecked = signChecked.has(node.id)
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => handleSignToggle(node)}
                        className="flex items-center self-stretch"
                        style={{
                          padding: '16px 10px',
                          gap: '10px',
                          borderRadius: '6px',
                          border: isChecked
                            ? `2px solid ${COLORS.primaryLight}`
                            : `1px solid ${COLORS.neutral450}`,
                          background: isChecked
                            ? COLORS.neutral450
                            : COLORS.neutral600,
                        }}
                      >
                        <Checkbox
                          state={isChecked ? 'checked' : 'unchecked'}
                          size={18}
                        />
                        <span
                          style={{
                            color: COLORS.white,
                            fontFamily: 'Roboto',
                            fontSize: '18px',
                            fontWeight: 500,
                            lineHeight: '1',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {node.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* 우 — 선택한 전광판 CCTV (제목 + 3×2 그리드) */}
              <div
                className="flex flex-col"
                style={{
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  gap: '8px',
                  flex: '1 0 0',
                  minWidth: 0,
                  alignSelf: 'stretch',
                }}
              >
                {/* 제목부분 — 제목 + 우측 안내 문구 */}
                <div
                  className="flex items-center self-stretch"
                  style={{ paddingLeft: '2px' }}
                >
                  <span
                    style={{
                      color: COLORS.neutral50,
                      fontFamily: 'Roboto',
                      fontSize: '18px',
                      fontWeight: 500,
                      lineHeight: '1',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    선택한 전광판 CCTV
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      color: COLORS.neutral200,
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: 400,
                      lineHeight: '20px',
                      letterSpacing: '-0.14px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ⓘ 전광판을 선택하면 선택한 순서대로 CCTV 영상이 표시됩니다.
                  </span>
                </div>
                {/* CCTV 전체 영역 — 2행. 그리드 전체를 감싸는 박스(radius 12 는 여기에만).
                    높이는 셀(180×2)에 맞춰 auto — 16:9 를 지키면 세로가 남기 때문. */}
                <div
                  className="flex flex-col self-stretch"
                  style={{
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    flexShrink: 0,
                    borderRadius: '12px',
                    border: '1px solid rgba(127, 151, 175, 0.50)',
                    background: COLORS.neutral800,
                    overflow: 'hidden',
                  }}
                >
                  {[cctvSlots.slice(0, 3), cctvSlots.slice(3, 6)].map(
                    (row, ri) => (
                      <div key={ri} className="flex items-center">
                        {row.map((slot, ci) =>
                          slot ? (
                            /* 선택된 셀 — rounded outer(radius 12 + rgba border + #001A38)
                               + 헤더(#002A54) + player 메인(border 2px #1B4671, bg #001229) */
                            <div
                              key={ci}
                              className="flex flex-col"
                              style={{
                                width: '260px',
                                height: '180px',
                                border: `2px solid ${COLORS.neutral450}`,
                                flexShrink: 0,
                              }}
                            >
                              {/* 헤더 — 이름 + 닫기(✕). 색은 다른 탭 CctvPlayer 헤더와 동일 */}
                              <div
                                className="flex items-center"
                                style={{
                                  height: '32px',
                                  padding: '6px 10px',
                                  gap: '7px',
                                  background: 'rgba(0, 26, 56, 0.80)',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.20)',
                                  flexShrink: 0,
                                }}
                              >
                                <span
                                  style={{
                                    flex: '1 0 0',
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: '#FFF',
                                    fontFamily: 'Roboto',
                                    fontSize: '15px',
                                    fontWeight: 500,
                                    lineHeight: '16px',
                                  }}
                                >
                                  {slot.label}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCctvClose(slot.label)}
                                  className="flex items-center justify-center"
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    flexShrink: 0,
                                  }}
                                  aria-label="닫기"
                                >
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                    aria-hidden
                                  >
                                    <path
                                      d="M1 1L11 11M11 1L1 11"
                                      stroke={COLORS.neutral200}
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </button>
                              </div>
                              {/* player 메인 영역 — Xeus 영상 + 전체화면 버튼 (border 는 셀이 가짐) */}
                              <div
                                style={{
                                  position: 'relative',
                                  flex: '1 0 0',
                                  minHeight: 0,
                                  background: COLORS.neutral900,
                                  overflow: 'hidden',
                                }}
                              >
                                {/* 공용 CCTV 플레이어 (다른 메뉴와 동일) — 영상 영역 256×144 (16:9) */}
                                <CctvPlayer
                                  cctvId={slot.cctvId}
                                  width={256}
                                  height={144}
                                />
                                {/* expand — 다른 탭과 동일한 공용 ExpandButton (32×32, bottom12 right12) */}
                                <ExpandButton
                                  onClick={() =>
                                    onExpandCctv?.({
                                      number: ri * 3 + ci + 1,
                                      name: slot.label,
                                      cctvId: slot.cctvId,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          ) : (
                            /* 빈 셀 — 헤더 바 유지(이름 없음) + 재생 아이콘 placeholder */
                            <div
                              key={ci}
                              className="flex flex-col"
                              style={{
                                width: '260px',
                                height: '180px',
                                border: `2px solid ${COLORS.neutral450}`,
                                flexShrink: 0,
                              }}
                            >
                              {/* 헤더 — 미선택: 다른 탭과 동일하게 "할당된 CCTV 없음" (배지/✕ 없음) */}
                              <div
                                className="flex items-center"
                                style={{
                                  height: '32px',
                                  padding: '6px 10px',
                                  gap: '7px',
                                  background: 'rgba(0, 26, 56, 0.80)',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.20)',
                                  flexShrink: 0,
                                }}
                              >
                                <span
                                  style={{
                                    color: '#FFF',
                                    fontFamily: 'Roboto',
                                    fontSize: '15px',
                                    fontWeight: 500,
                                    lineHeight: '16px',
                                  }}
                                >
                                  할당된 CCTV 없음
                                </span>
                              </div>
                              {/* 무CCTV placeholder — 다른 탭과 동일 (CctvPlayer, 스트림 없음) */}
                              <CctvPlayer
                                cctvId={undefined}
                                width={256}
                                height={144}
                              />
                            </div>
                          ),
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
            {/* 하단 — 텍스트 입력 (남은 높이 채움) */}
            <div
              className="flex flex-col items-start self-stretch"
              style={{ gap: '8px', flex: '1 0 0', minHeight: 0 }}
            >
              <span
                style={{
                  color: COLORS.neutral100,
                  fontFamily: 'Roboto',
                  fontSize: '18px',
                  fontWeight: 500,
                  lineHeight: '1',
                }}
              >
                텍스트 입력
              </span>
              {/* Input 박스 — padding 12, flex 1, 스크롤, 글씨 24px */}
              <textarea
                className="disaster-textarea scrollbar-custom"
                placeholder="내용을 입력해 주세요."
                value={textareaValue}
                readOnly={permissionVerified}
                onChange={(e) => setTextareaValue(e.target.value)}
                style={{
                  alignSelf: 'stretch',
                  flex: '1 0 0',
                  minHeight: 0,
                  padding: '12px',
                  resize: 'none',
                  overflowY: 'auto',
                  color: '#FFF',
                  fontFamily: 'Roboto',
                  fontSize: '24px',
                  fontWeight: 500,
                  lineHeight: '150%',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* footer — H 72, padding 16, row, justify-end, items-center, gap 12, shrink-0, self-stretch
          radius 0 0 20 20 (하단 모서리), border-top 1px Neutral-400 */}
      <div
        className="flex shrink-0 items-center justify-end self-stretch"
        style={{
          height: '72px',
          padding: '16px',
          gap: '12px',
          borderRadius: '0 0 20px 20px',
          borderTop: `1px solid ${COLORS.neutral450}`,
        }}
      >
        {/* 송출 결과 — voice: "성공 N / 선택 M" / sign: "표출 중 N곳 · 이름…". null 시 미표출. */}
        {lastDispatchResult?.kind === 'count' && (
          <span
            style={{
              color: COLORS.neutral100,
              fontFamily: 'Roboto',
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: '1',
              letterSpacing: '-0.2px',
            }}
          >
            <span style={{ color: COLORS.primaryDark, fontWeight: 700 }}>
              {lastDispatchResult.success}
            </span>
            <span style={{ opacity: 0.6, margin: '0 4px' }}>/</span>
            <span style={{ fontWeight: 700 }}>{lastDispatchResult.total}</span>
            <span style={{ opacity: 0.6, marginLeft: '6px', fontSize: '12px' }}>
              송출 성공
            </span>
          </span>
        )}
        {lastDispatchResult?.kind === 'hosts' && (
          <span
            style={{
              // 버튼 좌측에 붙임 (footer justify-end) — 길면 말줄임.
              maxWidth: '620px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: COLORS.neutral100,
              fontFamily: 'Roboto',
              fontSize: '14px',
              fontWeight: 500,
              // overflow:hidden 이라 line-height 1 이면 한글 윗부분이 잘림 → 글자 높이 확보.
              lineHeight: '20px',
              letterSpacing: '-0.2px',
              // 버튼 라벨(padding-top 2~4px)과 수평 맞춤.
              position: 'relative',
              top: '2px',
            }}
            title={displayingNames.join(', ')}
          >
            <span style={{ opacity: 0.6, fontSize: '12px', marginRight: '6px' }}>
              표출 중
            </span>
            <span style={{ color: COLORS.primaryDark, fontWeight: 700 }}>
              {lastDispatchResult.hosts.length}곳
            </span>
            {displayingNames.length > 0 && (
              <span style={{ opacity: 0.6, margin: '0 6px' }}>·</span>
            )}
            <span style={{ fontWeight: 500 }}>{displayingNames.join(', ')}</span>
          </span>
        )}
        {/* 취소 button — 권한 확인(송출) 상태에서만. 클릭 시 취소 확인 모달. */}
        {permissionVerified && (
          <button
            type="button"
            onClick={() => setConfirmCancelOpen(true)}
            className="login-btn-outline flex items-center justify-center"
            style={{
              width: '100px',
              height: '40px',
              paddingTop: '2px',
              borderRadius: '8px',
              color: COLORS.white,
              fontFamily: 'Roboto',
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: '1',
            }}
          >
            취소
          </button>
        )}
        {/* 송출 button — 권한 확인 전: "권한 확인 후 송출"(모달 open) / 확인 후: "송출"(바로 송출).
            대상 선택·(제목)·내용 비면 disabled. */}
        <button
          type="button"
          onClick={() => {
            if (permissionVerified) {
              handleDispatch()
            } else {
              setLoginOpen(true)
            }
          }}
          disabled={sendDisabled}
          className="disaster-send-btn flex items-center justify-center"
          style={{
            width: '160px',
            height: '40px',
            paddingTop: '4px',
            gap: '8px',
            borderRadius: '8px',
            color: COLORS.white,
            fontFamily: 'Roboto',
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: '1',
          }}
        >
          {permissionVerified ? '송출' : '권한 확인'}
        </button>
      </div>

      {/* 권한 확인 모달 — 송출 버튼 클릭 시 open.
          SUCCESS → 모달 닫고 permissionVerified (버튼 "송출" 로) / FAIL → 빨간 toast. */}
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        evetRoleId={evetRoleId}
        onVerified={(message) => {
          setLoginOpen(false)
          setPermissionVerified(true)
          setLastDispatchResult(null) // "송출 성공" 카운트 초기화
          setToast({ message, type: 'success' })
        }}
        onError={(message) => setToast({ message, type: 'error' })}
        onSignup={() => {
          setLoginOpen(false)
          setSignupOpen(true)
        }}
      />
      {/* 회원가입(권한 등록) 모달 — 부서/이벤트 권한 리스트는 roles-departments 에서. */}
      <SignupModal
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        departments={rolesDepts?.departments ?? []}
        eventRoles={rolesDepts?.eventRoles ?? []}
        onToast={(message, type) => setToast({ message, type })}
        onSuccess={() => {
          // 등록 성공 → 권한 확인 모달로 전환 + 초록 toast.
          setSignupOpen(false)
          setLoginOpen(true)
          setToast({ message: '권한 등록이 완료되었습니다.', type: 'success' })
        }}
      />

      {/* 취소 확인 모달 — 초기화 컨펌 디자인 재사용. 진행 시 입력/권한 제거 후 편집 모드. */}
      {confirmCancelOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 5000, background: 'rgba(0, 0, 0, 0.50)' }}
        >
          <div
            className="flex flex-col items-start"
            style={{
              width: '408px',
              height: '234px',
              borderRadius: '16px',
              border: '1px solid #1B4671',
              background: '#002247',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* header — 제목 + 닫기 */}
            <div
              className="flex items-center self-stretch"
              style={{ padding: '14px 24px', gap: '16px' }}
            >
              <span
                style={{
                  flex: '1 0 0',
                  color: '#FFF',
                  fontFamily: 'Roboto',
                  fontSize: '18px',
                  fontWeight: 500,
                  lineHeight: '1',
                }}
              >
                취소
              </span>
              <button
                type="button"
                onClick={() => setConfirmCancelOpen(false)}
                aria-label="닫기"
                className="flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 22 22"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M10.9883 11.9946L17.4942 18.5005L18.5054 17.4893L11.9995 10.9834L18.5054 4.47755L17.4942 3.46639L10.9883 9.97226L4.47894 3.46289L3.46777 4.47405L9.97715 10.9834L3.46777 17.4928L4.47894 18.504L10.9883 11.9946Z"
                    fill="#F3F4F6"
                  />
                </svg>
              </button>
            </div>
            {/* main — 안내 (남은 높이 채우고 세로 중앙) */}
            <div
              className="flex flex-col items-start self-stretch"
              style={{
                flex: '1 0 0',
                minHeight: 0,
                justifyContent: 'center',
                padding: '24px',
                gap: '10px',
              }}
            >
              <span
                style={{
                  color: '#DCE6EE',
                  fontFamily: 'Roboto',
                  fontSize: '15px',
                  fontWeight: 400,
                  lineHeight: '1.5',
                }}
              >
                취소할 경우 입력한 내용 및 권한이 제거됩니다.
                <br />
                진행하시겠습니까?
              </span>
            </div>
            {/* footer — 취소(닫기) / 진행 (우측 정렬) */}
            <div
              className="flex items-center justify-end self-stretch"
              style={{ padding: '14px 24px', gap: '8px' }}
            >
              <button
                type="button"
                className="voice-modal-btn voice-modal-btn-cancel"
                onClick={() => setConfirmCancelOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="voice-modal-btn voice-modal-btn-reset"
                onClick={handleCancel}
              >
                진행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 권한 확인 toast — SUCCESS 초록 / FAIL 빨강. 상단 중앙, 자동 사라짐. 모달(z 5000) 위. */}
      {toast && (
        <div
          className="fixed flex items-center"
          style={{
            top: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 6000,
            padding: '12px 20px',
            borderRadius: '10px',
            background: toast.type === 'success' ? '#22C55E' : '#FF4245',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
            color: '#FFF',
            fontFamily: 'Roboto',
            fontSize: '15px',
            fontWeight: 600,
            lineHeight: '1',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
