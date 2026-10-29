import { COLORS } from '@/styles/designTokens'
import { useEffect, useState } from 'react'
import { useWeatherSummary } from '@/hooks/useWeatherSummary'
import { UlsanLogo } from '@/icons/decorative/UlsanLogo'
import { DisasterBroadcast } from './DisasterBroadcast'
import { Panel } from '@/components/layout/Panel'
import { SectionCard } from './SectionCard'
import { RadarLatest, useRadarPlayer } from './RadarLatest'
import { WeatherCard } from './WeatherCard'
import { ExpandModal } from '@/components/layout/ExpandModal'

// 좌측 IP wall 패널 — W 480 × H 1080, 우측 패널 mirror.
// (텍스트 스타일 / 포맷터 / 카드 컴포넌트는 각 sub-component 안에서 자체 처리.)


export function LeftPanel() {
  const weather = useWeatherSummary()

  // 확장 모달 — 위성지도 / 재난방송 카드를 전체화면으로 (null = 닫힘).
  const [expanded, setExpanded] = useState<'radar' | 'broadcast' | null>(null)

  // 레이더 재생 허브 — 작은 카드 ↔ 확장 모달이 같은 프레임/재생 상태 공유
  // (전환 시 애니메이션 위치 어긋남 방지).
  const radarPlayer = useRadarPlayer()

  // 닫힘 애니메이션(scale down) 중에도 직전 콘텐츠 크기/제목 유지 — 크기 점프 방지.
  const [lastKind, setLastKind] = useState<'radar' | 'broadcast'>('broadcast')
  useEffect(() => {
    if (expanded) setLastKind(expanded)
  }, [expanded])

  // 현재 시계 — 1초마다 갱신 (시간 표시용, weather 와 무관)
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // 위성 polling / 애니메이션 제거 — RadarLatest 컴포넌트가 자체 fetch + 1 분 주기로 실시간 이미지 표출.

  return (
    <div
      className="relative"
      style={{
        width: '480px',
        height: '1080px',
        // 가운데 대시보드와 같은 단색 배경 (Neutral-900).
        background: COLORS.neutral900,
      }}
    >
      {/* 헤더 영역 — W 480 H 120, padding 8/0/8/16 (우측의 mirror), items-center, relative
          ※ zIndex 1 — 메인 헤더가 -ml-10 으로 좌측으로 빠져 좌측 헤더 우측 영역과 겹침.
            헤더 영역만 main 위로 올려서 body 영역 stacking 은 영향 X. */}
      <div
        className="relative flex items-center"
        style={{
          width: '480px',
          height: '120px',
          padding: '8px 0 8px 16px',
          zIndex: 1,
        }}
      >
        {/* 안 헤더 — W 504 H 104, absolute top 8 left 16, radius 16 0 0 16 (우측 mirror).
            메인 헤더와 같은 gradient 로 이어붙는 구간이라 border 는 제거 —
            테두리가 있으면 메인 헤더와 만나는 지점에 세로 이음선이 보인다. */}
        <Panel.Header
          width="504px"
          height="104px"
          borderRadius="16px 0 0 16px"
          style={{
            position: 'absolute',
            top: '8px',
            left: '16px',
            border: 'none',
          }}
        />

        {/* 로고 — W 180 H 42, 안 헤더 (gradient box) 기준 left 30 / top 31
            안 헤더가 wrapper 의 (left 16, top 8) 에 위치하므로,
            wrapper 기준 left = 16 + 30 = 46, top = 8 + 31 = 39 (= 헤더 세로 중앙) */}
        <div
          style={{
            position: 'absolute',
            left: '46px',
            top: '39px',
            width: '180px',
            height: '42px',
          }}
        >
          <UlsanLogo />
        </div>
      </div>

      {/* body wrapper — paddingLeft 16 (좌측 패널 mirror, body 자체는 W 464 유지) */}
      <div style={{ paddingLeft: '16px' }}>
        {/* body 영역 — W 464 H 952, col, items-start, gap 12 */}
        <div
          className="flex flex-col items-start"
          style={{
            width: '464px',
            height: '952px',
            gap: '12px',
          }}
        >
        <WeatherCard weather={weather} now={now} />

        {/* 위성 지도 — KMA radar/latest 호출, 1분마다 재호출 (애니메이션 X, 실시간 single image).
            폴백 없음 — API 응답 전엔 다크 bg + 로딩 메시지 (이전 cloud 이미지 제거). */}
        <SectionCard
          title="위성 지도"
          bodyHeight={219}
          onExpand={() => setExpanded('radar')}
        >
          <RadarLatest player={radarPlayer} />
        </SectionCard>

        {/* 재난 방송 — 로컬 클립 영상 (항상 음소거). bg image 대신 DisasterBroadcast 가 video 표출. */}
        <SectionCard
          title="재난 방송"
          bodyHeight={261}
          onExpand={() => setExpanded('broadcast')}
        >
          <DisasterBroadcast />
        </SectionCard>
        </div>
      </div>

      {/* 확장 모달 — 위성지도 / 재난방송 전체화면. 닫을 때까지 isOpen 유지 (scale 애니메이션).
          크기/제목은 lastKind 기준 (닫힘 중 유지), 콘텐츠는 expanded 기준 (닫힘 시 즉시 unmount).
          재난방송은 16:9 영상영역(1600×900) + header 64 = 964, 위성지도는 1600×900. */}
      <ExpandModal
        isOpen={expanded !== null}
        onClose={() => setExpanded(null)}
        title={lastKind === 'radar' ? '위성 지도' : '재난 방송'}
        width={1600}
        height={lastKind === 'broadcast' ? 964 : 900}
      >
        {expanded === 'radar' && (
          <RadarLatest player={radarPlayer} showUpdateToast />
        )}
        {expanded === 'broadcast' && (
          <DisasterBroadcast />
        )}
      </ExpandModal>
    </div>
  )
}
