// 자동 음성 통보 — 우측 컴포저 (텍스트 입력 + 메시지 템플릿 + 방송 설정).
//   메인 2컬럼 중 우측 (좌측은 전파 대상 트리). Figma: section gap 20.
//   ⚠️ 드롭다운 옵션 / 템플릿 문안 / 미리듣기·송출 동작은 placeholder — 계약 확정 후 교체.

import { useEffect, useState } from 'react'
import { COLORS } from '@/styles/designTokens'
import { type BroadcastTemplate } from '@/api/broadcastTemplate'
import {
  useTemplates,
  addTemplate,
  editTemplate,
  removeTemplate,
} from './templateStore'
import { RadioDot } from './RadioDot'

// 방송 설정 값 — DisasterPanel 이 소유 (모드 전환 시 reset). 지금은 알림음만.
//   alertSound 는 API 코드값("0"/"1"/"9") 을 보관.
export interface VoiceSettings {
  alertSound: string // 알림음 코드
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  alertSound: '0', // 기본 알림음
}

// 알림음 — 코드값 + 표시 라벨.
const ALERT_SOUND_OPTS = [
  { value: '0', label: '기본 알림음' },
  { value: '1', label: '재난 알림음' },
]

const MAX_CONTENT = 1000

interface Props {
  title: string
  onTitleChange: (v: string) => void
  content: string
  onContentChange: (v: string) => void
  settings: VoiceSettings
  onSettingsChange: (patch: Partial<VoiceSettings>) => void
  onSelectTemplate: (t: BroadcastTemplate) => void
  onReset: () => void
  onPreview: () => void
  /** 권한 확인 후 잠금 — 제목/내용 입력 readOnly (템플릿 선택은 부모가 가드). */
  locked?: boolean
}

