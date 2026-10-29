import { useId } from 'react'
import './AdminAssetPopup.css'

export interface AssetLedgerField {
  id: string
  label: string
  value: string | null
}

interface Props {
  fields?: readonly AssetLedgerField[]
  loading?: boolean
  error?: string | null
  onClose: () => void
}

// API 응답은 호출부에서 항목 배열로 변환해 전달한다. 임의의 자산 정보는 표시하지 않는다.
export function AdminAssetPopup({ fields = [], loading = false, error, onClose }: Props) {
  const titleId = useId()
  return (
    <section className="admin-asset-popup" role="dialog" aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.stopPropagation(); onClose() }
      }}>
      <header className="admin-asset-popup-header">
        <h3 id={titleId}>장비정보 · 자산대장</h3>
        <button autoFocus type="button" aria-label="자산대장 닫기" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>
      <div className="admin-asset-popup-content scrollbar-custom" aria-busy={loading} tabIndex={0}>
        {loading ? <p role="status">자산 정보를 불러오는 중입니다.</p>
          : error ? <p role="alert">{error}</p>
          : fields.length === 0 ? <p role="status">자산대장 정보를 준비 중입니다.</p>
          : <dl className="admin-asset-popup-fields">
            {fields.map(({ id, label, value }) => (
              <div className="admin-asset-popup-row" key={id}>
                <dt>{label}</dt><dd>{value?.trim() || '—'}</dd>
              </div>
            ))}
          </dl>}
      </div>
    </section>
  )
}
