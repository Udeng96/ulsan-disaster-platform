// 메인 헤더 (2000×104, 좌우로 40씩 넘침) — 가운데 제목(누르면 처음으로), 왼쪽 특보, 오른쪽 주소 검색.
import { memo } from 'react'
import { Marquee } from '@/shared/ui'
import { warningKinds } from '../left/format'
import { AddressSearch } from '../menus/search/AddressSearch'
import { useWeather } from '../weatherContext'
import { dash, resetAll } from './state'

function Warning() {
  const weather = useWeather()
  // 배포 환경에서도 이 주소 옵션일 때만 예시 특보를 띄운다 (실제 데이터는 그대로)
  const preview = new URLSearchParams(window.location.search).get('previewWeatherWarning') === '1'
  const text = preview ? '호우주의보' : warningKinds(weather?.warnings ?? [])
  if (!text) return null
  return (
    // 네모칸 없이 글씨만 크게 (수정사항 2번, 10-16) — 로고 구분선과 제목 사이를 다 쓴다
    <div role="status" className="absolute left-[100px] flex w-[530px] items-center justify-center">
      <Marquee
        centered
        text={`${text} 발효중`}
        className="translate-y-px p-0.5 font-['Inter',sans-serif] text-[60px] leading-[72px] font-semibold text-header-warning [paint-order:stroke_fill] [-webkit-text-stroke:4px_var(--color-white)]"
      />
    </div>
  )
}

function Search() {
  const key = dash.use((s) => s.searchKey)
  return <AddressSearch key={key} />
}

export const Header = memo(function Header() {
  return (
    <header className="relative mt-2 -ml-10 flex h-[104px] w-[2000px] shrink-0 items-center justify-center bg-panel-header shadow-panel-header">
      <Warning />
      <h1
        role="button"
        tabIndex={0}
        onClick={resetAll}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            resetAll()
          }
        }}
        className="cursor-pointer font-headline text-[91px] leading-[94px] font-normal tracking-[3.6px] text-white transition-opacity hover:opacity-80"
      >
        재난관리 통합플랫폼
      </h1>
      <Search />
    </header>
  )
})
