// 관리자 서브탭 — 메뉴 버튼 아래 공통 영역 (서버 운영 / 네트워크 / 기타).
//   급경사지 서브탭(SlopeSubTabs)과 같은 규격 — pill 960×62 안에 버튼 3개.

export type AdminTabId = 'server' | 'network' | 'etc'

const TABS: { id: AdminTabId; label: string }[] = [
  { id: 'server', label: '서버 운영' },
  { id: 'network', label: '네트워크' },
  { id: 'etc', label: '기타' },
]

interface Props {
  active: AdminTabId
  onChange: (id: AdminTabId) => void
}

export function AdminSubTabs({ active, onChange }: Props) {
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
