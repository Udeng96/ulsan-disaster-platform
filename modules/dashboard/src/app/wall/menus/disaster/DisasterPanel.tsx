// 재난 예·경보 패널 (1132×840) — 모드 버튼 두 개 + 본문(자동 음성 통보 / 재해 문자 전광판) + 송출 줄.
//   지도 오른쪽(CCTV·메뉴 패널 자리)을 통째로 쓴다.
import { memo, useMemo } from 'react'
import { Checkbox, cn, ConfirmDialog, Toast } from '@/shared/ui'
import { LoginDialog, SignupDialog } from './AuthDialogs'
import { hostNames } from './logic'
import { SignPane } from './SignPane'
import { cancelDispatch, canSend, disaster, dispatch, lists, openDialog, selectMode, type DisasterMode } from './state'
import { VoicePane } from './VoicePane'

const ModeButton = memo(function ModeButton({ mode, label }: { mode: DisasterMode; label: string }) {
  const on = disaster.use((s) => s.mode === mode)
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => selectMode(mode)}
      className={cn(
        // 바탕은 ::before 로 따로 — 섞기(mix-blend)가 체크박스·글씨에 번지지 않게
        "group relative flex min-w-0 flex-[1_0_0] flex-col items-center gap-2.5 rounded-xl border py-6 transition-ui-slow before:absolute before:inset-0 before:z-0 before:rounded-xl before:bg-row-hover before:content-['']",
        on ? 'border-primary shadow-mode-on before:mix-blend-plus-lighter' : 'border-transparent before:mix-blend-plus-darker hover:before:mix-blend-plus-lighter',
      )}
    >
      <div className="relative z-[1] flex items-center gap-2.5">
        <Checkbox state={on ? 'checked' : 'unchecked'} size={26} />
        <span
          className={cn(
            'font-display text-[30px] leading-8 font-bold transition-ui-slow',
            on ? 'text-white [-webkit-text-stroke:1px_var(--color-mode-stroke)]' : 'text-neutral-200 group-hover:text-neutral-50',
          )}
        >
          {label}
        </span>
      </div>
    </button>
  )
})

/** 지난 송출 결과 — 음성: 성공/선택 수, 전광판: 지금 표출 중인 곳 */
function Result() {
  const result = disaster.use((s) => s.result)
  const boards = lists.use((s) => s.signboard)
  const names = useMemo(() => (result?.kind === 'hosts' ? hostNames(result.hosts, boards) : []), [result, boards])
  if (!result) return null
  if (result.kind === 'count') {
    return (
      <span className="font-sans text-[14px] leading-none font-medium tracking-[-0.2px] text-neutral-100">
        <span className="font-bold text-primary-dark">{result.success}</span>
        <span className="mx-1 opacity-60">/</span>
        <span className="font-bold">{result.total}</span>
        <span className="ml-1.5 text-[12px] opacity-60">송출 성공</span>
      </span>
    )
  }
  return (
    <span title={names.join(', ')} className="relative top-0.5 max-w-[620px] truncate font-sans text-[14px] leading-5 font-medium tracking-[-0.2px] text-neutral-100">
      <span className="mr-1.5 text-[12px] opacity-60">표출 중</span>
      <span className="font-bold text-primary-dark">{result.hosts.length}곳</span>
      {names.length > 0 && <span className="mx-1.5 opacity-60">·</span>}
      <span>{names.join(', ')}</span>
    </span>
  )
}

function SendButton() {
  const verified = disaster.use((s) => s.verified)
  const disabled = disaster.use((s) => !canSend(s))
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => (verified ? dispatch() : openDialog('login'))}
      className="flex h-10 w-40 items-center justify-center gap-2 rounded-lg bg-accent-indigo pt-1 font-sans text-[14px] leading-none font-medium text-white transition-ui enabled:hover:bg-accent-indigo-light enabled:hover:shadow-button-hover disabled:opacity-30"
    >
      {verified ? '송출' : '권한 확인'}
    </button>
  )
}

function Footer() {
  const verified = disaster.use((s) => s.verified)
  return (
    <div className="flex h-[72px] shrink-0 items-center justify-end gap-3 self-stretch rounded-b-[20px] border-t border-neutral-450 p-4">
      <Result />
      {verified && (
        <button
          type="button"
          onClick={() => openDialog('cancel')}
          className="flex h-10 w-[100px] items-center justify-center rounded-lg border border-white/24 bg-white/8 pt-0.5 font-sans text-[14px] leading-none font-medium text-white transition-ui hover:border-white/40 hover:bg-white/16"
        >
          취소
        </button>
      )}
      <SendButton />
    </div>
  )
}

const closeDialog = () => openDialog(null)
const clearToast = () => disaster.set({ toast: null })

function Dialogs() {
  const dialog = disaster.use((s) => s.dialog)
  const toast = disaster.use((s) => s.toast)
  return (
    <>
      {dialog === 'login' && <LoginDialog />}
      {dialog === 'signup' && <SignupDialog />}
      <ConfirmDialog
        open={dialog === 'cancel'}
        title="취소"
        message={'취소할 경우 입력한 내용 및 권한이 제거됩니다.\n진행하시겠습니까?'}
        confirmLabel="진행"
        onConfirm={cancelDispatch}
        onClose={closeDialog}
      />
      {/* 같은 글이 다시 와도 새로 뜨게 seq 로 다시 만든다 */}
      <Toast key={toast?.seq ?? 0} message={toast?.message ?? null} tone={toast?.tone} duration={3500} onDismiss={clearToast} />
    </>
  )
}

export function DisasterPanel() {
  const mode = disaster.use((s) => s.mode)
  return (
    <div className="flex h-[840px] w-[1132px] shrink-0 flex-col items-start rounded-2xl bg-neutral-600">
      <div className="flex flex-col items-start gap-2.5 self-stretch border-b border-neutral-450 p-5">
        <div className="flex items-center gap-2 self-stretch">
          <ModeButton mode="voice" label="자동 음성 통보" />
          <ModeButton mode="sign" label="재해 문자 전광판" />
        </div>
      </div>
      <div className="flex min-h-0 flex-[1_0_0] flex-col items-start gap-5 self-stretch p-5">{mode === 'voice' ? <VoicePane /> : <SignPane />}</div>
      <Footer />
      <Dialogs />
    </div>
  )
}
