// 권한 등록(회원가입) 모달 — 로그인 모달의 "등록" 클릭 시 open.
//   아이디/이름 + 비밀번호/확인 + 부서 + 이벤트 권한 → 등록.
//   등록 클릭 → 아이디 중복 확인(chkLoginId) → 중복이면 toast + 아이디 error, 아니면 회원가입(regUserInfo).

import { useEffect, useRef, useState } from 'react'
import type { OmsDepartment, OmsEventRole } from '@/api/eventRole'
import { checkLoginId, registerUser } from '@/api/userMgt'

// 이벤트 권한 체크박스 도트 — selected / unselected (Figma SVG 18×18, radius 6).
function CheckDot({ checked }: { checked: boolean }) {
  return checked ? (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect width="18" height="18" rx="6" fill="#F4F8FB" />
      <path
        d="M4 9L7.5 12.5L14 6"
        stroke="#0D8AE0"
        strokeWidth="2.07778"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect width="18" height="18" rx="6" fill="#E0F2FF" fillOpacity="0.4" />
      <rect
        x="1"
        y="1"
        width="16"
        height="16"
        rx="5"
        stroke="#E0F2FF"
        strokeOpacity="0.2"
        strokeWidth="2"
      />
    </svg>
  )
}

// 필드 라벨 (제목) — Neutral-100 #DCE6EE, Roboto 14/500/16
function Label({ text }: { text: string }) {
  return (
    <span
      style={{
        paddingLeft: '6px',
        color: '#DCE6EE',
        fontFamily: 'Roboto',
        fontSize: '14px',
        fontWeight: 500,
        lineHeight: '16px',
      }}
    >
      {text}
    </span>
  )
}

// 텍스트 입력 박스 — controlled. error 시 빨간 border.
function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  error = false,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  type?: 'text' | 'password'
  error?: boolean
}) {
  return (
    <div
      className={`login-field login-field--filled self-stretch${
        error ? ' login-field--error' : ''
      }`}
    >
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="login-input"
      />
    </div>
  )
}

