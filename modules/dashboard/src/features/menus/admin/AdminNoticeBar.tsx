// 관리자 공지 바 — 서브탭 아래 공통 영역 (3탭 공유).
//   1888×72, 내용은 왼쪽부터 gap 40 으로 붙는다.
//   수치는 GET /server/api/devices 의 status 집계. 순번은 장비 목록과 같은 순서.
//   UNKNOWN은 미확인으로 집계한다 (수집 미연동 또는 API 조회 실패).

import { useDevices } from './useDevices'

const BADGES = [
  { key: 'normal', label: '정상', status: 'NORMAL', cls: 'is-normal' },
  { key: 'warn', label: '주의', status: 'WARN', cls: 'is-warn' },
  { key: 'error', label: '장애', status: 'DOWN', cls: 'is-error' },
  { key: 'unknown', label: '미확인', status: 'UNKNOWN', cls: 'is-unknown' },
] as const

export function AdminNoticeBar() {
  const devices = useDevices()
  const loaded = devices.length > 0
  /** 이상 장비 — 주의·장애인 장비를 목록 순번과 함께. */
  const faults = devices
    .map((d, i) => ({ no: i + 1, name: d.name, status: d.status }))
    .filter((d) => d.status === 'WARN' || d.status === 'DOWN')
  return (
    <div className="admin-notice-bar">
      {/* 서버실 랙 — 제목 + 상태 배지 */}
      <div className="admin-rack">
        <span className="admin-rack-title">
          서버실 랙
          <strong>총 {loaded ? devices.length : '-'} 대</strong>
        </span>
        <div className="admin-rack-badges">
          {BADGES.map((b) => (
            <span key={b.key} className={`admin-rack-badge ${b.cls}`}>
              <span>
                {b.label} {loaded ? devices.filter((d) => d.status === b.status).length : '-'}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* 이상 장비 — 라벨 + 장비 목록 */}
      <div className="admin-fault">
        <span className="admin-fault-label">• 이상 장비</span>
        {/* 이상 장비가 없으면 순번 배지 없이 '없음' 만. */}
        {faults.length === 0 ? (
          <span className="admin-fault-name">{loaded ? devices.some((d) => d.status === 'UNKNOWN') ? '미확인 장비 있음' : '없음' : '-'}</span>
        ) : (
          faults.map((d) => (
            <span key={d.no} className="admin-fault-item">
              <span className="admin-fault-index">
                <span>{d.no}</span>
              </span>
              <span className="admin-fault-name">{d.name}</span>
            </span>
          ))
        )}
      </div>
    </div>
  )
}
