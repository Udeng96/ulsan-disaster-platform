import type { WeatherWarning } from '@/api/weather'

/** summary.warnings는 서버에서 활성 특보만 반환. 발표 제목에서 종류만 추출한다. */
export function activeWarningText(warnings: WeatherWarning[]): string {
  const names = warnings.flatMap((warning) => {
    // 서버 WeatherService의 제목 규칙과 동일. 해제·기타 안내문은 표시하지 않는다.
    const match = warning.title.match(/\/\s+(\S+)\s+(발표|해제)/)
    return match?.[2] === '발표' ? [match[1]] : []
  })
  return [...new Set(names)].join(', ')
}
