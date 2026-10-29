// 좌측 패널 (480×1080) — 로고 띠 + 날씨 카드 + 위성 지도 + 재난 방송.
//   시계·레이더 재생처럼 자주 바뀌는 건 각자 칸 안에서만 다시 그린다.
import { memo, useCallback, useState } from 'react'
import { UlsanLogo } from '@/icons/decorative/UlsanLogo'
import { ExpandModal, SectionCard, useKept, ZOOM_MS } from '@/shared/ui'
import { useWeather } from '../weatherContext'
import { Broadcast } from './Broadcast'
import { RadarProvider, RadarView } from './Radar'
import { WeatherCard } from './WeatherCard'

type Kind = 'radar' | 'broadcast'

function Weather() {
  return <WeatherCard weather={useWeather()} />
}

const Cards = memo(function Cards({ onExpand }: { onExpand: (k: Kind) => void }) {
  return (
    <>
      <SectionCard title="위성 지도" bodyHeight={219} onExpand={() => onExpand('radar')}>
        <RadarView />
      </SectionCard>
      <SectionCard title="재난 방송" bodyHeight={261} onExpand={() => onExpand('broadcast')}>
        <Broadcast />
      </SectionCard>
    </>
  )
})

export function LeftPanel() {
  const [open, setOpen] = useState<Kind | null>(null)
  const close = useCallback(() => setOpen(null), [])
  // 닫히며 작아지는 동안에도 제목·내용을 남긴다
  const shown = useKept(open, ZOOM_MS)
  return (
    <RadarProvider>
      <div className="relative h-[1080px] w-[480px] bg-neutral-900">
        {/* 로고 띠 — 메인 헤더(-40px 로 넘침) 위에 오도록 z-1. 메인 헤더와 이어지므로 테두리 없음 */}
        <div className="relative z-[1] flex h-[120px] w-[480px] items-center py-2 pl-4">
          <div className="absolute top-2 left-4 h-[104px] w-[504px] rounded-l-2xl bg-panel-header shadow-panel-header" />
          <div className="absolute top-[39px] left-[46px] h-[42px] w-[180px]">
            <UlsanLogo />
          </div>
        </div>
        <div className="pl-4">
          <div className="flex h-[952px] w-[464px] flex-col items-start gap-3">
            <Weather />
            <Cards onExpand={setOpen} />
          </div>
        </div>
        <ExpandModal open={open !== null} onClose={close} title={shown === 'radar' ? '위성 지도' : '재난 방송'} width={1600} height={shown === 'broadcast' ? 964 : 900}>
          {shown === 'radar' && <RadarView updateToast />}
          {shown === 'broadcast' && <Broadcast />}
        </ExpandModal>
      </div>
    </RadarProvider>
  )
}
