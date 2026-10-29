// 재해문자전광판 송출 — POST /api/signboard/alerts (JSON).
//   프론트는 내용 + 대상만 전달. 표출시간/만료/우선순위/구분/타임스탬프는 백엔드가 생성.
//   gis(8081) → 전광판 모듈(8095 /internal/signboard/alerts) 로 전달됨.

export interface SignboardAlertBody {
  msgCn: string // 표출 내용 (텍스트 입력)
  targetHosts: string[] // 선택 전광판 도메인
}

export interface SignboardAlertResult {
  success: boolean
  message?: string
  /** 현재 표출 중인 전광판 도메인 (이전 송출분 포함) — 응답 targetHosts. */
  displayingHosts?: string[]
}

// 송출 요청. HTTP 실패 시 throw, 응답 본문이 있으면 status/result 로 성공 판정.
export async function dispatchSignboardAlert(
  body: SignboardAlertBody,
): Promise<SignboardAlertResult> {
  const res = await fetch('/api/signboard/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`signboard alert failed: ${res.status} ${res.statusText}`)
  }
  const text = (await res.text()).trim()
  if (!text) return { success: true }
  try {
    const json = JSON.parse(text) as {
      status?: string
      result?: string
      resultMessage?: string
      /** 성공 시 "host : identifier" 목록 / 실패 시 메시지 문자열. */
      message?: string[] | string
      targetHosts?: string[]
    }
    const flag = json.status ?? json.result
    if (!flag || flag === 'SUCCESS' || flag === 'SENT') {
      return { success: true, displayingHosts: extractHosts(json) }
    }
    const msg = Array.isArray(json.message)
      ? json.message.join(', ')
      : json.message
    return {
      success: false,
      message: msg || json.resultMessage || '송출에 실패했습니다.',
    }
  } catch {
    return { success: true } // JSON 아님 → HTTP 200 이면 성공 처리
  }
}

// 표출 중 전광판 도메인 추출 — message ["host : identifier", ...] 에서 host 만, 중복 제거.
//   (같은 전광판이 여러 건(identifier) 표출 중일 수 있음)
function extractHosts(json: {
  message?: string[] | string
  targetHosts?: string[]
}): string[] | undefined {
  if (Array.isArray(json.message)) {
    const hosts = json.message
      .map((line) => line.split(':')[0]?.trim())
      .filter((h): h is string => !!h)
    return [...new Set(hosts)]
  }
  return json.targetHosts
}
