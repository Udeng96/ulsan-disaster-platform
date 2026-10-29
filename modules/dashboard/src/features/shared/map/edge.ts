// 지도 오른쪽 끝에 붙는 것(컨트롤·범례)의 자리.
//   옛 화면: right 를 inset 만큼 바꾸고 right 전환으로 움직인다.
//   새 화면(/v2/wall): CCTV 접기 때 배치를 다시 계산하지 않게, right 는 baseInset 에 고정하고
//   차이만 translate 로 옮긴다. animate 일 때만 0.4초 전환 (메뉴 바꿀 때는 바로).
import type { CSSProperties } from 'react'

export interface MapEdge {
  /** 지도 칸 실제 폭 기준 inset — right 는 이 값에 고정 */
  baseInset: number
  /** CCTV 접기·펼치기 중 — 이때만 translate 전환 */
  animate: boolean
}

const EDGE_TRANSITION = 'translate 0.4s cubic-bezier(0.33, 1, 0.68, 1)'

/** 오른쪽 끝 요소 style — edge 가 없으면 옛 동작 그대로 */
export function edgeStyle(inset: number, edge: MapEdge | undefined, oldTransition: string, gap = 20): CSSProperties {
  if (!edge) return { right: gap + inset, transition: oldTransition }
  return { right: gap + edge.baseInset, translate: `${edge.baseInset - inset}px 0`, transition: edge.animate ? EDGE_TRANSITION : 'none' }
}

/** 새 화면에서 움직임을 끄는 감싸개가 이 요소는 건너뛰게 표시 */
export const edgeAttr = (edge: MapEdge | undefined) => (edge ? { 'data-edge': '' } : {})

/** 가운데 아래 안내(측정 툴) — 보이는 지도 가운데. edge 가 없으면 옛 동작 그대로 */
export function centerStyle(inset: number, edge: MapEdge | undefined, oldTransition: string): CSSProperties {
  if (!edge) return { left: `calc(50% - ${inset / 2}px)`, transition: oldTransition }
  return { left: `calc(50% - ${edge.baseInset / 2}px)`, translate: `${(edge.baseInset - inset) / 2}px 0`, transition: edge.animate ? EDGE_TRANSITION : 'none' }
}