export function VoiceComposer({
  title,
  onTitleChange,
  content,
  onContentChange,
  settings,
  onSettingsChange,
  onSelectTemplate,
  onReset,
  onPreview,
  locked = false,
}: Props) {
  // 초기화 확인 모달 — 초기화 클릭 시 open, 확인 시 onReset 실행.
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  // 템플릿 목록 — 모듈 캐시(templateStore) 구독. 최초 1회만 fetch, remount 시 재사용.
  const templates = useTemplates()
  // ⋮ 옵션 메뉴 — 열린 칩 id (없으면 null). 수정/삭제 리스트.
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  // 메뉴 열려있을 때 바깥(다른 버튼/영역) 클릭 → 닫기.
  //   ⋮ 버튼·메뉴 내부는 stopPropagation 이라 document 까지 안 와서 안 닫힘.
  useEffect(() => {
    if (openMenuId === null) return
    const close = () => setOpenMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenuId])
  // 템플릿 삭제 — ⋮ 삭제 클릭 시 확인 모달(초기화 컨펌 디자인 재사용) → 확인 시 DELETE.
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const askDeleteTemplate = (id: number) => {
    setOpenMenuId(null)
    setConfirmDeleteId(id)
  }
  const confirmDeleteTemplate = () => {
    if (confirmDeleteId === null) return
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    removeTemplate(id).catch((err) => console.warn('[templates] 삭제 실패', err))
  }
  // 추가/수정 모달 — editingId 있으면 수정(PUT), 없으면 추가(POST).
  const [addOpen, setAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const openAdd = () => {
    setEditingId(null)
    setNewTitle('')
    setNewContent('')
    setAddOpen(true)
  }
  const openEdit = (t: BroadcastTemplate) => {
    setOpenMenuId(null)
    setEditingId(t.id)
    setNewTitle(t.title)
    setNewContent(t.content)
    setAddOpen(true)
  }
  const confirmTemplate = () => {
    const title = newTitle.trim()
    if (!title) return
    const body = { title, content: newContent }
    const req =
      editingId === null ? addTemplate(body) : editTemplate(editingId, body)
    req
      .then(() => setAddOpen(false))
      .catch((err) => console.warn('[templates] 저장 실패', err))
  }
  return (
    <div
      className="scrollbar-custom flex flex-col items-start"
      style={{
        flex: '1 0 0',
        height: '100%',
        gap: '20px',
        minWidth: 0,
        overflowY: 'auto',
        // 권한 확인(송출) 상태 = 읽기모드 → 영역 흐리게 (동작은 이미 잠금).
        opacity: locked ? 0.5 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {/* ── 방송 설정 ── 맨 위. 제목↔박스 gap 8 */}
      <div className="flex flex-col self-stretch" style={{ gap: '8px' }}>
        {/* 제목 */}
        <div className="flex items-center self-stretch" style={{ gap: '10px' }}>
          <span
            style={{
              color: COLORS.neutral100,
              fontFamily: 'Roboto',
              fontSize: '18px',
              fontWeight: 500,
              lineHeight: '1',
            }}
          >
            방송 설정
          </span>
        </div>
        {/* 설정 박스 (radius 12, border, bg Neutral-600) — 알림음만 */}
        <div
          className="flex flex-col self-stretch"
          style={{
            alignItems: 'flex-start',
            borderRadius: '12px',
            border: '1px solid rgba(127, 151, 175, 0.50)',
            background: '#002A54',
          }}
        >
        {/* 알림음 전체 영역 — padding 10, gap 20 (제목부분 + 라디오박스영역) */}
        <div
          className="flex items-center self-stretch"
          style={{ padding: '10px', gap: '20px' }}
        >
          {/* 제목 부분 — 점(6×6) + "알림음" (gap 8) */}
          <div className="flex items-center" style={{ gap: '8px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                background: '#1EA7FF',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                width: '80px',
                color: '#DCE6EE',
                fontFamily: 'Roboto',
                fontSize: '15px',
                fontWeight: 500,
                lineHeight: '1',
              }}
            >
              알림음
            </span>
          </div>
          {/* 라디오박스 영역 — padding 10, gap 20, flex 1 */}
          <div
            className="flex items-center"
            style={{ padding: '10px', gap: '20px', flex: '1 0 0' }}
          >
            {ALERT_SOUND_OPTS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={locked}
                onClick={() => onSettingsChange({ alertSound: opt.value })}
                className="group flex items-center"
                style={{ gap: '8px' }}
              >
                <RadioDot checked={settings.alertSound === opt.value} />
                <span
                  style={{
                    color: '#DCE6EE',
                    fontFamily: 'Roboto',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '16px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* 초기화 확인 모달 — fixed inset-0 (ScaledFrame 안에서 스케일). */}
      {confirmResetOpen && (
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
                초기화
              </span>
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
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
            {/* main — 메시지 (남은 높이 채우고 세로 중앙) */}
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
                  lineHeight: '1',
                }}
              >
                입력된 내용을 모두 초기화 하겠습니까?
              </span>
            </div>
            {/* footer — 취소 / 초기화 (우측 정렬) */}
            <div
              className="flex items-center justify-end self-stretch"
              style={{ padding: '14px 24px', gap: '8px' }}
            >
              <button
                type="button"
                className="voice-modal-btn voice-modal-btn-cancel"
                onClick={() => setConfirmResetOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="voice-modal-btn voice-modal-btn-reset"
                onClick={() => {
                  onReset()
                  setConfirmResetOpen(false)
                }}
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 템플릿 삭제 확인 모달 — 초기화 컨펌 디자인 재사용 (텍스트만 삭제용). */}
      {confirmDeleteId !== null && (
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
                템플릿 삭제
              </span>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
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
            {/* main — 메시지 (남은 높이 채우고 세로 중앙) */}
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
                  lineHeight: '1',
                }}
              >
                해당 템플릿을 삭제하겠습니까?
              </span>
            </div>
            {/* footer — 취소 / 삭제 (우측 정렬) */}
            <div
              className="flex items-center justify-end self-stretch"
              style={{ padding: '14px 24px', gap: '8px' }}
            >
              <button
                type="button"
                className="voice-modal-btn voice-modal-btn-cancel"
                onClick={() => setConfirmDeleteId(null)}
              >
                취소
              </button>
              <button
                type="button"
                className="voice-modal-btn voice-modal-btn-reset"
                onClick={confirmDeleteTemplate}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 템플릿 추가 모달 */}
      {addOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 5000, background: 'rgba(0, 0, 0, 0.50)' }}
        >
          <div
            className="flex flex-col items-start"
            style={{
              width: '440px',
              borderRadius: '16px',
              border: '1px solid #1B4671',
              background: '#002247',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* header — 템플릿 추가 (H3) + 닫기 */}
            <div
              className="flex items-center self-stretch"
              style={{ padding: '20px 16px 16px 24px', gap: '8px' }}
            >
              <span
                style={{
                  flex: '1 0 0',
                  color: '#FFF',
                  fontFamily: "'Do Hyeon', var(--font-sans)",
                  fontSize: '30px',
                  fontWeight: 400,
                  lineHeight: '32px',
                }}
              >
                {editingId === null ? '템플릿 추가' : '템플릿 수정'}
              </span>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                aria-label="닫기"
                className="flex items-center justify-center"
                style={{ width: '30px', height: '30px' }}
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
            {/* body — 제목 / 내용 (gap 20, 좌우 24 inset).
                top 12: 헤더 하단 padding 16 + 12 = 헤더→제목 28px */}
            <div
              className="flex flex-col items-start self-stretch"
              style={{ padding: '12px 24px 0', gap: '20px' }}
            >
              {/* 제목 영역 — 라벨 ↔ 입력 10 (height/justify-center 제거: 간격 결정적으로) */}
              <div
                className="flex flex-col items-start self-stretch"
                style={{ gap: '10px' }}
              >
                <label
                  style={{
                    color: '#DCE6EE',
                    fontFamily: 'Roboto',
                    fontSize: '15px',
                    fontWeight: 500,
                    lineHeight: '1',
                  }}
                >
                  제목 <span style={{ color: '#FF4245' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="제목 입력"
                  className="template-add-input"
                />
              </div>
              {/* 내용 영역 — 라벨 ↔ 입력 10, 입력 ↔ 글자수 0 */}
              <div
                className="flex flex-col items-start self-stretch"
                style={{ gap: '10px' }}
              >
                <label
                  style={{
                    color: '#DCE6EE',
                    fontFamily: 'Roboto',
                    fontSize: '15px',
                    fontWeight: 500,
                    lineHeight: '1',
                  }}
                >
                  내용 <span style={{ color: '#FF4245' }}>*</span>
                </label>
                {/* 입력 + 글자수 (gap 2) */}
                <div
                  className="flex flex-col items-end self-stretch"
                  style={{ gap: '2px' }}
                >
                  <textarea
                    value={newContent}
                    onChange={(e) =>
                      setNewContent(e.target.value.slice(0, MAX_CONTENT))
                    }
                    placeholder="내용을 입력해 주세요."
                    className="template-add-textarea"
                  />
                  <span
                    style={{
                      fontFamily: 'Roboto',
                      fontSize: '12px',
                      fontWeight: 500,
                      lineHeight: '1',
                    }}
                  >
                    <span style={{ color: '#FFF' }}>{newContent.length}</span>
                    <span style={{ color: COLORS.neutral300 }}>
                      /{MAX_CONTENT}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            {/* footer — ⚠️ 스펙 일부 미제공, 스샷 기준 (취소 / 확인 blue) */}
            <div
              className="flex items-center justify-end self-stretch"
              style={{ padding: '16px 24px 24px', gap: '8px' }}
            >
              <button
                type="button"
                className="voice-modal-btn voice-modal-btn-cancel"
                onClick={() => setAddOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="voice-modal-btn voice-modal-btn-confirm"
                onClick={confirmTemplate}
              >
                {editingId === null ? '확인' : '수정'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── 메시지 유형(템플릿) section (Figma: column, align-items flex-start, gap 8, align-self stretch) ──
          위(방송 설정)와는 컨테이너 gap 20, 아래(텍스트 입력)와는 30 → +10 만 더한다. */}
      <div
        className="flex flex-col self-stretch"
        style={{
          alignItems: 'flex-start',
          gap: '8px',
          marginBottom: '10px',
        }}
      >
        {/* 제목 + 안내문구 */}
        <div className="flex items-center self-stretch" style={{ gap: '8px' }}>
          <span
            style={{
              color: COLORS.neutral100,
              fontFamily: 'Roboto',
              fontSize: '18px',
              fontWeight: 500,
              lineHeight: '1',
              flex: '1 0 0',
            }}
          >
            메시지 유형(템플릿)
          </span>
          {/* 안내문구 — 우측 정렬 (Neutral-200, Pretendard 14/400, letter-spacing -0.14px) */}
          <span
            style={{
              color: COLORS.neutral200,
              fontFamily: 'Pretendard',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '1',
              letterSpacing: '-0.14px',
              whiteSpace: 'nowrap',
            }}
          >
            ⓘ 템플릿을 선택하면 제목과 내용이 자동으로 입력됩니다.
          </span>
        </div>
        {/* 버튼영역 — 템플릿 칩 + 추가 (Figma: align-items flex-start, gap 4, align-self stretch) */}
        <div
          className="flex flex-wrap self-stretch"
          style={{ alignItems: 'flex-start', gap: '4px' }}
        >
          {templates.map((t) => (
            <div
              key={t.id}
              className="voice-template-chip"
              style={{ position: 'relative' }}
              onClick={() => onSelectTemplate(t)}
            >
              {/* 글씨만 아래로 nudge (아이콘 제외) */}
              <span style={{ position: 'relative', top: '2px' }}>{t.title}</span>
              {/* ⋮ 옵션 버튼 — 클릭 시 수정/삭제 메뉴 토글 (칩 선택과 분리) */}
              <button
                type="button"
                className="flex items-center justify-center"
                style={{ position: 'relative', top: '1px' }}
                disabled={locked}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenMenuId((id) => (id === t.id ? null : t.id))
                }}
                aria-label="옵션"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M8 8.75C8.41421 8.75 8.75 8.41421 8.75 8C8.75 7.58579 8.41421 7.25 8 7.25C7.58579 7.25 7.25 7.58579 7.25 8C7.25 8.41421 7.58579 8.75 8 8.75Z"
                    fill="white"
                  />
                  <path
                    d="M8 4.75C8.41421 4.75 8.75 4.41421 8.75 4C8.75 3.58579 8.41421 3.25 8 3.25C7.58579 3.25 7.25 3.58579 7.25 4C7.25 4.41421 7.58579 4.75 8 4.75Z"
                    fill="white"
                  />
                  <path
                    d="M8 12.75C8.41421 12.75 8.75 12.4142 8.75 12C8.75 11.5858 8.41421 11.25 8 11.25C7.58579 11.25 7.25 11.5858 7.25 12C7.25 12.4142 7.58579 12.75 8 12.75Z"
                    fill="white"
                  />
                </svg>
              </button>
              {/* 수정/삭제 리스트 — ⋮ 클릭 시 (⚠️ 수정 동작 미배선, 삭제만 배선) */}
              {openMenuId === t.id && (
                <div
                  className="voice-chip-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    zIndex: 20,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="voice-chip-menu-item"
                    onClick={() => openEdit(t)}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path
                        d="M11.3 2.2l2.5 2.5L6 12.5l-3 .5.5-3 7.8-7.8z"
                        stroke="#fff"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span style={{ position: 'relative', top: '1px' }}>수정</span>
                  </button>
                  <button
                    type="button"
                    className="voice-chip-menu-item"
                    onClick={() => askDeleteTemplate(t.id)}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path
                        d="M2.7 4.3h10.6M6.3 4.3V2.9h3.4v1.4M4.3 4.3l.5 8.4h6.4l.5-8.4"
                        stroke="#fff"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span style={{ position: 'relative', top: '1px' }}>삭제</span>
                  </button>
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            className="voice-template-add"
            aria-label="템플릿 추가"
            disabled={locked}
            onClick={openAdd}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
            >
              <path d="M3.75049 10H16.2505" stroke="white" strokeWidth="1.5" />
              <path d="M10 3.75L10 16.25" stroke="white" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── 텍스트 입력 section (Figma: column, gap 8, flex 1 0 0, align-self stretch) ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '8px',
          flex: '1 0 0',
          alignSelf: 'stretch',
          minHeight: 0,
        }}
      >
        {/* 헤더 — 텍스트 입력 + 초기화 + 미리듣기 */}
        <div className="flex items-center self-stretch" style={{ gap: '8px' }}>
          <span
            style={{
              color: COLORS.neutral100,
              fontFamily: 'Roboto',
              fontSize: '18px',
              fontWeight: 500,
              lineHeight: '1',
              flex: '1 0 0',
            }}
          >
            텍스트 입력
          </span>
          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            disabled={locked}
            className="voice-ghost-btn flex items-center justify-center"
            style={{ gap: '6px' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
            >
              <path
                d="M16.6102 10.8664C16.4529 12.0664 15.9718 13.2009 15.2187 14.1482C14.4656 15.0956 13.4688 15.82 12.3352 16.2439C11.2016 16.6678 9.97405 16.7752 8.78411 16.5544C7.59418 16.3336 6.48679 15.7931 5.58069 14.9908C4.6746 14.1886 4.00399 13.1547 3.64079 12.0003C3.27759 10.8458 3.2355 9.6143 3.51903 8.43774C3.80256 7.26118 4.40101 6.184 5.25021 5.32172C6.09941 4.45943 7.16732 3.84457 8.3394 3.54309C11.5886 2.70975 14.9519 4.38225 16.1936 7.49892"
                stroke="white"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16.6657 3.33203V7.4987H12.499"
                stroke="white"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ position: 'relative', top: '2px' }}>초기화</span>
          </button>
          <button
            type="button"
            onClick={onPreview}
            className="voice-ghost-btn flex items-center justify-center"
            style={{ gap: '6px' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10.6748 3.30215C10.7726 3.34497 10.8549 3.41148 10.9124 3.4941C10.9698 3.57673 11.0002 3.67213 11 3.76944V16.2304C11.0001 16.3277 10.9696 16.423 10.9121 16.5055C10.8546 16.588 10.7723 16.6544 10.6746 16.6971C10.577 16.7399 10.4678 16.7572 10.3597 16.7473C10.2515 16.7373 10.1487 16.7003 10.0628 16.6406L5.74052 13.6344H3.74194C3.27995 13.6344 2.83688 13.4703 2.5102 13.1782C2.18352 12.8861 2 12.4899 2 12.0768V7.92311C2 7.51 2.18352 7.11381 2.5102 6.8217C2.83688 6.52959 3.27995 6.36548 3.74194 6.36548H5.74052L10.0628 3.35927C10.1487 3.2996 10.2516 3.26271 10.3598 3.2528C10.4681 3.24288 10.5772 3.25931 10.6748 3.30215ZM9.83871 4.8307L6.29677 7.29486C6.19479 7.36563 6.06935 7.404 5.94026 7.4039H3.74194C3.58794 7.4039 3.44025 7.4586 3.33136 7.55597C3.22246 7.65334 3.16129 7.7854 3.16129 7.92311V12.0768C3.16129 12.2145 3.22246 12.3465 3.33136 12.4439C3.44025 12.5413 3.58794 12.596 3.74194 12.596H5.94026C6.06935 12.5959 6.19479 12.6342 6.29677 12.705L9.83871 15.1692V4.8307Z"
                fill="white"
              />
              <path
                d="M13 7.29883C13.6351 8.0185 14.0205 8.96384 14.0205 9.99921C14.0205 11.0346 13.6351 11.9799 13 12.6996"
                stroke="white"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M15.041 4.99902C16.3036 6.28759 17.082 8.05239 17.082 9.99902C17.082 11.9457 16.3036 13.7105 15.041 14.999"
                stroke="white"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <span style={{ position: 'relative', top: '2px' }}>미리듣기</span>
          </button>
        </div>

        {/* 제목 */}
        <Field label="제목">
          <input
            type="text"
            value={title}
            readOnly={locked}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="제목을 입력해 주세요."
            className="voice-input"
            style={{ flex: '1 0 0' }}
          />
        </Field>

        {/* 내용 + 글자수 — 남은 높이 채움 (textarea grow) */}
        <Field label="내용" align="start" grow>
          <div
            className="flex flex-col items-end self-stretch"
            style={{ flex: '1 0 0', minHeight: 0, gap: '2px' }}
          >
            <textarea
              value={content}
              readOnly={locked}
              onChange={(e) =>
                onContentChange(e.target.value.slice(0, MAX_CONTENT))
              }
              placeholder="내용을 입력해 주세요."
              className="disaster-textarea"
              style={{
                width: '100%',
                flex: '1 0 0',
                minHeight: 0,
                padding: '12px 16px',
                resize: 'none',
                color: '#FFF',
                lineHeight: '150%',
              }}
            />
            <span
              style={{
                marginRight: '6px',
                marginTop: '2px',
                fontFamily: 'Roboto',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1',
              }}
            >
              <span style={{ color: '#FFF' }}>{content.length}</span>
              <span style={{ color: COLORS.neutral300 }}>/{MAX_CONTENT}</span>
            </span>
          </div>
        </Field>
      </div>

    </div>
  )
}

// 라벨(고정 폭) + 필드 가로 배치. grow=true 면 남은 세로 공간 채움 (내용 textarea).
function Field({
  label,
  align = 'center',
  grow = false,
  children,
}: {
  label: string
  align?: 'center' | 'start'
  grow?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className="flex self-stretch"
      style={{
        gap: '12px',
        alignItems: align === 'start' ? 'flex-start' : 'center',
        ...(grow ? { flex: '1 0 0', minHeight: 0 } : {}),
      }}
    >
      <span
        style={{
          width: '48px',
          paddingTop: align === 'start' ? '12px' : 0,
          color: COLORS.neutral200,
          fontFamily: 'Roboto',
          fontSize: '15px',
          fontWeight: 500,
          lineHeight: '1',
          flexShrink: 0,
        }}
      >
        {label}
        <span style={{ color: '#FF4245' }}> *</span>
      </span>
      {children}
    </div>
  )
}
