// 메시지 유형(템플릿) — 칩을 누르면 제목·내용이 채워진다. ⋮ 로 수정·삭제, + 로 추가.
import { useEffect, useState } from 'react'
import type { BroadcastTemplate } from '@/api/broadcastTemplate'
import { Button, CloseButton, ConfirmDialog, Dialog } from '@/shared/ui'
import { disaster, MAX_CONTENT, setInput } from './state'
import { addTemplate, editTemplate, removeTemplate, useTemplates } from './templates'

const pretendard = "font-['Pretendard',Roboto,sans-serif]"

/** 템플릿 고름 — 권한 확인 뒤엔 무시 */
function pick(t: BroadcastTemplate) {
  if (disaster.get().verified) return
  setInput({ title: t.title, content: t.content })
}

function MenuItem({ label, onClick, icon }: { label: string; onClick: () => void; icon: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 w-[68px] items-center justify-center gap-1 border border-transparent ${pretendard} text-[14px] leading-none font-medium text-white hover:border-neutral-450 hover:bg-neutral-600`}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="stroke-white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon} />
      </svg>
      <span className="relative top-px">{label}</span>
    </button>
  )
}

const EDIT_ICON = 'M11.3 2.2l2.5 2.5L6 12.5l-3 .5.5-3 7.8-7.8z'
const DELETE_ICON = 'M2.7 4.3h10.6M6.3 4.3V2.9h3.4v1.4M4.3 4.3l.5 8.4h6.4l.5-8.4'

const input = `w-full self-stretch rounded-[6px] border transition-ui border-neutral-450 bg-neutral-800 px-3 py-2.5 ${pretendard} text-[15px] font-medium tracking-[0.6px] text-white outline-none placeholder:text-neutral-300 focus:border-primary-dark`
const label = 'font-sans text-[15px] leading-none font-medium text-neutral-100'

/** 추가·수정 창 — editing 이 있으면 수정 */
function TemplateDialog({ editing, onClose }: { editing: BroadcastTemplate | null; onClose: () => void }) {
  const [title, setTitle] = useState(editing?.title ?? '')
  const [content, setContent] = useState(editing?.content ?? '')
  const name = editing ? '템플릿 수정' : '템플릿 추가'
  const save = () => {
    const t = title.trim()
    if (!t) return
    const body = { title: t, content }
    ;(editing ? editTemplate(editing.id, body) : addTemplate(body)).then(onClose).catch((err) => console.warn('[templates] 저장 실패', err))
  }
  return (
    <Dialog open onClose={onClose} label={name} className="w-[440px]">
      <div className="flex items-center gap-2 self-stretch pt-5 pr-4 pb-4 pl-6">
        <span className="flex-[1_0_0] font-headline text-[30px] leading-8 font-normal text-white">{name}</span>
        <CloseButton onClick={onClose} className="size-[30px]" />
      </div>
      <div className="flex flex-col items-start gap-5 self-stretch px-6 pt-3">
        <div className="flex flex-col items-start gap-2.5 self-stretch">
          <label className={label}>
            제목 <span className="text-accent-red">*</span>
          </label>
          <input type="text" aria-label="템플릿 제목" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목 입력" className={`${input} leading-none`} />
        </div>
        <div className="flex flex-col items-start gap-2.5 self-stretch">
          <label className={label}>
            내용 <span className="text-accent-red">*</span>
          </label>
          <div className="flex flex-col items-end gap-0.5 self-stretch">
            <textarea
              aria-label="템플릿 내용"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
              placeholder="내용을 입력해 주세요."
              className={`${input} h-[200px] resize-none leading-[150%]`}
            />
            <span className="font-sans text-[12px] leading-none font-medium">
              <span className="text-white">{content.length}</span>
              <span className="text-neutral-300">/{MAX_CONTENT}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 self-stretch px-6 pt-4 pb-6">
        <Button variant="cancel" onClick={onClose}>
          취소
        </Button>
        <Button variant="primary" onClick={save}>
          {editing ? '수정' : '확인'}
        </Button>
      </div>
    </Dialog>
  )
}

export function TemplateChips({ locked }: { locked: boolean }) {
  const templates = useTemplates()
  const [menuId, setMenuId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  // 추가 = null, 수정 = 그 템플릿, 닫힘 = undefined
  const [editing, setEditing] = useState<BroadcastTemplate | null | undefined>(undefined)
  // ⋮ 메뉴가 열려 있으면 바깥 어디를 눌러도 닫힘 (메뉴·⋮ 안은 전파를 막는다)
  useEffect(() => {
    if (menuId === null) return
    const close = () => setMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuId])

  return (
    // 위(방송 설정)와 20, 아래(텍스트 입력)와 30
    <div className="mb-2.5 flex flex-col items-start gap-2 self-stretch">
      <div className="flex items-center gap-2 self-stretch">
        <span className="flex-[1_0_0] font-sans text-[18px] leading-none font-medium text-neutral-100">메시지 유형(템플릿)</span>
        <span className={`${pretendard} text-[14px] leading-none font-normal tracking-[-0.14px] whitespace-nowrap text-neutral-200`}>ⓘ 템플릿을 선택하면 제목과 내용이 자동으로 입력됩니다.</span>
      </div>
      <div className="flex flex-wrap items-start gap-1 self-stretch">
        {templates.map((t) => (
          <div
            key={t.id}
            role="button"
            aria-label={t.title}
            onClick={() => pick(t)}
            className={`relative flex cursor-pointer items-center justify-center gap-0.5 rounded-[5px] border border-primary/30 bg-primary/20 py-1.5 pr-1 pl-2 ${pretendard} text-[14px] leading-none font-medium text-chip-text transition-ui hover:border-primary/50 hover:bg-primary/30`}
          >
            <span className="relative top-0.5">{t.title}</span>
            <button
              type="button"
              aria-label={`${t.title} 옵션`}
              disabled={locked}
              onClick={(e) => {
                e.stopPropagation()
                setMenuId((id) => (id === t.id ? null : t.id))
              }}
              className="relative top-px flex items-center justify-center"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="fill-white">
                <circle cx="8" cy="8" r="0.75" />
                <circle cx="8" cy="4" r="0.75" />
                <circle cx="8" cy="12" r="0.75" />
              </svg>
            </button>
            {menuId === t.id && (
              <div
                role="menu"
                onClick={(e) => e.stopPropagation()}
                className="absolute top-[calc(100%+4px)] right-0 z-20 flex w-[68px] flex-col items-start overflow-hidden rounded border border-neutral-450 bg-neutral-900"
              >
                <MenuItem
                  label="수정"
                  icon={EDIT_ICON}
                  onClick={() => {
                    setMenuId(null)
                    setEditing(t)
                  }}
                />
                <MenuItem
                  label="삭제"
                  icon={DELETE_ICON}
                  onClick={() => {
                    setMenuId(null)
                    setDeleteId(t.id)
                  }}
                />
              </div>
            )}
          </div>
        ))}
        <button
          type="button"
          aria-label="템플릿 추가"
          disabled={locked}
          onClick={() => setEditing(null)}
          className="flex items-center justify-center rounded-[5px] border border-primary bg-primary-dark p-1 transition-ui hover:bg-primary"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="stroke-white" strokeWidth="1.5">
            <path d="M3.75049 10H16.2505" />
            <path d="M10 3.75L10 16.25" />
          </svg>
        </button>
      </div>
      {editing !== undefined && <TemplateDialog editing={editing} onClose={() => setEditing(undefined)} />}
      <ConfirmDialog
        open={deleteId !== null}
        title="템플릿 삭제"
        message="해당 템플릿을 삭제하겠습니까?"
        confirmLabel="삭제"
        onConfirm={() => {
          if (deleteId !== null) removeTemplate(deleteId).catch((err) => console.warn('[templates] 삭제 실패', err))
          setDeleteId(null)
        }}
        onClose={() => setDeleteId(null)}
      />
    </div>
  )
}
