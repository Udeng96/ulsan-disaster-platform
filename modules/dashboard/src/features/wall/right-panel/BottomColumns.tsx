// 우측 패널 하단 3 column wrapper — 육갑문 / 급경사지 / 지진가속도.
// flex row, gap 10, 위 바디와 8px gap.

import { MiniColumn } from './MiniColumn'
import {
  PUMP_STATUS_ROWS,
  SEISMIC_INSTRUMENTS,
  SLOPE_STATUS_ROWS,
} from './data'

export function BottomColumns() {
  return (
    <div
      className="flex items-center self-stretch"
      style={{
        gap: '10px',
        marginTop: '8px',
      }}
    >
      <MiniColumn
        title="육갑문"
        headers={['구분', '상태']}
        rows={PUMP_STATUS_ROWS}
      />
      <MiniColumn
        title="급경사지"
        headers={['구분', '상태']}
        rows={SLOPE_STATUS_ROWS}
      />
      <MiniColumn title="지진가속도" instruments={SEISMIC_INSTRUMENTS} />
    </div>
  )
}
