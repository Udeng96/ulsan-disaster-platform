// 로그인 모달 — "로그인 후 송출" 버튼 클릭 시 open. 아이디/비밀번호 입력 + 로그인/회원가입.
//   ⚠️ 실제 인증 미연동 — 로그인 버튼은 빈 값이면 error, 아니면 onLogin(현재 바로 송출).
//   fixed inset-0 (ScaledFrame 안에서 스케일).

import { useEffect, useState } from 'react'
import { verifyEventRole } from '@/api/eventRole'

// 아이디 아이콘 (16×16, Figma)
function IdIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle
        cx="3.04762"
        cy="3.04762"
        r="3.04762"
        transform="matrix(-1 0 0 1 11.0479 1.16699)"
        fill="#7F97AF"
        stroke="#7F97AF"
      />
      <path
        d="M2.66699 11.784C2.66699 11.1285 3.07907 10.5437 3.6964 10.3233C6.4796 9.32925 9.52106 9.32925 12.3043 10.3233C12.9216 10.5437 13.3337 11.1285 13.3337 11.784V12.9631C13.3337 13.7745 12.615 14.3978 11.8118 14.283L10.5459 14.1022C8.85742 13.861 7.14323 13.861 5.45474 14.1022L4.18889 14.283C3.38564 14.3978 2.66699 13.7745 2.66699 12.9631V11.784Z"
        fill="#7F97AF"
        stroke="#7F97AF"
      />
    </svg>
  )
}

// 비밀번호 아이콘 (16×16, Figma)
function PwIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M11.1934 4.72754C13.2218 4.72773 14.866 6.372 14.8662 8.40039V11.4941C14.8662 13.5227 13.2219 15.1678 11.1934 15.168H5.00586C2.97735 15.1677 1.33301 13.5227 1.33301 11.4941V8.40039C1.33327 6.37205 2.97752 4.7278 5.00586 4.72754H11.1934ZM8.09961 8.67383C7.82356 8.67383 7.59976 8.89781 7.59961 9.17383V10.7207C7.59972 10.9967 7.82354 11.2207 8.09961 11.2207C8.37556 11.2206 8.5995 10.9967 8.59961 10.7207V9.17383C8.59946 8.8979 8.37554 8.67397 8.09961 8.67383Z"
        fill="#7F97AF"
      />
      <path
        d="M11.1925 5.30699V3.33366C11.1925 1.8609 9.99862 0.666992 8.52586 0.666992H7.67253C6.19977 0.666992 5.00586 1.8609 5.00586 3.33366L5.00586 5.30699"
        stroke="#7F97AF"
      />
    </svg>
  )
}

// 입력 필드 (라벨 + 아이콘 input). error 시 박스 border 빨강.
function Field({
  label,
  icon,
  placeholder,
  type = 'text',
  value,
  onChange,
  error,
}: {
  label: string
  icon: React.ReactNode
  placeholder: string
  type?: 'text' | 'password'
  value: string
  onChange: (v: string) => void
  error?: boolean
}) {
  return (
    <div
      className="flex flex-col self-stretch"
      style={{
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: '10px',
      }}
    >
      {/* 라벨 + 필수(*) */}
      <span
        style={{
          color: '#DCE6EE',
          fontFamily: 'Roboto',
          fontSize: '14px',
          fontWeight: 500,
          lineHeight: '1',
        }}
      >
        {label}
        <span style={{ color: '#FF4245', marginLeft: '2px' }}>*</span>
      </span>
      {/* input 박스 — default/hover/focus/error 상태 (CSS .login-field) */}
      <div
        className={`login-field self-stretch${error ? ' login-field--error' : ''}`}
      >
        {icon}
        <input
          type={type}
          placeholder={placeholder}
          className="login-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

interface LoginModalProps {
  open: boolean
  onClose: () => void
  /** 권한 확인 성공(SUCCESS) 시 — 모달 닫고 송출 버튼으로 전환 + 초록 toast(message). */
  onVerified: (message: string) => void
  /** 권한 확인 실패(FAIL·요청실패) 시 — 응답 message 로 toast. 모달은 유지. */
  onError: (message: string) => void
  /** 권한 등록(회원가입) 버튼 클릭 — 등록 모달 open. */
  onSignup: () => void
  /** 발생시킬 이벤트 권한 ID (OMS oms_event_role_info.evet_role_id). */
  evetRoleId: string
}

export function LoginModal({
  open,
  onClose,
  onVerified,
  onError,
  onSignup,
  evetRoleId,
}: LoginModalProps) {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)

  // 닫히면 입력했던 아이디/비번/에러 초기화 (모달은 unmount 안 돼서 수동 리셋).
  useEffect(() => {
    if (!open) {
      setId('')
      setPw('')
      setError(false)
      setPending(false)
    }
  }, [open])

  if (!open) return null

  // 권한 확인 — OMS verify. 빈 값이면 무동작(진입/입력 전엔 에러 없음).
  //   SUCCESS → onVerified(모달 닫고 송출 버튼) / FAIL·요청실패 → 입력 error 표시 + onError(toast).
  const handleLogin = () => {
    if (!id.trim() || !pw.trim() || pending) return
    setError(false)
    setPending(true)
    verifyEventRole({ userLoginId: id, userLoginPswd: pw, evetRoleId })
      .then((r) => {
        if (r.result === 'SUCCESS') {
          onVerified(r.message || '권한 확인 완료')
        } else {
          setError(true)
          onError(r.message || '권한 확인에 실패했습니다.')
        }
      })
      .catch((err) => {
        console.warn('[verifyEventRole] 요청 실패', err)
        setError(true)
        onError('권한 확인 요청에 실패했습니다. 권한 프로그램을 확인해 주세요.')
      })
      .finally(() => setPending(false))
  }

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
            권한 확인
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
        {/* 메인 내용 — 아이디/비밀번호 + 버튼 (border-bottom) */}
        <div
          className="flex flex-col items-start self-stretch"
          style={{
            padding: '12px 24px 24px 24px',
            gap: '36px',
            borderBottom: '1px solid #1B4671',
          }}
        >
          {/* 아이디 / 비밀번호 + 에러 메시지 */}
          <div
            className="flex flex-col items-start self-stretch"
            style={{ gap: '20px' }}
          >
            <Field
              label="아이디"
              icon={<IdIcon />}
              placeholder="아이디 입력"
              value={id}
              onChange={(v) => {
                setId(v)
                setError(false)
              }}
              error={error}
            />
            {/* 비밀번호 + 에러 메시지 — gap 8 로 비밀번호에 붙임 */}
            <div
              className="flex flex-col items-start self-stretch"
              style={{ gap: '8px' }}
            >
              <Field
                label="비밀번호"
                icon={<PwIcon />}
                placeholder="비밀번호 입력"
                type="password"
                value={pw}
                onChange={(v) => {
                  setPw(v)
                  setError(false)
                }}
                error={error}
              />
              {/* 실패 메시지는 toast(onError)로 표출 — 인라인 메시지 제거. 입력 error(빨간 border)만 유지. */}
            </div>
          </div>
          {/* 버튼 영역 — 로그인 / 회원가입 */}
          <div
            className="flex flex-col items-start self-stretch"
            style={{ gap: '14px' }}
          >
            <button
              type="button"
              onClick={handleLogin}
              className="login-btn-primary flex items-center justify-center self-stretch"
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
              확인
            </button>
            {/* 권한 등록 — 회원가입 모달 open */}
            <button
              type="button"
              onClick={onSignup}
              className="login-btn-outline flex items-center justify-center self-stretch"
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
              등록
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
