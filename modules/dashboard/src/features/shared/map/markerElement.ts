// 지도 마커 element 공통 빌더 (MapLibre) — 18×18 원 + 옵션 라벨.
//   라벨 디자인 2종 (진입 경로별로 다름):
//     plain : 배경 없이 글씨만, 마커 위 (전용 메뉴 — 지도 자체 라벨 톤)
//     boxed : 흰 박스 + 마커색 테두리, 마커 아래 (레이어 메뉴 — 카테고리 식별)
//   어느 쪽이든 원 중심이 좌표에 오도록 anchor/offset 계산.

export type MarkerLabelStyle = 'plain' | 'boxed'

const CIRCLE_HALF = 9 // 18px 원의 절반 (중심 → 위/아래 끝)

// 마커 안 글자 (등급 등) — 어두운 글자가 밝은 팔레트 위에서 가장 잘 읽힌다.
const MARKER_TEXT_COLOR = '#001229'

// 18×18 원 (흰 stroke) SVG. text 를 주면 원 안에 글자.
export function circleSvg(color: string, text?: string): string {
  const label = text
    ? `<text x="9" y="9" text-anchor="middle" dominant-baseline="central" fill="${MARKER_TEXT_COLOR}" font-family="Roboto, sans-serif" font-size="10" font-weight="700">${text}</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" fill="${color}" stroke="white" stroke-width="1.5"/>${label}</svg>`
}

// 라벨 div (element) — plain(is-plain) / boxed(흰 박스 + 마커색 테두리). textContent 라 XSS 안전.
export function createMarkerLabelEl(
  text: string,
  style: MarkerLabelStyle,
  color: string,
): HTMLDivElement {
  const d = document.createElement('div')
  d.className =
    style === 'boxed'
      ? 'marker-label-content'
      : 'marker-label-content is-plain'
  d.textContent = text
  if (style === 'boxed') {
    // 기본 .marker-label-content (흰 75% 배경) 위에 마커색 테두리로 카테고리 식별.
    d.style.border = `1.5px solid ${color}`
    d.style.whiteSpace = 'nowrap'
  }
  return d
}

export interface LabeledCircle {
  element: HTMLDivElement
  anchor: 'top' | 'bottom'
  offset: [number, number]
}

/**
 * 원 마커 element (+옵션 라벨) 생성 + anchor/offset 반환.
 *   label 없음     → 원만 (anchor bottom, 중심이 좌표에).
 *   plain (라벨 위) → column [라벨, 원], anchor bottom.
 *   boxed (라벨 아래) → column [원, 라벨], anchor top.
 */
export function createLabeledCircleEl(
  color: string,
  label: string | undefined,
  labelStyle: MarkerLabelStyle = 'plain',
  innerText?: string,
): LabeledCircle {
  const el = document.createElement('div')
  el.style.pointerEvents = 'none'
  el.style.display = 'flex'
  el.style.flexDirection = 'column'
  el.style.alignItems = 'center'
  el.style.gap = labelStyle === 'boxed' ? '6px' : '4px'

  const icon = document.createElement('div')
  icon.style.display = 'flex'
  icon.style.lineHeight = '0'
  icon.innerHTML = circleSvg(color, innerText)

  if (!label) {
    el.appendChild(icon)
    return { element: el, anchor: 'bottom', offset: [0, CIRCLE_HALF] }
  }

  const labelEl = createMarkerLabelEl(label, labelStyle, color)
  if (labelStyle === 'boxed') {
    el.appendChild(icon)
    el.appendChild(labelEl)
    return { element: el, anchor: 'top', offset: [0, -CIRCLE_HALF] }
  }
  el.appendChild(labelEl)
  el.appendChild(icon)
  return { element: el, anchor: 'bottom', offset: [0, CIRCLE_HALF] }
}

// ── 선택 마커 (물방울) ──
//   원 대신 뒤집힌 물방울. 뾰족한 끝(아래)이 좌표에 오고, 이름 라벨은 그 아래.
export const PIN_WIDTH = 24
export const PIN_HEIGHT = 30

export function pinSvg(color: string, text?: string): string {
  const label = text
    ? `<text x="12" y="11.25" text-anchor="middle" dominant-baseline="central" fill="${MARKER_TEXT_COLOR}" font-family="Roboto, sans-serif" font-size="12" font-weight="700">${text}</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 24 30" fill="none"><path d="M12 30C12 30 22.5 18.5 22.5 11.25C22.5 5.31 17.8 0.75 12 0.75C6.2 0.75 1.5 5.31 1.5 11.25C1.5 18.5 12 30 12 30Z" fill="${color}" stroke="white" stroke-width="2.25"/>${label}</svg>`
}

/** 물방울 마커 element (+아래 라벨). anchor 'top' + offset 으로 끝점이 좌표에 오게. */
export function createPinEl(
  color: string,
  label: string | undefined,
  innerText?: string,
): LabeledCircle {
  const el = document.createElement('div')
  el.style.pointerEvents = 'none'
  el.style.display = 'flex'
  el.style.flexDirection = 'column'
  el.style.alignItems = 'center'
  el.style.gap = '4px'

  const icon = document.createElement('div')
  icon.style.display = 'flex'
  icon.style.lineHeight = '0'
  icon.innerHTML = pinSvg(color, innerText)
  el.appendChild(icon)

  if (label) el.appendChild(createMarkerLabelEl(label, 'plain', color))
  return { element: el, anchor: 'top', offset: [0, -PIN_HEIGHT] }
}

// ── 급경사지(상시계측 위험지역) 마커 ──
//   관리지역 점(18) 과 구분되게 큰 원 + 원 안에 지역명.
export const AREA_CIRCLE_SIZE = 30

export function areaCircleSvg(color: string): string {
  const r = AREA_CIRCLE_SIZE / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${AREA_CIRCLE_SIZE}" height="${AREA_CIRCLE_SIZE}" viewBox="0 0 ${AREA_CIRCLE_SIZE} ${AREA_CIRCLE_SIZE}" fill="none"><circle cx="${r}" cy="${r}" r="${r - 2}" fill="${color}" fill-opacity="0.9" stroke="white" stroke-width="2"/></svg>`
}

/** 급경사지 지역 마커 — 30px 원 + 아래 지역명 라벨. 원 중심이 좌표에. */
export function createAreaCircleEl(color: string, name: string): LabeledCircle {
  const el = document.createElement('div')
  el.style.pointerEvents = 'none'
  el.style.display = 'flex'
  el.style.flexDirection = 'column'
  el.style.alignItems = 'center'
  el.style.gap = '4px'

  const icon = document.createElement('div')
  icon.style.display = 'flex'
  icon.style.lineHeight = '0'
  icon.innerHTML = areaCircleSvg(color)
  el.appendChild(icon)
  // 30px 원 안에는 지역명이 안 들어가서 라벨은 원 아래에.
  el.appendChild(createMarkerLabelEl(name, 'plain', color))
  return { element: el, anchor: 'top', offset: [0, -AREA_CIRCLE_SIZE / 2] }
}
