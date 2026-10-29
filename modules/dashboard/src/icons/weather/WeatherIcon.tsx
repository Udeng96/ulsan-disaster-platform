// 날씨 아이콘 — /public/ic/weather/ic_weather-{01..06}_fill_normal_color_64.svg 를
// skyCode / ptyCode 조합으로 선택해서 표출.
//
// 매핑 규칙 (ptyCode 우선):
//   ptyCode 1 (비)        → 04 비
//   ptyCode 5 (빗방울)    → 04 비
//   ptyCode 2 (비/눈)     → 06 비또는눈
//   ptyCode 6 (빗방울/눈) → 06 비또는눈
//   ptyCode 3 (눈)        → 05 눈
//   ptyCode 7 (눈날림)    → 05 눈
//   ptyCode 0/없음 + skyCode 1 → 01 맑음
//   ptyCode 0/없음 + skyCode 3 → 02 구름많음
//   ptyCode 0/없음 + skyCode 4 → 03 흐림
//   그 외 (코드 없음) → 02 구름많음 (default)

type IconCode = '01' | '02' | '03' | '04' | '05' | '06'

export function pickWeatherIconCode(
  skyCode: number | null,
  ptyCode: number | null,
): IconCode {
  if (ptyCode != null && ptyCode > 0) {
    switch (ptyCode) {
      case 1:
      case 5:
        return '04'
      case 2:
      case 6:
        return '06'
      case 3:
      case 7:
        return '05'
      default:
        return '02'
    }
  }
  switch (skyCode) {
    case 1:
      return '01'
    case 3:
      return '02'
    case 4:
      return '03'
    default:
      return '02'
  }
}

const LABEL: Record<IconCode, string> = {
  '01': '맑음',
  '02': '구름많음',
  '03': '흐림',
  '04': '비',
  '05': '눈',
  '06': '비또는눈',
}

interface Props {
  skyCode: number | null
  ptyCode: number | null
  /** px 크기 (정사각형). default 64. */
  size?: number
}

export function WeatherIcon({ skyCode, ptyCode, size = 64 }: Props) {
  const code = pickWeatherIconCode(skyCode, ptyCode)
  return (
    <img
      src={`/ic/weather/ic_weather-${code}_fill_normal_color_64.svg`}
      alt={LABEL[code]}
      width={size}
      height={size}
      style={{ display: 'block' }}
    />
  )
}
