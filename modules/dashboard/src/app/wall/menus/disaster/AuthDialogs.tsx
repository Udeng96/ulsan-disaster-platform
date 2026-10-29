// 권한 확인(로그인) · 권한 등록(회원 가입) 창 — 송출 전에 거친다. OMS 서버에 확인·등록.
//   열 때마다 새로 그려서 입력이 비어 있다.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { verifyEventRole } from '@/api/eventRole'
import { checkLoginId, registerUser } from '@/api/userMgt'
import { cn, Dialog, DialogHeader } from '@/shared/ui'
import { disaster, lists, openDialog, showToast, verified } from './state'

const close = () => openDialog(null)
const pretendard = "font-['Pretendard',Roboto,sans-serif]"
const btn = 'flex h-10 items-center justify-center gap-2 self-stretch rounded-lg pt-0.5 font-sans text-[15px] leading-none font-medium text-white transition-ui'
const primary = `${btn} bg-primary-dark hover:bg-primary-light`
const outline = `${btn} border border-white/24 bg-white/8 hover:border-white/40 hover:bg-white/16`

/** 입력 상자 (아이콘 + 글자). filled 는 회원 가입 쪽 밝은 상자. 빨간 테두리(error)가 hover·focus 보다 우선 */
function Box({ value, onChange, placeholder, label, type = 'text', error, filled, icon }: { value: string; onChange: (v: string) => void; placeholder: string; label: string; type?: 'text' | 'password'; error?: boolean; filled?: boolean; icon?: ReactNode }) {
  return (
    <div
      className={cn(
        'flex h-10 items-center gap-2 self-stretch rounded-[6px] border px-3 py-2.5 transition-ui',
        filled ? 'bg-neutral-450' : 'bg-neutral-800',
        error ? 'border-accent-red' : cn(filled ? 'border-neutral-300/50' : 'border-neutral-450', 'hover:border-neutral-300 focus-within:border-primary'),
      )}
    >
      {icon}
      <input
        type={type}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`min-w-0 flex-[1_0_0] border-none bg-transparent font-['Pretendard'] text-[15px] leading-[normal] font-medium tracking-[0.6px] text-white outline-none placeholder:text-neutral-300`}
      />
    </div>
  )
}

const IdIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="fill-neutral-300 stroke-neutral-300">
    <circle cx="3.04762" cy="3.04762" r="3.04762" transform="matrix(-1 0 0 1 11.0479 1.16699)" />
    <path d="M2.66699 11.784C2.66699 11.1285 3.07907 10.5437 3.6964 10.3233C6.4796 9.32925 9.52106 9.32925 12.3043 10.3233C12.9216 10.5437 13.3337 11.1285 13.3337 11.784V12.9631C13.3337 13.7745 12.615 14.3978 11.8118 14.283L10.5459 14.1022C8.85742 13.861 7.14323 13.861 5.45474 14.1022L4.18889 14.283C3.38564 14.3978 2.66699 13.7745 2.66699 12.9631V11.784Z" />
  </svg>
)
const PwIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      className="fill-neutral-300"
      d="M11.1934 4.72754C13.2218 4.72773 14.866 6.372 14.8662 8.40039V11.4941C14.8662 13.5227 13.2219 15.1678 11.1934 15.168H5.00586C2.97735 15.1677 1.33301 13.5227 1.33301 11.4941V8.40039C1.33327 6.37205 2.97752 4.7278 5.00586 4.72754H11.1934ZM8.09961 8.67383C7.82356 8.67383 7.59976 8.89781 7.59961 9.17383V10.7207C7.59972 10.9967 7.82354 11.2207 8.09961 11.2207C8.37556 11.2206 8.5995 10.9967 8.59961 10.7207V9.17383C8.59946 8.8979 8.37554 8.67397 8.09961 8.67383Z"
    />
    <path className="stroke-neutral-300" d="M11.1925 5.30699V3.33366C11.1925 1.8609 9.99862 0.666992 8.52586 0.666992H7.67253C6.19977 0.666992 5.00586 1.8609 5.00586 3.33366L5.00586 5.30699" />
  </svg>
)

function LoginField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start justify-center gap-2.5 self-stretch">
      <span className="font-sans text-[14px] leading-none font-medium text-neutral-100">
        {label}
        <span className="ml-0.5 text-accent-red">*</span>
      </span>
      {children}
    </div>
  )
}

