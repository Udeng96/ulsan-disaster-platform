// 메인 대시보드 상단 헤더 — W 2000 × H 104 (메인 패널 1920 의 좌우 40 씩 바깥으로 빠져나감).
//   gradient navy bg + 가운데 큰 타이틀 (DoHyeon 91px) + 우측 주소 검색 dropdown.
// 타이틀 클릭 → onTitleClick (DashboardPage 의 handleReset).
// 검색 결과 클릭 → onSelectAddress (DashboardPage 의 handleSelectAddressResult — 투망 트리거).
// 외부 reset 시 부모가 searchKey 를 증가 → AddressSearch 가 강제 remount → state 초기화.

import type { AddressSearchItem } from '@/api/vworld'
import { AddressSearch } from './AddressSearch'
import { SHOW_ADDRESS_SEARCH } from './data'
import { useWeatherSummary } from '@/hooks/useWeatherSummary'
import { WarningMarquee } from '../left-panel/WarningMarquee'
import { activeWarningText } from './activeWarningText'

interface Props {
  /** 타이틀 클릭 / Enter / Space 시 호출 — 전체 reset. */
  onTitleClick: () => void
  /** 주소 검색 결과 클릭 시 호출 — 투망 트리거 + 메뉴 reset.
   *  미지정 시 (지도 미연동) 결과 클릭은 dropdown 닫기만. */
  onSelectAddress?: (result: AddressSearchItem) => void
  /** 외부 reset 신호 — 값이 바뀌면 AddressSearch 가 강제 remount → 검색 상태 초기화. */
  searchKey: number
}

export function Header({ onTitleClick, onSelectAddress, searchKey }: Props) {
  const weather = useWeatherSummary()
  // 배포 환경에서도 명시적인 예제 URL에서만 표시. 실제 특보 데이터는 변경하지 않는다.
  const previewWarning = new URLSearchParams(window.location.search).get('previewWeatherWarning') === '1'
  const warnings = previewWarning ? '호우주의보' : activeWarningText(weather?.warnings ?? [])
  return (
    <header
      className="relative mt-2 -ml-10 flex h-[104px] w-[2000px] shrink-0 items-center justify-center"
      style={{
        // 테두리 없음 — 배경 그라데이션만으로 한 덩어리처럼 보이게 (외곽선이 화면을 가르지 않도록).
        background: 'linear-gradient(180deg, #0E3E6E 0%, #002245 100%)',
        boxShadow: '0 3px 5px 0 rgba(0, 0, 0, 0.15)',
      }}
    >
      {warnings && (
        <div
          role="status"
          className="header-active-weather-warning"
          style={{
            position: 'absolute',
            left: '136px',
            display: 'flex',
            width: '319px',
            padding: '8px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.20)',
            borderRadius: '8px',
            border: '1px solid #FFF',
          }}
        >
          <WarningMarquee
            centered
            text={`${warnings} 발효중`}
            textStyle={{
              color: '#F00000',
              fontFamily: 'Inter, sans-serif',
              fontSize: '38px',
              fontStyle: 'normal',
              fontWeight: 600,
              lineHeight: '46px',
              padding: '2px',
              transform: 'translateY(1px)',
              WebkitTextStroke: '3px #FFF',
              paintOrder: 'stroke fill',
            }}
          />
        </div>
      )}
      {/* 타이틀 클릭 → onTitleClick (페이지 리로드 X, React state 만 리셋 → 트랜지션 부드러움).
          메뉴 슬라이드아웃 + 지도 flyTo 등 기존 transition 그대로 발동. */}
      <h1
        className="text-h1 text-white transition-opacity hover:opacity-80"
        style={{
          cursor: 'pointer',
          // 헤더 전용 글씨체 (DoHyeon). Gmarket Sans (font-display) 대체.
          fontFamily: "'Do Hyeon', var(--font-sans)",
          // DoHyeon 은 Regular (400) 한 weight 만 있음 — text-h1 의 700 을 browser 가
          // synthetic bold 처리해 과하게 두꺼워지므로 400 으로 override.
          fontWeight: 400,
          // 헤더 글씨 크기 — 디자인 시안 91 px (text-h1 기본 72 px override).
          // lineHeight 도 비례해 키워 baseline 깨짐 방지.
          fontSize: '91px',
          lineHeight: '94px',
        }}
        onClick={onTitleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onTitleClick()
          }
        }}
      >
        재난관리 통합플랫폼
      </h1>

      {/* 주소 검색 — 헤더 우측 (right 56, top 20). flag 로 통째로 숨김 가능. */}
      {SHOW_ADDRESS_SEARCH && (
        <AddressSearch key={searchKey} onSelect={onSelectAddress} />
      )}
    </header>
  )
}
