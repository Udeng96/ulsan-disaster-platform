// 운영 서버 상세 — 4번 솔루션 · 5번 대시보드 · 6번 IoT · 7번 GIS · 8번 CCTV. 그림·표 틀은 데이터베이스와 같고(RackServer) 디테일만 다르다 (사용자 10-23).
//   전면: 아래 드라이브 칸 오른쪽 둘이 빈 칸 · 후면: USB 4개, 확장 슬롯 7개 (사용자 10-23 캡처). 대시보드는 그림·표가 솔루션과 아예 같음, IoT·CCTV는 후면만 다름, GIS는 전면 BAY3·4 규격서만 · 후면은 데이터베이스와 같음 (사용자 10-23).
//   왼쪽 요약 상자는 데이터베이스와 같은 모양, 값은 server /servers/{host} (HostSummary). 표는 디자인 줄에 /parts 값을 덮음 (사용자 10-23)
import { memo } from 'react'
import type { PortRow } from './FirewallFront'
import { HostSummary } from './HostSummary'
import { RackDetail, type RackSpec } from './RackServer'

/** 전면 표 3묶음 — 줄 내용은 디자인 캡처 (사용자 10-23). 캡처에서 '…' 로 잘린 칸은 데이터베이스 글자로 채움 (화면에선 같은 자리에서 잘림):
 *  이름 '전원 버튼' · 'LED1 전원' 등, 상태 '미사용' · '비어있음' · '빈 슬롯', 사용/용량 '— / 480G' · '증설 자리' */
const FRONT: PortRow[][] = [
  [
    { name: '전원 버튼', mount: '좌 이어', used: true, state: '켜짐', tone: 'ok', usage: '—' },
    { name: 'ID 버튼', mount: '장비 식별', state: '미사용', tone: 'idle', usage: '—' },
    { name: 'RST 핀홀', mount: '리셋', state: '미사용', tone: 'idle', usage: '—' },
    { name: 'LED1 전원', mount: '—', used: true, state: '점등', tone: 'ok', usage: '—' },
    { name: 'LED2 상태', mount: '—', used: true, state: '점등', tone: 'ok', usage: '—' },
    { name: 'LED3 LAN', mount: '—', used: true, state: '점등', tone: 'ok', usage: '—' },
  ],
  [
    { name: 'USB1 (좌 이어)', mount: '정비용', state: '비어있음', tone: 'idle', usage: '—' },
    { name: 'USB2 (우 이어)', mount: '정비용', state: '비어있음', tone: 'idle', usage: '—' },
    { name: 'BAY1', mount: '480G 장착', used: true, state: '장착', tone: 'ok', usage: '— / 480G' },
    { name: 'BAY2', mount: '480G 장착', used: true, state: '장착', tone: 'ok', usage: '— / 480G' },
    { name: 'BAY3', mount: '—', state: '빈 슬롯', tone: 'idle', usage: '증설 자리' },
    { name: 'BAY4', mount: '—', state: '빈 슬롯', tone: 'idle', usage: '증설 자리' },
  ],
  ['BAY5', 'BAY6', 'BAY7', 'BAY8'].map((name) => ({ name, mount: '—', state: '빈 슬롯', tone: 'idle', usage: '증설 자리' })),
]

/** 후면 표 3묶음 — 줄 내용은 디자인 캡처 (사용자 10-23). 잘린 칸은 보이는 글자 뒤를 어림해 채움:
 *  PSU 상태 '공급' · 트래픽 '— / 800W', VGA·COM '미사용', USB '비어 있음', Mgmt 이름 'Mgmt (BMC)' · '원격관리 · IP 미확인' · '미확인'(노랑),
 *  LAN1 '→ 통플 SW (GbE)', LAN2 '미사용', RB '후면 옵션 2.5"' · '실측 전'. 사용/용량·트래픽은 서버 값 (liveRows) */
