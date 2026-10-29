// 관리자 본문 — 서버랙.
//   배경이 랙 사진(server_reck.png, 237×672) 이고 그 위에 슬롯을 위에서부터 쌓는다.
//   슬롯 폭 = 인덱스 22 + gap 6 + 랙 164 = 192 (프레임 안쪽 폭과 같다).
//   랙 칸 안에는 장비 앞면(RackPanel) 이 들어간다.

import { RackPanel } from './RackPanel'
import { RackSecui } from './RackSecui'
import { RackPortGrid } from './RackPortGrid'
import { RackPort1G } from './RackPort1G'
import { RackVent } from './RackVent'

/** 지금은 1번만 — 나머지는 내용이 정해지면 늘린다. */
const RACK_COUNT = 1

export function AdminRack() {
  return (
    <div className="admin-rack-frame">
      {Array.from({ length: RACK_COUNT }, (_, i) => (
        <div key={i} className="admin-rack-slot">
          <span className="admin-rack-slot-index">{i + 1}</span>
          <div className="admin-rack-slot-box">
            <RackPanel>
              <RackSecui />
              <RackPortGrid />
              <RackPort1G />
              <RackVent />
              <RackVent />
            </RackPanel>
          </div>
        </div>
      ))}
    </div>
  )
}