/** 권한 확인 — 지금 모드의 이벤트 권한(음성 / 전광판)으로 확인 */
export function LoginDialog() {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)
  const mode = disaster.use((s) => s.mode)
  const roleId = lists.use((s) => s.roles?.eventRoles.find((r) => r.name.includes(mode === 'voice' ? '음성' : '전광판'))?.id ?? '')

  // 빈 칸이면 아무 일 없음. 실패하면 상자를 빨갛게 + 알림 (창은 그대로)
  const login = () => {
    if (!id.trim() || !pw.trim() || pending) return
    setError(false)
    setPending(true)
    verifyEventRole({ userLoginId: id, userLoginPswd: pw, evetRoleId: roleId })
      .then((r) => {
        if (r.result === 'SUCCESS') return verified(r.message || '권한 확인 완료')
        setError(true)
        showToast(r.message || '권한 확인에 실패했습니다.', 'error')
      })
      .catch((err) => {
        console.warn('[verifyEventRole] 요청 실패', err)
        setError(true)
        showToast('권한 확인 요청에 실패했습니다. 권한 프로그램을 확인해 주세요.', 'error')
      })
      .finally(() => setPending(false))
  }

  return (
    <Dialog open onClose={close} label="권한 확인" className="w-[440px]">
      <DialogHeader title="권한 확인" onClose={close} size="form" />
      <div className="flex flex-col items-start gap-9 self-stretch border-b border-neutral-450 px-6 pt-3 pb-6">
        <div className="flex flex-col items-start gap-5 self-stretch">
          <LoginField label="아이디">
            <Box label="아이디" icon={<IdIcon />} placeholder="아이디 입력" value={id} onChange={(v) => (setId(v), setError(false))} error={error} />
          </LoginField>
          <LoginField label="비밀번호">
            <Box label="비밀번호" icon={<PwIcon />} type="password" placeholder="비밀번호 입력" value={pw} onChange={(v) => (setPw(v), setError(false))} error={error} />
          </LoginField>
        </div>
        <div className="flex flex-col items-start gap-3.5 self-stretch">
          <button type="button" onClick={login} className={primary}>
            확인
          </button>
          <button type="button" onClick={() => openDialog('signup')} className={outline}>
            등록
          </button>
        </div>
      </div>
    </Dialog>
  )
}

/** 이벤트 권한 체크 (18, 모서리 6 — 공용 체크박스보다 둥글다. 옛 화면 그대로) */
function RoleCheck({ on }: { on: boolean }) {
  return on ? (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect width="18" height="18" rx="6" className="fill-neutral-50" />
      <path d="M4 9L7.5 12.5L14 6" className="stroke-primary-dark" strokeWidth="2.07778" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect width="18" height="18" rx="6" className="fill-ice" fillOpacity="0.4" />
      <rect x="1" y="1" width="16" height="16" rx="5" className="stroke-ice" strokeOpacity="0.2" strokeWidth="2" />
    </svg>
  )
}

function SignupField({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex h-[66px] flex-col items-start justify-center gap-2.5', className)}>
      <span className="pl-1.5 font-sans text-[14px] leading-4 font-medium text-neutral-100">{label}</span>
      {children}
    </div>
  )
}

function DeptSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const depts = lists.use((s) => s.roles?.departments) ?? []
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // 열려 있을 때 바깥을 누르거나 다른 칸으로 가면 닫힘
  useEffect(() => {
    if (!open) return
    const off = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', off)
    document.addEventListener('focusin', off)
    return () => {
      document.removeEventListener('mousedown', off)
      document.removeEventListener('focusin', off)
    }
  }, [open])
  const shown = depts.find((d) => d.id === value)?.name || depts[0]?.name || '부서 선택'
  return (
    <div ref={ref} className="relative flex flex-col self-stretch">
      <button
        type="button"
        aria-label="부서 선택"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn('flex h-10 items-center gap-1 self-stretch rounded-[6px] border bg-neutral-450 py-1.5 pr-1 pl-3 transition-ui', open ? 'border-primary' : 'border-neutral-300/50 hover:border-neutral-300')}
      >
        <span className={`relative top-0.5 min-w-0 flex-[1_0_0] truncate text-left ${pretendard} text-[14px] leading-5 font-normal text-white`}>{shown}</span>
        <span className="flex size-7 shrink-0 items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className={cn('stroke-white [transition:rotate_0.15s_ease]', open && 'rotate-180')} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.5 7.75L10 12.25L14.5 7.75" />
          </svg>
        </span>
      </button>
      {open && (
        <div role="listbox" className="absolute inset-x-0 top-[calc(100%+4px)] z-10 flex flex-col gap-1 rounded-[6px] border border-neutral-450 bg-neutral-500 p-2">
          {depts.map((d) => (
            <button
              key={d.id}
              type="button"
              role="option"
              aria-selected={d.id === value}
              onClick={() => {
                onChange(d.id)
                setOpen(false)
              }}
              className={cn(`flex items-center self-stretch rounded px-3 py-1.5 text-left ${pretendard} text-[14px] leading-5 font-normal text-white`, d.id === value ? 'bg-primary' : 'hover:bg-neutral-450')}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** 권한 등록 — 아이디 중복 확인 → 가입. 되면 권한 확인 창으로 */
export function SignupDialog() {
  const roles = lists.use((s) => s.roles?.eventRoles) ?? []
  const firstDept = lists.use((s) => s.roles?.departments[0]?.id ?? '')
  const [f, setF] = useState({ id: '', name: '', pw: '', pw2: '', dpt: '' })
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())
  const [idError, setIdError] = useState(false)
  const [pending, setPending] = useState(false)
  // 부서를 안 골랐으면 첫 부서
  const dpt = f.dpt || firstDept
  const put = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))

  const register = async () => {
    if (pending) return
    if (!f.id.trim() || !f.name.trim() || !f.pw.trim() || !f.pw2.trim()) return showToast('입력 정보를 확인해 주세요.', 'error')
    if (f.pw !== f.pw2) return showToast('비밀번호가 일치하지 않습니다.', 'error')
    setPending(true)
    try {
      if (!(await checkLoginId(f.id.trim()))) {
        showToast('아이디가 중복입니다', 'error')
        setIdError(true)
        return
      }
      setIdError(false)
      const r = await registerUser({ userNm: f.name.trim(), userLoginId: f.id.trim(), userLoginPswd: f.pw, dptId: dpt, evetRoleIds: [...checked] })
      if (r.success) {
        openDialog('login')
        showToast('권한 등록이 완료되었습니다.', 'success')
      } else showToast(r.message ?? '등록에 실패했습니다.', 'error')
    } catch (err) {
      console.warn('[register] 요청 실패', err)
      showToast('등록 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'error')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open onClose={close} label="회원 가입" className="w-[440px]">
      <DialogHeader title="회원 가입" onClose={close} size="form" />
      <div className="flex flex-col items-start gap-9 self-stretch px-6 pt-3 pb-6">
        <div className="flex flex-col items-start gap-5 self-stretch">
          <div className="flex items-start gap-5 self-stretch">
            <SignupField label="아이디" className="flex-[1_0_0]">
              <Box filled label="아이디" placeholder="아이디 입력" value={f.id} onChange={(v) => (put('id')(v), setIdError(false))} error={idError} />
            </SignupField>
            <SignupField label="이름" className="flex-[1_0_0]">
              <Box filled label="이름" placeholder="이름 입력" value={f.name} onChange={put('name')} />
            </SignupField>
          </div>
          <SignupField label="비밀번호" className="self-stretch">
            <Box filled label="비밀번호" type="password" placeholder="비밀번호 입력" value={f.pw} onChange={put('pw')} />
          </SignupField>
          <SignupField label="비밀번호 확인" className="self-stretch">
            <Box filled label="비밀번호 확인" type="password" placeholder="비밀번호 재입력" value={f.pw2} onChange={put('pw2')} />
          </SignupField>
          <SignupField label="부서" className="self-stretch">
            <DeptSelect value={dpt} onChange={put('dpt')} />
          </SignupField>
          <SignupField label="이벤트 권한" className="self-stretch">
            <div className="flex items-center gap-5">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={checked.has(r.id)}
                  onClick={() =>
                    setChecked((p) => {
                      const n = new Set(p)
                      if (n.has(r.id)) n.delete(r.id)
                      else n.add(r.id)
                      return n
                    })
                  }
                  className="group flex items-center gap-2"
                >
                  <RoleCheck on={checked.has(r.id)} />
                  <span className="relative top-0.5 font-sans text-[14px] leading-none font-medium whitespace-nowrap text-white">{r.name}</span>
                </button>
              ))}
            </div>
          </SignupField>
        </div>
        <button type="button" onClick={register} disabled={pending} className={cn(primary, 'shrink-0')}>
          가입하기
        </button>
      </div>
    </Dialog>
  )
}
