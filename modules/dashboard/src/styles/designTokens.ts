// ⚠️ 옛 코드용 — 새 코드는 src/shared/styles/tokens.css 의 Tailwind 클래스(bg-primary, text-h3, shadow-card, glass-card 등)를 쓴다.
//    메뉴를 새로 만들면서 이 파일을 쓰는 곳이 없어지면 지운다.
// 디자인 토큰 — `index.css` 의 @theme CSS 변수를 TS 상수로 노출.
//
// 사용 예 (인라인 style):
//   <div style={{ color: COLORS.primary }}>버튼</div>
//   <span style={TEXT_STYLES.h3}>섹션 타이틀</span>
//
// 동작 원리:
//   - 각 값은 `var(--color-primary)` 같은 CSS 변수 참조 문자열.
//   - 브라우저가 런타임에 @theme 에서 값 해석.
//   - 디자인 시안 색상 변경 시 `index.css` 의 @theme 한 곳만 수정 → 전체 반영.
//
// 추가 토큰 종류:
//   - COLORS    — 색상 (primary / neutral / accent)
//   - TEXT_STYLES — 타이포그래피 (h1~h6, b1~b6)
//   - GRADIENTS — 그라데이션 (Panel.Header 등 composite)
//   - BORDERS   — 보더 스타일
//   - SHADOWS   — 그림자 스타일

// ──────────────────────────────────────────────────────────────────────
// 색상 — `--color-*` CSS 변수와 동기.
//   primary  — 주 강조 (체크 표시 / 활성 버튼)
//   neutral  — 배경 / 텍스트 / 보더 톤
//   accent   — 상태 색 (green/yellow/orange/red) + 강조 색
// ──────────────────────────────────────────────────────────────────────
export const COLORS = {
  // Primary
  primary: 'var(--color-primary)',
  primaryLight: 'var(--color-primary-light)',
  primaryDark: 'var(--color-primary-dark)',

  // Neutral (50 = 가장 밝음, 1000 = 가장 어두움)
  neutral50: 'var(--color-neutral-50)',
  neutral100: 'var(--color-neutral-100)',
  neutral200: 'var(--color-neutral-200)',
  neutral300: 'var(--color-neutral-300)',
  neutral400: 'var(--color-neutral-400)',
  neutral450: 'var(--color-neutral-450)', // 패널/리스트 그리드 border + 어두운 bg 공통 톤

  neutral500: 'var(--color-neutral-500)',
  neutral600: 'var(--color-neutral-600)',
  neutral700: 'var(--color-neutral-700)',
  neutral800: 'var(--color-neutral-800)',
  neutral900: 'var(--color-neutral-900)',
  neutral1000: 'var(--color-neutral-1000)',

  // Accent (상태 색)
  accentGreen: 'var(--color-accent-green)', // 정상
  accentYellow: 'var(--color-accent-yellow)', // 주의
  accentOrange: 'var(--color-accent-orange)', // 경계
  accentRed: 'var(--color-accent-red)', // 심각

  // Accent (기타)
  accentBlue: 'var(--color-accent-blue)',
  accentBrown: 'var(--color-accent-brown)',
  accentIndigo: 'var(--color-accent-indigo)',
  accentMint: 'var(--color-accent-mint)',
  accentPink: 'var(--color-accent-pink)',
  accentPurple: 'var(--color-accent-purple)',
  accentTeal: 'var(--color-accent-teal)',

  // 순백색 — 인라인 텍스트/아이콘 색 alias.
  white: '#FFF',
} as const

// ──────────────────────────────────────────────────────────────────────
// 폰트 패밀리
// ──────────────────────────────────────────────────────────────────────
export const FONTS = {
  sans: 'var(--font-sans)', // Roboto, system-ui, ...
  display: 'var(--font-display)', // Gmarket Sans, var(--font-sans)
} as const

// ──────────────────────────────────────────────────────────────────────
// 타이포그래피 — 인라인 style 로 그대로 spread 가능.
//   사용 예: <span style={TEXT_STYLES.b3}>...</span>
//   font-family 도 같이 포함 (display 류 vs sans 자동 분기).
// ──────────────────────────────────────────────────────────────────────
export const TEXT_STYLES = {
  h1: {
    fontFamily: FONTS.display,
    fontSize: 'var(--text-h1)',
    fontWeight: 'var(--text-h1--font-weight)' as unknown as number,
    lineHeight: 'var(--text-h1--line-height)',
    letterSpacing: 'var(--text-h1--letter-spacing)',
  },
  h2: {
    fontFamily: FONTS.display,
    fontSize: 'var(--text-h2)',
    fontWeight: 'var(--text-h2--font-weight)' as unknown as number,
    lineHeight: 'var(--text-h2--line-height)',
  },
  h3: {
    fontFamily: FONTS.display,
    fontSize: 'var(--text-h3)',
    fontWeight: 'var(--text-h3--font-weight)' as unknown as number,
  },
  h4: {
    fontFamily: FONTS.display,
    fontSize: 'var(--text-h4)',
    fontWeight: 'var(--text-h4--font-weight)' as unknown as number,
  },
  h5: {
    fontFamily: FONTS.display,
    fontSize: 'var(--text-h5)',
    fontWeight: 'var(--text-h5--font-weight)' as unknown as number,
  },
  h6: {
    fontFamily: FONTS.display,
    fontSize: 'var(--text-h6)',
    fontWeight: 'var(--text-h6--font-weight)' as unknown as number,
  },
  b1: {
    fontFamily: FONTS.sans,
    fontSize: 'var(--text-b1)',
    fontWeight: 'var(--text-b1--font-weight)' as unknown as number,
    lineHeight: 'var(--text-b1--line-height)',
  },
  b2: {
    fontFamily: FONTS.sans,
    fontSize: 'var(--text-b2)',
    fontWeight: 'var(--text-b2--font-weight)' as unknown as number,
    lineHeight: 'var(--text-b2--line-height)',
  },
  b3: {
    fontFamily: FONTS.sans,
    fontSize: 'var(--text-b3)',
    fontWeight: 'var(--text-b3--font-weight)' as unknown as number,
    lineHeight: 'var(--text-b3--line-height)',
  },
  b4: {
    fontFamily: FONTS.sans,
    fontSize: 'var(--text-b4)',
    fontWeight: 'var(--text-b4--font-weight)' as unknown as number,
  },
  b5: {
    fontFamily: FONTS.sans,
    fontSize: 'var(--text-b5)',
    fontWeight: 'var(--text-b5--font-weight)' as unknown as number,
    lineHeight: 'var(--text-b5--line-height)',
  },
  b6: {
    fontFamily: FONTS.sans,
    fontSize: 'var(--text-b6)',
    fontWeight: 'var(--text-b6--font-weight)' as unknown as number,
  },
} as const

