// 지진가속도 메뉴 우측 패널 — 측정 지점 이미지 + 4 채널 row (차트 + 진도 인디케이터).

import { CHANNELS } from './channels'
import { ChannelRow } from './ChannelRow'
import { instrumentLabel } from '@/api/earthquake'
import { useEarthquakeInstruments } from './useEarthquakeInstruments'
import { useEarthquakeStream } from './useEarthquakeStream'

export function EarthquakePanel() {
  // 실시간 SSE — 연결 1개, 관측소 코드별 시계열.
  const { series, sourceConnected, now } = useEarthquakeStream()
  // 채널 목록 — API 가 주는 계측기 그대로. 조회 전/실패 시에만 기존 상수로 폴백.
  //   API 값을 쓰면 SSE stationCode 와 같은 소스라 코드가 어긋날 일이 없다.
  const instruments = useEarthquakeInstruments()
  const channels =
    instruments.length > 0
      ? instruments.map((i) => ({
          code: i.stationCode,
          location: instrumentLabel(i),
        }))
      : CHANNELS
  return (
    <div className="flex h-full w-full flex-col">
      {/* 수신 중단 배지 — SSE 는 살아 있어도 업체 연결이 끊길 수 있다.
          차트가 멈춘 것만으로는 '조용한 것' 과 '끊긴 것' 을 구분할 수 없어 명시한다. */}
      {!sourceConnected && (
        <div
          className="flex shrink-0 items-center self-stretch"
          style={{
            padding: '6px 12px',
            gap: '6px',
            background: 'rgba(255, 66, 69, 0.15)',
            color: '#FF4245',
            fontFamily: 'Roboto',
            fontSize: '12px',
            fontWeight: 500,
            lineHeight: '14px',
          }}
        >
          계측 데이터 수신 중단
        </div>
      )}
      <img
        src="/images/img_earthquake-data-ss_480x240.png"
        alt="지진가속도 측정 지점"
        width={480}
        height={240}
        className="shrink-0"
      />
      {/* 채널 목록 — 이미지/배지를 뺀 나머지 높이를 채널 수로 균등 분배. */}
      <div className="flex flex-1 flex-col" style={{ minHeight: 0 }}>
        {channels.map((c) => (
          <ChannelRow
            key={c.code}
            code={c.code}
            location={c.location}
            data={series[c.code]}
            now={now}
          />
        ))}
      </div>
    </div>
  )
}
