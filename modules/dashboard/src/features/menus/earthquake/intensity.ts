// 지진 진도 (intensity) 등급 — 9 단계 (IX → I), EarthquakePanel 우측 색 막대와 동기.
// color: 진도 막대 배경 (= 라벨 배경으로도 사용).
// text:  라벨 본문 텍스트 색. 어두운 배경 (IX~VI) 은 흰색, 밝은 배경 (V~I) 은 본문 다크색.

export interface IntensityLevel {
  label: string
  color: string
  text: string
}

export const INTENSITY_LEVELS: ReadonlyArray<IntensityLevel> = [
  { label: 'IX', color: '#502700', text: '#FFFFFF' },
  { label: 'VIII', color: '#611F21', text: '#FFFFFF' },
  { label: 'VII', color: '#A52476', text: '#FFFFFF' },
  { label: 'VI', color: '#FE0200', text: '#FFFFFF' },
  { label: 'V', color: '#FFBA00', text: '#001229' },
  { label: 'IV', color: '#FFFD00', text: '#001229' },
  { label: 'III', color: '#92D14E', text: '#001229' },
  { label: 'II', color: '#A5E2FF', text: '#001229' },
  { label: 'I', color: '#FFFFFF', text: '#001229' },
]
