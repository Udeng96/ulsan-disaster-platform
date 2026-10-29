// 자동 음성 통보 — 왼쪽 전파 대상 트리 + 오른쪽 입력(방송 설정 · 메시지 유형 · 텍스트 입력).
import { memo, useState, type ReactNode } from 'react'
import { Checkbox, cn, ConfirmDialog, Radio, TreeSelect } from '@/shared/ui'
import { expandableIds, toggleLeaf, voiceTree } from './logic'
import { ALERT_SOUNDS, disaster, lists, MAX_CONTENT, resetInput, setInput, SIREN, toggleVoice } from './state'
import { TemplateChips } from './TemplateChips'

const title18 = 'font-sans text-[18px] leading-none font-medium text-neutral-100'

const toggleExpand = (id: string) => disaster.set((s) => ({ voiceExpanded: toggleLeaf(s.voiceExpanded, id) }))

function TargetTree() {
  const list = lists.use((s) => s.broadcast)
  const checked = disaster.use((s) => s.voiceChecked)
  const expanded = disaster.use((s) => s.voiceExpanded)
  // 목록이 바뀔 때만 다시 계산 (React Compiler 가 기억)
  const tree = voiceTree(list)
  const all = expandableIds(tree)
  // 다 펼쳐져 있으면 체크 (손으로 다 펼쳐도 체크된다)
  const allOpen = all.length > 0 && all.every((id) => expanded.has(id))
  return (
    <div className="flex min-h-0 w-[350px] shrink-0 flex-col items-center gap-4 self-stretch">
      <div className="flex items-center gap-2 self-stretch">
        <span className={cn(title18, 'whitespace-nowrap')}>전파 대상 선택</span>
        <span className="flex-[1_0_0] font-sans text-[14px] leading-none font-medium whitespace-nowrap text-neutral-300">
          (선택 {checked.size}/{list.length})
        </span>
        <button type="button" aria-pressed={allOpen} onClick={() => disaster.set({ voiceExpanded: new Set(allOpen ? [] : all) })} className="flex items-center gap-1.5">
          <Checkbox state={allOpen ? 'checked' : 'unchecked'} size={18} />
          <span className="font-sans text-[14px] leading-none font-medium whitespace-nowrap text-neutral-200">모두 펼치기</span>
        </button>
      </div>
      <div role="tree" aria-label="전파 대상" className="flex min-h-0 flex-[1_0_0] flex-col items-start gap-1 self-stretch overflow-y-auto rounded-xl border border-neutral-450 bg-neutral-800 p-2 scroll-slim">
        <TreeSelect data={tree} checked={checked} onToggle={toggleVoice} expanded={expanded} onToggleExpand={toggleExpand} />
      </div>
    </div>
  )
}

