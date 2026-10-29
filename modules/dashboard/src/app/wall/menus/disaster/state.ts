// 재난 예·경보 상태 — 모드(자동 음성 통보 / 재해 문자 전광판)·고른 대상·입력·권한·송출 결과.
//   지도 마커도 같이 보므로(강조·누르면 선택) 저장소에 둔다. 메뉴를 벗어나면 처음으로.
//   방송장비·전광판 목록은 레이어 메뉴 마커도 쓰므로 대시보드가 켜질 때 한 번 받아 둔다.
import { useEffect } from 'react'
import { dispatchBroadcast } from '@/api/broadcastDispatch'
import { fetchSignboardCctv } from '../cctv/api'
import type { FacilityListItem } from '@/api/facility'
import { dispatchSignboardAlert } from '@/api/signboardAlert'
import { createStore } from '@/shared/store'
import { toggleNode, type TreeNode } from '@/shared/ui'
import { dash, MENU } from '../../dashboard/state'
import { fetchRolesDepartments, fetchSignboards, fetchTerminals, type RolesDepartments } from './api'
import { idsOf, toggleLeaf } from './logic'

export type DisasterMode = 'voice' | 'sign'
export type DispatchResult = { kind: 'count'; success: number; total: number } | { kind: 'hosts'; hosts: string[] }
export interface ToastMsg {
  message: string
  tone: 'success' | 'error'
  seq: number
}

/** 알림음 — API 코드값 */
export const ALERT_SOUNDS = [
  { value: '0', label: '기본 알림음' },
  { value: '1', label: '재난 알림음' },
] as const
export const DEFAULT_SOUND = '0'
/** 재난 알림음 — 짧은 "오"와 사이렌만 나가므로 제목·내용을 받지 않는다 (수정사항, 10-19) */
export const SIREN = '1'
export const SIREN_CONTENT = '오'
export const SIREN_TITLE = '사이렌'
export const MAX_CONTENT = 1000

/** 송출할 수 있나 — 대상 + 내용(음성은 제목도). 재난 알림음은 대상만 */
export function canSend(s: DisasterState): boolean {
  if (s.mode === 'sign') return s.signChecked.size > 0 && !!s.content.trim()
  if (!s.voiceChecked.size) return false
  return s.alertSound === SIREN || (!!s.content.trim() && !!s.title.trim())
}

export interface DisasterState {
  mode: DisasterMode
  /** 방송장비 `fac-{id}` */
  voiceChecked: ReadonlySet<string>
  /** 전광판 `sign-{id}` — 넣은 순서 = 고른 순서 (CCTV 칸 순서) */
  signChecked: ReadonlySet<string>
  voiceExpanded: ReadonlySet<string>
  title: string
  content: string
  alertSound: string
  /** 권한 확인을 마쳐 송출만 남음 — 이때는 대상·입력을 바꿀 수 없다 */
  verified: boolean
  result: DispatchResult | null
  toast: ToastMsg | null
  dialog: 'login' | 'signup' | 'cancel' | null
}

const INIT: DisasterState = {
  mode: 'voice',
  voiceChecked: new Set(),
  signChecked: new Set(),
  voiceExpanded: new Set(),
  title: '',
  content: '',
  alertSound: DEFAULT_SOUND,
  verified: false,
  result: null,
  toast: null,
  dialog: null,
}
export const disaster = createStore<DisasterState>(INIT)

export interface FacilityLists {
  broadcast: FacilityListItem[]
  signboard: FacilityListItem[]
  /** 전광판 id → 연결된 CCTV */
  signboardCctv: Record<number, string | null>
  roles: RolesDepartments | null
}
export const lists = createStore<FacilityLists>({ broadcast: [], signboard: [], signboardCctv: {}, roles: null })

const EMPTY_INPUT = { title: '', content: '', alertSound: DEFAULT_SOUND }

// ── 바꾸기 ──
export function showToast(message: string, tone: ToastMsg['tone']) {
  disaster.set((s) => ({ toast: { message, tone, seq: (s.toast?.seq ?? 0) + 1 } }))
}

/** 모드 바꿈 — 고른 대상·입력·결과·권한을 비운다 (모드끼리 섞이지 않게) */
export function selectMode(mode: DisasterMode) {
  if (disaster.get().mode === mode) return
  disaster.set({ mode, voiceChecked: new Set(), signChecked: new Set(), ...EMPTY_INPUT, result: null, verified: false })
}

export function toggleVoice(node: TreeNode) {
  if (disaster.get().verified) return
  disaster.set((s) => ({ voiceChecked: toggleNode(node, s.voiceChecked) }))
}
export function toggleSign(node: TreeNode) {
  if (disaster.get().verified) return
  disaster.set((s) => ({ signChecked: toggleNode(node, s.signChecked) }))
}
/** 지도 마커 누름 — 목록에서 고른 것과 같다 */
export function toggleFacility(kind: DisasterMode, id: number) {
  if (disaster.get().verified) return
  if (kind === 'voice') disaster.set((s) => ({ voiceChecked: toggleLeaf(s.voiceChecked, `fac-${id}`) }))
  else disaster.set((s) => ({ signChecked: toggleLeaf(s.signChecked, `sign-${id}`) }))
}

