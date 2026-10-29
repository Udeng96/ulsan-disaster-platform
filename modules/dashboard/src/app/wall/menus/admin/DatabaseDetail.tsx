// 3번 데이터베이스 상세 — 리스트에서 데이터베이스를 누르면 운영 현황 자리에 나온다.
//   모양은 방화벽·스위칭 허브 상세와 같고 값만 데이터베이스 디자인 캡처대로 (사용자 10-22). 전면·후면 그림·표 틀은 RackServer (4~8번과 같이 씀).
//   요약 값은 server /servers/dbsvr (HostSummary), 표는 디자인 줄에 /parts 값을 덮음 (사용자 10-23)
import { memo } from 'react'
import type { PortRow } from './FirewallFront'
import { HostSummary } from './HostSummary'
import { RackDetail, type RackSpec } from './RackServer'

/** 전면 표 3묶음 — 줄 내용은 디자인 캡처 (사용자 10-23). 사용/용량 '-' 도 캡처대로. API 붙일 때 실제 값으로 바꾼다.
 *  BAY5~8 의 상태·사용/용량(빈 슬롯 · 증설 자리)은 캡처에서 잘려 이전 디자인 캡처 글자로 넣음 */
const FRONT: PortRow[][] = [
  [
    { name: '전원 버튼', mount: '좌 이어', used: true, state: '켜짐', tone: 'ok', usage: '-' },
    { name: 'ID 버튼', mount: '장비 식별', state: '미사용', tone: 'idle', usage: '-' },
    { name: 'RST 핀홀', mount: '리셋', state: '미사용', tone: 'idle', usage: '-' },
    { name: 'LED1 전원', mount: '-', used: true, state: '점등', tone: 'ok', usage: '-' },
    { name: 'LED2 상태', mount: '-', used: true, state: '점등', tone: 'ok', usage: '-' },
    { name: 'LED3 LAN', mount: '-', used: true, state: '점등', tone: 'ok', usage: '-' },
  ],
  [
    { name: 'USB1 (좌 이어)', mount: '정비용', state: '빈 트레이', tone: 'idle', usage: '-' },
    { name: 'USB2 (우 이어)', mount: '정비용', state: '비어있음', tone: 'idle', usage: '-' },
    { name: 'BAY1', mount: 'SSD 480GB (OS·인덱스)', used: true, state: '정상', tone: 'ok', usage: '7.6G / 446G' },
    { name: 'BAY2', mount: 'SSD 480GB (RAID1 미러)', used: true, state: '정상', tone: 'ok', usage: '미러' },
    { name: 'BAY3', mount: 'HDD 8TB (데이터)', used: true, state: '정상', tone: 'ok', usage: '28K / 7.3T' },
    { name: 'BAY4', mount: 'HDD 8TB (RAID1 미러)', used: true, state: '정상', tone: 'ok', usage: '미러' },
  ],
  ['BAY5', 'BAY6', 'BAY7', 'BAY8'].map((name) => ({ name, mount: '—', state: '빈 슬롯', tone: 'idle', usage: '증설 자리' })),
]

/** 후면 표 3묶음 — 줄 내용은 디자인 캡처 (사용자 10-23). 캡처에서 '…' 로 잘린 칸은 보이는 글자 뒤를 어림해 채움 (화면에선 같은 자리에서 잘림):
 *  PSU 상태 '공급' · 트래픽 '— / 1200W', VGA·COM '미사용', USB '비어 있음', Mgmt 'BMC 192.168 (IP 확인 전)' (실제 IP 모름), LAN1 '→ 통플 SW · GbE', 트래픽 '▼30.2G' · '▼76.9G',
 *  이름 'Mgmt (BMC)' · 'LAN1 (GbE)' · 'LAN2 (GbE)', RB '후면 옵션 2.5"' · '실측 전'. API 붙일 때 실제 값으로 바꾼다 */
const REAR: PortRow[][] = [
  [
    { name: 'PSU1', mount: 'PDU 미확인', used: true, state: '공급', tone: 'ok', usage: '— / 1200W' },
    { name: 'PSU2', mount: 'PDU 미확인', used: true, state: '공급', tone: 'ok', usage: '— / 1200W' },
    { name: 'VGA', mount: '현장 콘솔', state: '미사용', tone: 'idle', usage: '—' },
    { name: 'COM', mount: '시리얼', state: '미사용', tone: 'idle', usage: '—' },
    { name: 'USB1', mount: '정비용', state: '비어 있음', tone: 'idle', usage: '—' },
    { name: 'USB2', mount: '정비용', state: '비어 있음', tone: 'idle', usage: '—' },
  ],
  [
    { name: 'Mgmt (BMC)', mount: 'BMC 192.168 (IP 확인 전)', used: true, state: '대기', tone: 'info', usage: '—' },
    { name: 'LAN1 (GbE)', mount: '→ 통플 SW · GbE', used: true, state: '결선', tone: 'ok', usage: '▼30.2G' },
    { name: 'LAN2 (GbE)', mount: 'bond0 페어', used: true, state: '결선', tone: 'ok', usage: '▼76.9G' },
    { name: 'PCIe1', mount: '빈 커버', state: '공란', tone: 'idle', usage: '—' },
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

const SPEC: RackSpec = {
  name: '데이터베이스',
  bays: [{ plate: '480G' }, { plate: '480G' }, { plate: '480G' }, { plate: '480G' }],
  psu: '1200W',
  gbe: 'GbE LAN1·2 → 통플 SW',
  usb: 2,
  usbLabel: 'USB3 ×2',
  slots: 6,
  front: FRONT,
  frontNote: '장착 내용은 규격서·사진 기준 · 사용/용량은 관리자 프로그램(SMART·df) 연동 후 실시간 · 노랑 = 실측 미확인',
  rear: REAR,
  rearNote: '트래픽은 /proc/net/dev 누적값 · 연결 상대는 ss 실측(2026-09-04)',
}

/** 데이터베이스 상세 — 왼쪽 요약 상자 + 오른쪽 전면·후면 (RackServer) */
export const DatabaseDetail = memo(function DatabaseDetail() {
  return <RackDetail seq={3} label="데이터베이스 상세" summary={<HostSummary seq={3} label="데이터베이스 요약" title="3. (저장) 데이터베이스" connLabel="연결 상태" />} spec={SPEC} />
})