function Settings({ locked }: { locked: boolean }) {
  const sound = disaster.use((s) => s.alertSound)
  return (
    <div className="flex flex-col gap-2 self-stretch">
      <div className="flex items-center gap-2.5 self-stretch">
        <span className={title18}>방송 설정</span>
      </div>
      <div className="flex flex-col items-start self-stretch rounded-xl border border-neutral-300/50 bg-neutral-600">
        <div className="flex items-center gap-5 self-stretch p-2.5">
          <div className="flex items-center gap-2">
            <span className="size-1.5 shrink-0 bg-primary" />
            <span className="w-20 font-sans text-[15px] leading-none font-medium text-neutral-100">알림음</span>
          </div>
          <div role="radiogroup" aria-label="알림음" className="flex flex-[1_0_0] items-center gap-5 p-2.5">
            {ALERT_SOUNDS.map((o) => (
              <button key={o.value} type="button" role="radio" aria-checked={sound === o.value} disabled={locked} onClick={() => setInput({ alertSound: o.value })} className="group flex items-center gap-2">
                <Radio checked={sound === o.value} />
                <span className="font-sans text-[14px] leading-4 font-medium whitespace-nowrap text-neutral-100">{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** 라벨(폭 48, 빨간 *) + 입력 */
function Field({ label, top, children }: { label: string; top?: boolean; children: ReactNode }) {
  return (
    <div className={cn('flex gap-3 self-stretch', top ? 'min-h-0 flex-[1_0_0] items-start' : 'items-center')}>
      <span className={cn('w-12 shrink-0 font-sans text-[15px] leading-none font-medium text-neutral-200', top && 'pt-3')}>
        {label}
        <span className="text-accent-red"> *</span>
      </span>
      {children}
    </div>
  )
}

const ghost =
  "flex h-[34px] items-center justify-center gap-1.5 rounded-lg border border-neutral-450 bg-white/4 px-3.5 transition-ui font-['Pretendard',Roboto,sans-serif] text-[14px] leading-none font-medium text-ghost-text hover:border-primary-dark hover:bg-primary-dark/10 hover:text-neutral-50"
const field = 'rounded-[10px] border transition-ui border-neutral-450 bg-neutral-800 font-sans text-[15px] font-medium text-white outline-none placeholder:text-neutral-300 focus:border-primary-dark'

function TextInput({ locked }: { locked: boolean }) {
  const title = disaster.use((s) => s.title)
  const content = disaster.use((s) => s.content)
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="flex min-h-0 flex-[1_0_0] flex-col items-start gap-2 self-stretch">
      <div className="flex items-center gap-2 self-stretch">
        <span className={cn(title18, 'flex-[1_0_0]')}>텍스트 입력</span>
        {/* 초기화 — 옛 미리듣기 자리 (미리듣기는 뺌, 사용자 10-22) */}
        <button type="button" disabled={locked} onClick={() => setConfirm(true)} className={ghost}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="stroke-white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.6102 10.8664C16.4529 12.0664 15.9718 13.2009 15.2187 14.1482C14.4656 15.0956 13.4688 15.82 12.3352 16.2439C11.2016 16.6678 9.97405 16.7752 8.78411 16.5544C7.59418 16.3336 6.48679 15.7931 5.58069 14.9908C4.6746 14.1886 4.00399 13.1547 3.64079 12.0003C3.27759 10.8458 3.2355 9.6143 3.51903 8.43774C3.80256 7.26118 4.40101 6.184 5.25021 5.32172C6.09941 4.45943 7.16732 3.84457 8.3394 3.54309C11.5886 2.70975 14.9519 4.38225 16.1936 7.49892" />
            <path d="M16.6657 3.33203V7.4987H12.499" />
          </svg>
          <span className="relative top-0.5">초기화</span>
        </button>
      </div>
      <Field label="제목">
        <input
          type="text"
          aria-label="제목"
          value={title}
          readOnly={locked}
          onChange={(e) => setInput({ title: e.target.value })}
          placeholder="제목을 입력해 주세요."
          className={cn(field, 'h-11 flex-[1_0_0] px-4 leading-none')}
        />
      </Field>
      <Field label="내용" top>
        <div className="flex min-h-0 flex-[1_0_0] flex-col items-end gap-0.5 self-stretch">
          <textarea
            aria-label="내용"
            value={content}
            readOnly={locked}
            onChange={(e) => setInput({ content: e.target.value })}
            placeholder="내용을 입력해 주세요."
            className={cn(field, 'min-h-0 w-full flex-[1_0_0] resize-none rounded-xl px-4 py-3 leading-[150%]')}
          />
          <span className="mt-0.5 mr-1.5 font-sans text-[12px] leading-none font-medium">
            <span className="text-white">{content.length}</span>
            <span className="text-neutral-300">/{MAX_CONTENT}</span>
          </span>
        </div>
      </Field>
      <ConfirmDialog
        open={confirm}
        title="초기화"
        message="입력된 내용을 모두 초기화 하겠습니까?"
        confirmLabel="초기화"
        onConfirm={() => {
          resetInput()
          setConfirm(false)
        }}
        onClose={() => setConfirm(false)}
      />
    </div>
  )
}

const Composer = memo(function Composer() {
  // 권한 확인 뒤(송출만 남음)는 읽기만 — 흐리게
  const locked = disaster.use((s) => s.verified)
  const siren = disaster.use((s) => s.alertSound === SIREN)
  return (
    <div className={cn('flex h-full min-w-0 flex-[1_0_0] flex-col items-start gap-5 overflow-y-auto transition-ui scroll-slim', locked && 'opacity-50')}>
      <Settings locked={locked} />
      {siren ? (
        // 재난 알림음 — 안내는 "사이렌이 울립니다." (보낼 때 내용은 "오") (수정사항, 10-19)
        <div role="note" className="flex min-h-0 flex-[1_0_0] items-center justify-center self-stretch rounded-xl border border-neutral-450 bg-neutral-800 font-sans text-[18px] leading-none font-medium text-neutral-100">
          사이렌이 울립니다.
        </div>
      ) : (
        <>
          <TemplateChips locked={locked} />
          <TextInput locked={locked} />
        </>
      )}
    </div>
  )
})

export function VoicePane() {
  return (
    <div className="flex h-full min-h-0 items-start gap-9 self-stretch">
      <TargetTree />
      <Composer />
    </div>
  )
}
