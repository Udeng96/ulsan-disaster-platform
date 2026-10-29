// 장비 목록 — GET /server/api/devices (랙 순, 표출 Y 만). 번호는 목록 순서 (rackPos 는 N 장비 자리가 비어 있다).
//   LED 는 status 값 (NORMAL 정상 / WARN 주의 / DOWN 장애).
import type { DeviceStatus } from '@/api/adminServer'
import { useDevices } from './useDevices'

const STATUS = [
  { key: 'normal', label: '정상' },
  { key: 'warn', label: '주의' },
  { key: 'error', label: '장애' },
] as const

/** UNKNOWN(수집 연동 전)은 회색. */
const LED: Record<DeviceStatus, { key: string; label: string }> = {
  NORMAL: { key: 'normal', label: '정상' },
  WARN: { key: 'warn', label: '주의' },
  DOWN: { key: 'error', label: '장애' },
  UNKNOWN: { key: 'unknown', label: '확인 불가' },
}

interface Props {
  selectedIndex: number
  onSelect: (index: number) => void
}

export function AdminDeviceList({ selectedIndex, onSelect }: Props) {
  const devices = useDevices()
  return (
    <section className="admin-device-list" aria-labelledby="admin-device-title">
      <header className="admin-device-header">
        <h2 id="admin-device-title">장비 목록</h2>
        <div className="admin-device-legend">
          {STATUS.map(({ key, label }) => (
            <span className={`admin-device-legend-item is-${key}`} key={key}>
              <span className="admin-device-legend-dot" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </header>
      <ol className="admin-device-rows">
        {devices.map((device, index) => {
          const led = LED[device.status]
          return (
            <li style={{ width: '100%' }} key={device.id}>
              <button
                type="button"
                className={`admin-device-row${selectedIndex === index ? ' is-active' : ''}`}
                aria-pressed={selectedIndex === index}
                onClick={() => onSelect(index)}
              >
              <span className="admin-device-name">
                <span className="admin-device-index">{index + 1}</span>
                <span>{device.name}</span>
              </span>
              <span className={`admin-device-led is-${led.key}`} role="img" aria-label={led.label} />
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
