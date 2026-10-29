// 상태 pill — W 50 × H 32, radius 99, border white 25%, bg per kind.
// 육갑문 / 급경사지 column 의 row 우측 셀에 사용.

import { BORDERS } from '@/styles/designTokens'
import { STATUS_COLOR } from '@/utils/statusColors'
import { B4_TEXT } from './textStyles'
import type { StatusKind } from './types'

export function StatusPill({
  status,
  kind,
}: {
  status: string
  kind: StatusKind
}) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: '50px',
        height: '32px',
        borderRadius: '99px',
        border: BORDERS.pillWhite,
        background: STATUS_COLOR[kind],
      }}
    >
      <span style={B4_TEXT}>{status}</span>
    </div>
  )
}
