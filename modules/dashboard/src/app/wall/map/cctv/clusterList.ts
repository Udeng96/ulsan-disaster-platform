// CCTV 묶음 목록 창 — 몇 개 안 되는 묶음을 누르면 묶음 오른쪽에 뜬다. 옛 CctvMarkersML 목록과 같은 모양 (index.css cctv-cluster-*).
//   한 번에 하나만. 고르면 그 CCTV 영상 창을 띄운다 (팝업은 지도 새로 만들기 6단계에서 다시 만듦).
import maplibregl, { type Map as MlMap } from 'maplibre-gl'
import { CLOSE_ICON_SVG } from '@/features/shared/map/CctvMarkersML'

export interface ListLeaf {
  id: number
  name: string
  cctvId?: string
  lng: number
  lat: number
}

interface Options {
  at: [number, number]
  leaves: ListLeaf[]
  /** 영상이 이미 떠 있는 것 — 표시만 하고 다시 못 고른다 */
  playing: ReadonlySet<number>
  onPick: (leaf: ListLeaf) => void
  /** 닫기·지도 클릭으로 닫혔을 때 (고른 경우는 부르지 않음) */
  onClose: () => void
}

/** 묶음 물방울 높이(40) — 창 윗변을 물방울 윗변에 맞춘다 */
const PIN_H = 40
const BADGE = 32

/** 창을 띄우고, 닫는 함수를 돌려준다 */
export function openClusterList(map: MlMap, { at, leaves, playing, onPick, onClose }: Options): () => void {
  let tip: HTMLElement | null = null
  const hideTip = () => {
    tip?.remove()
    tip = null
  }
  const box = document.createElement('div')
  box.style.cssText = 'display:flex;width:280px;padding:12px;flex-direction:column;align-items:flex-start;gap:8px;'
  const header = document.createElement('div')
  header.style.cssText = 'display:flex;justify-content:flex-end;align-items:center;gap:8px;align-self:stretch;'
  const close = document.createElement('button')
  close.type = 'button'
  close.setAttribute('aria-label', '닫기')
  close.innerHTML = CLOSE_ICON_SVG
  close.style.cssText = 'display:flex;width:20px;height:20px;padding:0;border:none;background:none;cursor:pointer;'
  header.appendChild(close)
  box.appendChild(header)

  let picked = false
  const list = document.createElement('div')
  list.style.cssText = 'display:flex;max-height:192px;flex-direction:column;justify-content:flex-start;align-items:center;align-self:stretch;'
  const rows: { row: HTMLElement; text: HTMLElement; name: string }[] = []
  leaves.forEach((leaf, i) => {
    const on = playing.has(leaf.id)
    const row = document.createElement('div')
    row.className = on ? 'cctv-cluster-row is-playing' : 'cctv-cluster-row'
    if (!on)
      row.addEventListener('click', () => {
        picked = true
        popup.remove()
        onPick(leaf)
      })
    const index = document.createElement('span')
    index.className = 'cctv-cluster-row-index'
    index.textContent = String(i + 1)
    const text = document.createElement('span')
    text.className = 'cctv-cluster-row-name'
    text.textContent = leaf.name
    row.append(index, text)
    list.appendChild(row)
    rows.push({ row, text, name: leaf.name })
  })
  box.appendChild(list)

  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: true,
    anchor: 'top-left',
    offset: [BADGE / 2 + 8, -PIN_H],
    className: 'cctv-cluster-popup',
    maxWidth: 'none',
  })
    .setLngLat(at)
    .setDOMContent(box)
    .addTo(map)
  popup.on('close', () => {
    hideTip()
    if (!picked) onClose()
  })
  close.addEventListener('click', (e) => {
    e.stopPropagation()
    popup.remove()
  })

  // 이름이 잘린 줄만 올리면 전체 이름 — 목록 스크롤에 잘리지 않게 body 에 붙인다
  requestAnimationFrame(() => {
    for (const r of rows) {
      if (r.text.scrollWidth <= r.text.clientWidth) continue
      r.row.addEventListener('mouseenter', () => {
        hideTip()
        const el = document.createElement('div')
        el.className = 'cctv-row-tip'
        el.textContent = r.name
        document.body.appendChild(el)
        const b = r.row.getBoundingClientRect()
        el.style.left = `${Math.max(4, b.left)}px`
        el.style.top = `${b.top - el.getBoundingClientRect().height - 6}px`
        tip = el
      })
      r.row.addEventListener('mouseleave', hideTip)
    }
  })

  return () => {
    picked = true
    popup.remove()
  }
}