// 부서 셀렉트 — 커스텀 드롭다운 (controlled: value=dptId). departments 표출.
function DeptSelect({
  departments,
  value,
  onChange,
}: {
  departments: OmsDepartment[]
  value: string
  onChange: (dptId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // 열려있을 때 바깥 클릭 / 다른 폼 포커스(focusin) → 닫기.
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('focusin', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('focusin', close)
    }
  }, [open])
  const display =
    departments.find((d) => d.id === value)?.name ||
    departments[0]?.name ||
    '부서 선택'
  return (
    <div ref={ref} className="relative flex flex-col self-stretch">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`dept-select flex items-center self-stretch${open ? ' dept-select--open' : ''}`}
        style={{
          height: '40px',
          padding: '6px 4px 6px 12px',
          gap: '4px',
          borderRadius: '6px',
        }}
        aria-label="부서 선택"
      >
        <span
          className="dept-value"
          style={{
            flex: '1 0 0',
            minWidth: 0,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: '#FFF',
            fontFamily: 'Pretendard',
            fontSize: '14px',
            fontWeight: 400,
            lineHeight: '20px',
            position: 'relative',
            top: '2px',
          }}
        >
          {display}
        </span>
        <span
          className="flex items-center justify-center"
          style={{ width: '28px', height: '28px', flexShrink: 0 }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
            style={{
              transform: open ? 'rotate(180deg)' : undefined,
              transition: 'transform 0.15s',
            }}
          >
            <path
              d="M5.5 7.75L10 12.25L14.5 7.75"
              stroke="#FFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {open && (
        <div
          className="absolute flex flex-col"
          style={{
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 10,
            padding: '8px',
            gap: '4px',
            borderRadius: '6px',
            border: '1px solid #1B4671',
            background: '#003060',
          }}
        >
          {departments.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                onChange(d.id)
                setOpen(false)
              }}
              className="dept-option flex items-center self-stretch"
              style={{
                padding: '6px 12px',
                textAlign: 'left',
                color: '#FFF',
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                background: d.id === value ? '#1EA7FF' : undefined,
              }}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface SignupModalProps {
  open: boolean
  onClose: () => void
  /** 부서 목록 (roles-departments). */
  departments: OmsDepartment[]
  /** 이벤트 권한 목록 (roles-departments) — 체크박스. */
  eventRoles: OmsEventRole[]
  /** toast 표출 (부모 DisasterPanel). */
  onToast: (message: string, type: 'success' | 'error') => void
  /** 등록 성공 — 부모가 권한 확인 모달로 전환. */
  onSuccess: () => void
}

export function SignupModal({
  open,
  onClose,
  departments,
  eventRoles,
  onToast,
  onSuccess,
}: SignupModalProps) {
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [dptId, setDptId] = useState('')
  const [checkedRoles, setCheckedRoles] = useState<Set<string>>(new Set())
  const [idError, setIdError] = useState(false)
  const [pending, setPending] = useState(false)

  // 닫히면 입력 초기화.
  useEffect(() => {
    if (!open) {
      setId('')
      setName('')
      setPw('')
      setPwConfirm('')
      setDptId('')
      setCheckedRoles(new Set())
      setIdError(false)
      setPending(false)
    }
  }, [open])
  // 열려있고 부서 미선택이면 첫 부서 기본 선택.
  useEffect(() => {
    if (open && !dptId && departments.length) setDptId(departments[0].id)
  }, [open, departments, dptId])

  const toggleRole = (rid: string) =>
    setCheckedRoles((prev) => {
      const next = new Set(prev)
      if (next.has(rid)) next.delete(rid)
      else next.add(rid)
      return next
    })

  // 등록 — 아이디 중복 확인 → 중복이면 toast+error, 아니면 회원가입.
  const handleRegister = async () => {
    if (pending) return
    if (!id.trim() || !name.trim() || !pw.trim() || !pwConfirm.trim()) {
      onToast('입력 정보를 확인해 주세요.', 'error')
      return
    }
    if (pw !== pwConfirm) {
      onToast('비밀번호가 일치하지 않습니다.', 'error')
      return
    }
    setPending(true)
    try {
      const available = await checkLoginId(id.trim())
      if (!available) {
        onToast('아이디가 중복입니다', 'error')
        setIdError(true)
        return
      }
      setIdError(false)
      const res = await registerUser({
        userNm: name.trim(),
        userLoginId: id.trim(),
        userLoginPswd: pw,
        dptId,
        evetRoleIds: [...checkedRoles],
      })
      if (res.success) {
        onSuccess()
      } else {
        onToast(res.message ?? '등록에 실패했습니다.', 'error')
      }
    } catch (err) {
      console.warn('[register] 요청 실패', err)
      onToast('등록 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'error')
    } finally {
      setPending(false)
    }
  }

  if (!open) return null
  return (
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
        {/* 헤더 — 제목 + 닫기 */}
        <div
          className="flex items-center self-stretch"
          style={{ padding: '20px 16px 16px 24px', gap: '8px' }}
        >
          <span
            style={{
              flex: '1 0 0',
              color: '#FFF',
              fontFamily: "'Do Hyeon', var(--font-sans)",
              fontSize: '24px',
              fontWeight: 400,
              lineHeight: '1',
            }}
          >
            회원 가입
          </span>
          <button
            type="button"
            onClick={onClose}
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

        {/* 메인영역 — 폼 + 가입하기 (gap 36) */}
        <div
          className="flex flex-col items-start self-stretch"
          style={{ padding: '12px 24px 24px 24px', gap: '36px' }}
        >
          {/* 푸터 제외 메인 (폼) — gap 20 */}
          <div
            className="flex flex-col items-start self-stretch"
            style={{ gap: '20px' }}
          >
            {/* 아이디 + 이름 (row, gap 20) */}
            <div
              className="flex self-stretch"
              style={{ alignItems: 'flex-start', gap: '20px' }}
            >
              {/* 아이디 (flex 1) */}
              <div
                className="flex flex-col"
                style={{
                  height: '66px',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  gap: '10px',
                  flex: '1 0 0',
                }}
              >
                <Label text="아이디" />
                <TextInput
                  value={id}
                  onChange={(v) => {
                    setId(v)
                    setIdError(false)
                  }}
                  placeholder="아이디 입력"
                  error={idError}
                />
              </div>
              {/* 이름 (flex 1) */}
              <div
                className="flex flex-col"
                style={{
                  height: '66px',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  gap: '10px',
                  flex: '1 0 0',
                }}
              >
                <Label text="이름" />
                <TextInput
                  value={name}
                  onChange={setName}
                  placeholder="이름 입력"
                />
              </div>
            </div>

            {/* 비밀번호 */}
            <div
              className="flex flex-col self-stretch"
              style={{
                height: '66px',
                justifyContent: 'center',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <Label text="비밀번호" />
              <TextInput
                value={pw}
                onChange={setPw}
                placeholder="비밀번호 입력"
                type="password"
              />
            </div>

            {/* 비밀번호 확인 */}
            <div
              className="flex flex-col self-stretch"
              style={{
                height: '66px',
                justifyContent: 'center',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <Label text="비밀번호 확인" />
              <TextInput
                value={pwConfirm}
                onChange={setPwConfirm}
                placeholder="비밀번호 재입력"
                type="password"
              />
            </div>

            {/* 부서 선택 (full width) */}
            <div
              className="flex flex-col self-stretch"
              style={{
                height: '66px',
                justifyContent: 'center',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <Label text="부서" />
              <DeptSelect
                departments={departments}
                value={dptId}
                onChange={setDptId}
              />
            </div>

            {/* 이벤트 권한 — 라벨 + 체크박스 */}
            <div
              className="flex flex-col self-stretch"
              style={{
                height: '66px',
                justifyContent: 'center',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <Label text="이벤트 권한" />
              <div className="flex items-center" style={{ gap: '20px' }}>
                {eventRoles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.id)}
                    className="group flex items-center"
                    style={{ gap: '8px' }}
                  >
                    <CheckDot checked={checkedRoles.has(role.id)} />
                    <span
                      style={{
                        color: '#FFF',
                        fontFamily: 'Roboto',
                        fontSize: '14px',
                        fontWeight: 500,
                        lineHeight: '1',
                        whiteSpace: 'nowrap',
                        position: 'relative',
                        top: '2px',
                      }}
                    >
                      {role.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 가입하기 — 아이디 중복 확인 → 회원가입 */}
          <button
            type="button"
            onClick={handleRegister}
            disabled={pending}
            className="login-btn-primary flex shrink-0 items-center justify-center self-stretch"
            style={{
              height: '40px',
              gap: '8px',
              paddingTop: '2px',
              borderRadius: '8px',
              color: '#FFF',
              fontFamily: 'Roboto',
              fontSize: '15px',
              fontWeight: 500,
              lineHeight: '1',
            }}
          >
            가입하기
          </button>
        </div>
      </div>
    </div>
  )
}
