// OMS 이벤트 발생 권한 확인.
//   POST /oms/api/role/event/verify  (application/x-www-form-urlencoded)
//   params: userLoginId, userLoginPswd(평문), evetRoleId(발생시킬 이벤트 권한 ID)
//   ⚠️ OMS 서버(:11910)는 gis(8081)와 별개 → vite proxy 에 /oms 프록시 추가 필요 (호스트 확정 후).
//
// 응답: { result, code, message }
//   SUCCESS 2000  권한 확인 완료 (이벤트 발생 가능)
//   FAIL    4053  등록되지 않은 사용자
//   FAIL    4054  비밀번호 불일치
//   FAIL    4059  미승인 계정 (관리자 승인 대기)
//   FAIL    4060  해당 이벤트 권한 없음

export interface VerifyEventRoleResult {
  result: 'SUCCESS' | 'FAIL'
  code: string
  message: string
}

// 이벤트 권한 / 부서 목록 — GET /api/oms/roles-departments.
//   권한 확인(evetRoleId 조회) + 권한 등록(부서 셀렉트 / 이벤트 권한 체크) 에 사용.
export interface OmsEventRole {
  id: string
  name: string
  description: string
}
export interface OmsDepartment {
  id: string
  code: string
  name: string
}
export interface OmsRolesDepartments {
  eventRoles: OmsEventRole[]
  departments: OmsDepartment[]
}

export async function fetchRolesDepartments(): Promise<OmsRolesDepartments> {
  const res = await fetch('/api/oms/roles-departments')
  if (!res.ok) {
    throw new Error(
      `fetchRolesDepartments failed: ${res.status} ${res.statusText}`,
    )
  }
  return (await res.json()) as OmsRolesDepartments
}

export async function verifyEventRole(params: {
  userLoginId: string
  userLoginPswd: string
  evetRoleId: string
}): Promise<VerifyEventRoleResult> {
  const body = new URLSearchParams({
    userLoginId: params.userLoginId,
    userLoginPswd: params.userLoginPswd,
    evetRoleId: params.evetRoleId,
  })
  const res = await fetch('/oms/api/role/event/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    throw new Error(`verifyEventRole failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as VerifyEventRoleResult
}