const REAR: PortRow[][] = [
  [
    { name: 'PSU1', mount: 'PDU 미확인', used: true, state: '공급', tone: 'ok', usage: '— / 800W' },
    { name: 'PSU2', mount: 'PDU 미확인', used: true, state: '공급', tone: 'ok', usage: '— / 800W' },
    { name: 'VGA', mount: '현장 콘솔', state: '미사용', tone: 'idle', usage: '—' },
    { name: 'COM', mount: '시리얼', state: '미사용', tone: 'idle', usage: '—' },
    { name: 'USB1', mount: '정비용', state: '비어 있음', tone: 'idle', usage: '—' },
    { name: 'USB2', mount: '정비용', state: '비어 있음', tone: 'idle', usage: '—' },
    { name: 'USB3', mount: '정비용', state: '비어 있음', tone: 'idle', usage: '—' },
  ],
  [
    { name: 'USB4', mount: '정비용', state: '비어 있음', tone: 'idle', usage: '—' },
    { name: 'Mgmt (BMC)', mount: '원격관리 · IP 미확인', used: true, state: '미확인', tone: 'warn', usage: '—' },
    { name: 'LAN1', mount: '→ 통플 SW (GbE)', used: true, state: '결선', tone: 'ok', usage: '측정 전' },
    { name: 'LAN2', mount: '—', state: '미사용', tone: 'idle', usage: '—' },
    { name: 'PCIe1', mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' },
    { name: 'PCIe2', mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' },
    { name: 'PCIe3', mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' },
  ],
  [
    { name: 'PCIe4', mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' },
    { name: 'PCIe5', mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' },
    { name: 'PCIe6', mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' },
    { name: 'PCIe7', mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' },
    { name: 'RB1', mount: '후면 옵션 2.5"', used: true, state: '실측 전', tone: 'warn', usage: '—' },
    { name: 'RB2', mount: '후면 옵션 2.5"', used: true, state: '실측 전', tone: 'warn', usage: '—' },
  ],
]

/** IoT 후면 표 — 디자인 캡처 (사용자 10-23). 잘린 칸은 솔루션과 같은 글자로, 새 줄은 어림: PSU '— / 1200W', PCIe1 'FC 16G 2port HBA' 장착(파랑),
 *  FC-P1·P2 '미결선'(노랑). Mgmt 줄은 캡처에서 말풍선에 가려 솔루션과 같게 */
const IOT_REAR: PortRow[][] = [
  [
    { name: 'PSU1', mount: 'PDU 미확인', used: true, state: '공급', tone: 'ok', usage: '— / 1200W' },
    { name: 'PSU2', mount: 'PDU 미확인', used: true, state: '공급', tone: 'ok', usage: '— / 1200W' },
    { name: 'VGA', mount: '현장 콘솔', state: '미사용', tone: 'idle', usage: '—' },
    { name: 'COM', mount: '시리얼', state: '미사용', tone: 'idle', usage: '—' },
    { name: 'USB1', mount: '정비용', state: '비어 있음', tone: 'idle', usage: '—' },
    { name: 'USB2', mount: '정비용', state: '비어 있음', tone: 'idle', usage: '—' },
    { name: 'Mgmt (BMC)', mount: '원격관리 · IP 미확인', used: true, state: '미확인', tone: 'warn', usage: '—' },
  ],
  [
    { name: 'LAN1', mount: '→ 통플 SW (GbE)', used: true, state: '결선', tone: 'ok', usage: '측정 전' },
    { name: 'LAN2', mount: '—', state: '미사용', tone: 'idle', usage: '—' },
    { name: 'PCIe1', mount: 'FC 16G 2port HBA', used: true, state: '장착', tone: 'info', usage: '—' },
    { name: 'FC-P1', mount: '—', used: true, state: '미결선', tone: 'warn', usage: '—' },
    { name: 'FC-P2', mount: '—', used: true, state: '미결선', tone: 'warn', usage: '—' },
    { name: 'PCIe2', mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' },
    { name: 'PCIe3', mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' },
  ],
  [
    { name: 'PCIe4', mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' },
    { name: 'PCIe5', mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' },
    { name: 'PCIe6', mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' },
    { name: 'RB1', mount: '후면 옵션 2.5"', used: true, state: '실측 전', tone: 'warn', usage: '—' },
    { name: 'RB2', mount: '후면 옵션 2.5"', used: true, state: '실측 전', tone: 'warn', usage: '—' },
  ],
]

/** GIS 전면 표 — 솔루션과 같고 BAY3·4 만 '8TB (규격서)' · '확인 필요'(노랑) · '— / 8TB' (캡처 10-23, 잘린 상태 글자는 어림) */
const GIS_FRONT: PortRow[][] = [
  FRONT[0],
  [
    ...FRONT[1].slice(0, 4),
    { name: 'BAY3', mount: '8TB (규격서)', used: true, state: '확인 필요', tone: 'warn', usage: '— / 8TB' },
    { name: 'BAY4', mount: '8TB (규격서)', used: true, state: '확인 필요', tone: 'warn', usage: '— / 8TB' },
  ],
  FRONT[2],
]

/** GIS 후면 표 — IoT 에서 FC 줄을 뺀 구성 (캡처 10-23) */
const GIS_REAR: PortRow[][] = [
  IOT_REAR[0].slice(0, 6),
  [IOT_REAR[0][6], IOT_REAR[1][0], IOT_REAR[1][1], { name: 'PCIe1', mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' }, ...IOT_REAR[1].slice(5)],
  IOT_REAR[2],
]

/** 그림·표 — 솔루션 · 대시보드 같음. 이름판 글씨만 장비 이름 */
const SPEC: Omit<RackSpec, 'name'> = {
  bays: [{ plate: '480G' }, { plate: '480G' }, null, null],
  psu: '800W',
  gbe: 'GbE LAN1·2',
  usb: 4,
  slots: 7,
  front: FRONT,
  frontNote: '장착 내용은 규격서·사진 기준 · 사용/용량은 관리자 프로그램(SMART·df) 연동 후 실시간 · 노랑 = 실측 미확인',
  rear: REAR,
  rearNote: '케이블 태그 미판독 · PDU 배선·BMC IP 미확인',
}
const SOLUTION: RackSpec = { ...SPEC, name: '솔루션' }
const DASHBOARD: RackSpec = { ...SPEC, name: '대시보드' }
/** IoT — 전면은 같고 후면이 다름: 전원 1200W, USB 2개, 확장 슬롯 6개 중 첫째가 FC 카드 (캡처 10-23) */
const IOT: RackSpec = { ...SPEC, name: 'IoT', psu: '1200W', usb: 2, slots: 6, fc: true, rear: IOT_REAR }
/** CCTV — 그림·표가 IoT 와 같음 (캡처 10-23) */
const CCTV: RackSpec = { ...IOT, name: 'CCTV' }
/** GIS — 전면 BAY3·4 는 규격서만(판 어둡게), 후면은 데이터베이스와 같은 모양 (USB 2, 슬롯 6, FC 없음) (캡처 10-23) */
const GIS: RackSpec = { ...SPEC, name: 'GIS', bays: [{ plate: '480G' }, { plate: '480G' }, { plate: '8TB', spec: true }, { plate: '8TB', spec: true }], psu: '1200W', usb: 2, slots: 6, front: GIS_FRONT, rear: GIS_REAR }

/** 4번 솔루션 상세 */
export const SolutionDetail = memo(function SolutionDetail() {
  return <RackDetail seq={4} label="솔루션 상세" summary={<HostSummary seq={4} label="솔루션 요약" title="4. (운영) 솔루션" />} spec={SOLUTION} />
})

/** 5번 대시보드 상세 */
export const DashboardDetail = memo(function DashboardDetail() {
  return <RackDetail seq={5} label="대시보드 상세" summary={<HostSummary seq={5} label="대시보드 요약" title="5. (운영) 대시보드" />} spec={DASHBOARD} />
})

/** 6번 IoT 상세 */
export const IotDetail = memo(function IotDetail() {
  return <RackDetail seq={6} label="IoT 상세" summary={<HostSummary seq={6} label="IoT 요약" title="6. (운영) IoT" />} spec={IOT} />
})

/** 7번 GIS 상세 */
export const GisDetail = memo(function GisDetail() {
  return <RackDetail seq={7} label="GIS 상세" summary={<HostSummary seq={7} label="GIS 요약" title="7. (운영) GIS" />} spec={GIS} />
})

/** 8번 CCTV 상세 */
export const CctvDetail = memo(function CctvDetail() {
  return <RackDetail seq={8} label="CCTV 상세" summary={<HostSummary seq={8} label="CCTV 요약" title="8. (연계) CCTV" />} spec={CCTV} />
})
