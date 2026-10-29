// 마커 이름표·원 안 글자를 그림으로 그린다 — 지도에 글꼴(glyphs)이 없어 엔진이 글자를 못 쓴다.
//   모양은 옛 .marker-label-content 와 같다.
//     boxed : 흰 75% 상자 + 마커색 테두리 1.5px, 글씨 13px 500, 안쪽 6·8, 모서리 6 (레이어 메뉴)
//     plain : 상자 없이 굵은 글씨 + 흰 테두리 (전용 메뉴), 240px 넘으면 줄바꿈
//   같은 그림은 한 번만 만든다 — 그림 이름에 모양·색·글자를 다 넣는다.
import type { Map as MlMap } from 'maplibre-gl'
import { MARKER } from '@/shared/styles/palette'

export type LabelStyle = 'plain' | 'boxed'

const RATIO = 2
const FONT_FAMILY = 'Roboto, sans-serif'
const LINE = 16
const MAX_W = 240
const OFF = 10000

interface Spec {
  kind: 'label' | 'inner'
  style: LabelStyle
  color: string
  text: string
}

// 그림 이름 → 그리는 값 (그림이 필요할 때 엔진이 이름만 알려 준다)
const specs = new Map<string, Spec>()
const names = new Map<string, string>()

/** 이름표 그림 이름 — 처음 보는 조합이면 새로 등록 */
export function labelImageName(style: LabelStyle, color: string, text: string, kind: Spec['kind'] = 'label'): string {
  const key = `${kind}|${style}|${color}|${text}`
  let name = names.get(key)
  if (!name) {
    name = `mk-${kind}-${names.size}`
    names.set(key, name)
    specs.set(name, { kind, style, color, text })
  }
  return name
}

export const isLabelImage = (name: string) => specs.has(name)

const fontOf = (spec: Spec) => (spec.kind === 'inner' ? `700 10px ${FONT_FAMILY}` : `${spec.style === 'boxed' ? 500 : 700} 13px ${FONT_FAMILY}`)

/** 글꼴이 아직 안 받아졌으면 받아지면 끝나는 약속 — 한글 Roboto 는 굵기마다 따로 받아져 늦게 올 수 있다.
 *  그 전에 그리면 다른 글꼴로 그려져 글자 폭이 달라진다 (같은 그림은 다시 안 그리므로 그대로 남음) */
export function labelFontPending(name: string): Promise<unknown> | null {
  const spec = specs.get(name)
  if (!spec) return null
  const font = fontOf(spec)
  return document.fonts.check(font, spec.text) ? null : document.fonts.load(font, spec.text)
}

/** 글자를 폭에 맞춰 줄로 자른다 (옛 word-break: break-all — 아무 글자에서나) */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    if (line && ctx.measureText(line + ch).width > max) {
      lines.push(line)
      line = ch
    } else line += ch
  }
  if (line) lines.push(line)
  return lines
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** 그림 만들기 — 엔진에 넣을 ImageData (2배 해상도) */
export function drawLabelImage(name: string): ImageData | null {
  const spec = specs.get(name)
  if (!spec) return null
  const probe = document.createElement('canvas').getContext('2d')!

  if (spec.kind === 'inner') {
    // 원(18) 안 글자 — 10px 굵게 (등급)
    const c = document.createElement('canvas')
    c.width = c.height = 18 * RATIO
    const ctx = c.getContext('2d')!
    ctx.scale(RATIO, RATIO)
    ctx.font = fontOf(spec)
    ctx.fillStyle = MARKER.text
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(spec.text, 9, 9.5)
    return ctx.getImageData(0, 0, c.width, c.height)
  }

  const boxed = spec.style === 'boxed'
  const font = fontOf(spec)
  probe.font = font
  // 상자는 줄바꿈 없음 (옛 nowrap), 글씨만은 240 에서 줄바꿈
  const lines = boxed ? [spec.text] : wrap(probe, spec.text, MAX_W)
  const textW = Math.ceil(Math.max(...lines.map((l) => probe.measureText(l).width)))
  const padX = boxed ? 8 + 1.5 : 2
  const padY = boxed ? 6 + 1.5 : 2
  const w = textW + padX * 2
  const h = lines.length * LINE + padY * 2
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * RATIO)
  c.height = Math.ceil(h * RATIO)
  const ctx = c.getContext('2d')!
  ctx.scale(RATIO, RATIO)
  ctx.font = font
  ctx.textBaseline = 'middle'
  if (boxed) {
    roundRect(ctx, 0.75, 0.75, w - 1.5, h - 1.5, 6)
    ctx.fillStyle = MARKER.boxBg
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = spec.color
    ctx.stroke()
    ctx.fillStyle = MARKER.text
    ctx.fillText(spec.text, padX, padY + LINE / 2)
  } else {
    ctx.textAlign = 'center'
    lines.forEach((l, i) => {
      const y = padY + LINE * i + LINE / 2
      // 옛 text-shadow 그대로: 흰 글씨를 대각선 네 쪽으로 1px 씩 + 3px 흐림 (흐림은 기기 픽셀 단위라 RATIO 를 곱함)
      //   흐림만 남기려고 글씨는 그림 밖에 쓰고 그림자만 제자리로 옮긴다
      ctx.save()
      ctx.shadowColor = MARKER.halo
      ctx.shadowBlur = 3 * RATIO
      ctx.shadowOffsetX = OFF * RATIO
      ctx.fillStyle = MARKER.stroke
      ctx.fillText(l, w / 2 - OFF, y)
      ctx.restore()
      ctx.fillStyle = MARKER.stroke
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.fillText(l, w / 2 + dx, y + dy)
      ctx.fillStyle = MARKER.text
      ctx.fillText(l, w / 2, y)
    })
  }
  return ctx.getImageData(0, 0, c.width, c.height)
}

/** 엔진이 이름표 그림을 찾을 때 그려 넣는다 — 이름표를 쓰는 레이어마다 붙인다 (이미 있으면 건너뜀). 떼는 함수를 돌려준다 */
export function attachLabelImages(map: MlMap): () => void {
  let alive = true
  const onMissing = (e: { id: string }) => {
    if (!isLabelImage(e.id) || map.hasImage(e.id)) return
    const img = drawLabelImage(e.id)
    if (img) map.addImage(e.id, img, { pixelRatio: RATIO })
    // 글꼴이 늦게 오면 받아진 뒤 다시 그린다 (크기가 달라질 수 있어 바꿔 끼운다)
    labelFontPending(e.id)?.then(() => {
      const again = alive && map.hasImage(e.id) ? drawLabelImage(e.id) : null
      if (!again) return
      map.removeImage(e.id)
      map.addImage(e.id, again, { pixelRatio: RATIO })
    })
  }
  map.on('styleimagemissing', onMissing)
  return () => {
    alive = false
    map.off('styleimagemissing', onMissing)
  }
}
