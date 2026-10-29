// OMS 사용자 관리 — 아이디 중복 확인 + 회원가입(권한 등록).
//   ⚠️ OMS 서버(:11910) → vite proxy /oms (호스트 확정 필요).

// 아이디 중복 확인 — POST /oms/userMgt/api/chkLoginId (form-urlencoded, loginId).
//   ⚠️ 경로에 /api/ 필수 — 인터셉터 whitelist(/**/api/**)라 미인증 접근 가능.
//   응답: true(사용 가능) / false(중복).
export async function checkLoginId(loginId: string): Promise<boolean> {
  const body = new URLSearchParams({ loginId })
  const res = await fetch('/oms/userMgt/api/chkLoginId', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    throw new Error(`checkLoginId failed: ${res.status} ${res.statusText}`)
  }
  return (await res.text()).trim() === 'true'
}

export interface RegisterUserBody {
  userNm: string // 이름
  userLoginId: string // 아이디
  userLoginPswd: string // 비밀번호(평문)
  dptId: string // 부서 ID
  evetRoleIds: string[] // 이벤트 권한 ID (여러 개면 같은 이름으로 반복)
}

export interface RegisterUserResult {
  success: boolean
  /** 실패 시 responseMessage. */
  message?: string
}

// 회원가입 — POST /oms/userMgt/api/regUserInfo (form-urlencoded).
//   응답: JSON { result: "SUCCESS"|"FAIL", code, message } (verify 와 동일 형태).
export async function registerUser(
  params: RegisterUserBody,
): Promise<RegisterUserResult> {
  const body = new URLSearchParams()
  body.append('userNm', params.userNm)
  body.append('userLoginId', params.userLoginId)
  body.append('userLoginPswd', params.userLoginPswd)
  body.append('dptId', params.dptId)
  // evetRoleIds[] — 여러 권한이면 같은 키로 반복.
  params.evetRoleIds.forEach((rid) => body.append('evetRoleIds[]', rid))

  const res = await fetch('/oms/userMgt/api/regUserInfo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const text = (await res.text()).trim()
  try {
    const json = JSON.parse(text) as {
      result?: string
      code?: string
      message?: string
    }
    if (json.result === 'SUCCESS') return { success: true }
    return { success: false, message: json.message || '등록에 실패했습니다.' }
  } catch {
    return { success: false, message: text || '등록에 실패했습니다.' }
  }
}