// ──────────────────────────────────────────────────────────────────────
// 그라데이션 (composite token) — @theme 에 단일 변수 X, 여기서 정의.
// ──────────────────────────────────────────────────────────────────────
export const GRADIENTS = {
  // Panel.Header 등 패널 헤더 띠 (메인 헤더 / 섹션 카드 헤더 공통).
  //   180deg 위에서 아래로, 진한 navy → 더 진한 navy.
  panelHeader: 'linear-gradient(180deg, #0E3E6E 0%, #002245 100%)',
} as const

// ──────────────────────────────────────────────────────────────────────
// 보더
// ──────────────────────────────────────────────────────────────────────
export const BORDERS = {
  // Panel.Header 의 옅은 highlight 보더.
  panelHeader: '2px solid rgba(175, 205, 238, 0.15)',
  // 글라스 카드 (좌측 패널 weather metric, warning banner 등) 의 1px 흰 알파 보더.
  glassCard: '1px solid rgba(255, 255, 255, 0.15)',
  // 우측 패널 어두운 패널 body 의 3-side 알파 보더 (right/bottom/left).
  panelDark: '1px solid rgba(0, 0, 0, 0.25)',
  // 우측 패널 상태 pill (W50×H32) 의 1px 흰 알파 보더.
  pillWhite: '1px solid rgba(255, 255, 255, 0.25)',
} as const

// ──────────────────────────────────────────────────────────────────────
// 텍스트 스트로크 — 글라스 카드 안 텍스트 가독성 향상용.
//   (-webkit-text-stroke: <width> <color>)
//   Neutral-500 (#003060) 알파 25% — 흰/연한 텍스트 윤곽선
// ──────────────────────────────────────────────────────────────────────
export const STROKES = {
  // 1px 스트로크 — 큰 텍스트용 (B2 18px / 큰 H 등)
  textStandard: '1px rgba(0, 42, 84, 0.25)',
  // 0.84px 스트로크 — 작은 텍스트용 (B3 16px 등)
  textThin: '0.84px rgba(0, 42, 84, 0.25)',
} as const

// ──────────────────────────────────────────────────────────────────────
// 글라스 카드 — 좌측 패널 안 작은 카드들 (WeatherMetricCard, WarningBanner) 공통.
//   반투명 흰 배경 + 1px 흰 알파 보더.
// ──────────────────────────────────────────────────────────────────────
export const GLASS_CARD = {
  background: 'rgba(255, 255, 255, 0.1)',
  border: BORDERS.glassCard,
} as const

// ──────────────────────────────────────────────────────────────────────
// 그림자
// ──────────────────────────────────────────────────────────────────────
export const SHADOWS = {
  // Panel.Header 하단 부드러운 drop shadow.
  panelHeader: '0 3px 5px 0 rgba(0, 0, 0, 0.15)',
  // 좌측 패널 날씨 카드 등 글라스 효과 (inset highlight + inset glow + 외부 shadow).
  glassCard:
    '0 4px 12px 0 rgba(255, 255, 255, 0.24) inset, 0 -8px 26px 0 rgba(255, 255, 255, 0.30) inset, 0 8px 24px 0 rgba(0, 0, 0, 0.20)',
  // 우측 패널 카드 (PumpStationSection, MiniColumn) 외곽의 부드러운 drop shadow.
  card: '0 3.375px 5.063px 0 rgba(0, 0, 0, 0.06), 0 0 11.25px 0 rgba(0, 0, 0, 0.04)',
} as const

// ──────────────────────────────────────────────────────────────────────
// 어두운 패널 배경 — 우측 패널 (배수펌프장 / MiniColumn) 의 plus-darker bg 톤.
//   PANEL_BG.body  — 큰 박스 body (rgba navy 50%)
//   PANEL_BG.inner — 안쪽 작은 카드 (rgba neutral 15%)
// 모두 backgroundBlendMode 'plus-darker' 와 함께 사용.
// ──────────────────────────────────────────────────────────────────────
export const PANEL_BG = {
  body: 'rgba(64, 96, 128, 0.50)',
  inner: 'rgba(28, 28, 28, 0.15)',
} as const