/** 입력 바꿈 — 자동 음성 내용은 1000자까지 (전광판은 제한 없음, 옛 화면과 같음) */
export function setInput(patch: Partial<Pick<DisasterState, 'title' | 'content' | 'alertSound'>>) {
  const s = disaster.get()
  if (s.verified) return
  // 재난 알림음을 고르면 입력해 둔 제목·내용을 비운다. 고른 동안엔 입력을 받지 않는다
  if (patch.alertSound === SIREN) return disaster.set({ alertSound: SIREN, title: '', content: '' })
  if (s.mode === 'voice' && s.alertSound === SIREN && patch.alertSound === undefined) return
  disaster.set(patch.content !== undefined && s.mode === 'voice' ? { ...patch, content: patch.content.slice(0, MAX_CONTENT) } : patch)
}
/** 초기화 — 제목·내용·알림음만 (대상은 그대로) */
export const resetInput = () => disaster.set(EMPTY_INPUT)

export const openDialog = (dialog: DisasterState['dialog']) => disaster.set({ dialog })

/** 권한 확인 통과 — 버튼이 "송출" 로, 지난 결과는 지운다 */
export function verified(message: string) {
  disaster.set({ dialog: null, verified: true, result: null })
  showToast(message, 'success')
}

/** 송출 취소 — 입력·대상·권한을 지우고 편집으로 */
export function cancelDispatch() {
  disaster.set((s) => ({ dialog: null, ...EMPTY_INPUT, verified: false, ...(s.mode === 'voice' ? { voiceChecked: new Set<string>() } : { signChecked: new Set<string>() }) }))
}

const FAIL_REQUEST = '송출 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.'

/** 송출 — 성공하면 결과를 남기고 처음으로. 실패하면 입력·권한을 그대로 둬서 다시 누를 수 있게. */
export async function dispatch() {
  const s = disaster.get()
  const done = (result: DispatchResult, cleared: Partial<DisasterState>) => {
    disaster.set({ result, ...EMPTY_INPUT, verified: false, ...cleared })
    showToast('송출되었습니다.', 'success')
  }
  if (s.mode === 'voice') {
    const terminalIds = idsOf(s.voiceChecked, 'fac')
    if (!terminalIds.length) return
    try {
      const siren = s.alertSound === SIREN
      const r = await dispatchBroadcast({ title: siren ? SIREN_TITLE : s.title, content: siren ? SIREN_CONTENT : s.content, alertSound: s.alertSound, terminalIds })
      if (r.status !== 'SUCCESS') return showToast('송출에 실패했습니다.', 'error')
    } catch (err) {
      console.warn('[dispatch] 송출 요청 실패', err)
      return showToast(FAIL_REQUEST, 'error')
    }
    return done({ kind: 'count', success: terminalIds.length, total: terminalIds.length }, { voiceChecked: new Set() })
  }
  const boards = idsOf(s.signChecked, 'sign')
    .map((id) => lists.get().signboard.find((b) => b.id === id))
    .filter((b): b is FacilityListItem => !!b)
  if (!boards.length) return
  const targetHosts = boards.map((b) => b.host).filter((h): h is string => !!h)
  if (!targetHosts.length) return showToast('선택한 전광판에 송출 도메인이 없습니다.', 'error')
  let hosts = targetHosts
  try {
    const r = await dispatchSignboardAlert({ msgCn: s.content, targetHosts })
    if (!r.success) return showToast(r.message ?? '송출에 실패했습니다.', 'error')
    // 응답이 지금 표출 중인 전광판을 알려 주면 그걸로 (이전 송출분 포함)
    if (r.displayingHosts?.length) hosts = r.displayingHosts
  } catch (err) {
    console.warn('[signboard] 송출 요청 실패', err)
    return showToast(FAIL_REQUEST, 'error')
  }
  done({ kind: 'hosts', hosts }, { signChecked: new Set() })
}

/** 목록 받기 + 메뉴를 벗어나면 처음으로. 대시보드에 한 번 둔다. */
export function DisasterSync() {
  useEffect(() => {
    fetchTerminals()
      .then((broadcast) => lists.set({ broadcast }))
      .catch((err) => console.warn('[broadcast] fetch 실패', err))
    fetchSignboards()
      .then((signboard) => lists.set({ signboard }))
      .catch((err) => console.warn('[signboard] fetch 실패', err))
    fetchSignboardCctv()
      .then((rows) => lists.set({ signboardCctv: Object.fromEntries(rows.map((r) => [r.signboardId, r.cctvId])) }))
      .catch((err) => console.warn('[signboard-cctv] fetch 실패', err))
  }, [])
  const menu = dash.use((s) => s.menu)
  useEffect(() => {
    if (menu !== MENU.disaster) return disaster.reset()
    // 권한·부서 목록 — 메뉴에 들어올 때마다 (옛 화면처럼 실패해도 다음에 다시)
    let live = true
    fetchRolesDepartments()
      .then((roles) => live && lists.set({ roles }))
      .catch((err) => console.warn('[roles-departments] fetch 실패', err))
    return () => {
      live = false
    }
  }, [menu])
  return null
}
