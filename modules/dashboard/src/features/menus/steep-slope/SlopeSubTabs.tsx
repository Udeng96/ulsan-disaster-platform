// 급경사지 서브탭 — 메뉴 버튼 아래 공통 영역 (총괄·관제 / 계측 상세 / 조기경보·통계).
//   pill 형태 960×62 안에 306 버튼 3개.

export type SlopeTabId = 'overview' | 'measure' | 'alert'

const TABS: { id: SlopeTabId; label: string }[] = [
  { id: 'overview', label: '총괄·관제' },
  { id: 'measure', label: '계측 상세' },
  { id: 'alert', label: '조기경보·통계' },
]

interface Props {
  active: SlopeTabId
  onChange: (id: SlopeTabId) => void
}

export function SlopeSubTabs({ active, onChange }: Props) {
  return (
    <div className="slope-subtabs">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`slope-subtab ${active === t.id ? 'is-active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
