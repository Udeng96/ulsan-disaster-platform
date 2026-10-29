// 이벤트 검색 계산 — 조건 트리·토큰·조회 파라미터·목록 표기. 화면과 떨어진 순수 함수.
import { EVENT_GROUP_COLOR, EVENT_OTHER_COLOR } from '@/shared/styles/palette'
import type { TreeNode } from '@/shared/ui'
import type { Region as RegionItem } from '../layer/api'
import { EVENT_LIMIT, type EventSearchParams, type EventType as EventTypeItem, type OwlEvent } from './api'

/** 이벤트 구분 — 목록·실시간 모두 id 가 늘 있다 (후속 전파도 새 id) */
export const eventKey = (e: Pick<OwlEvent, 'id'>) => String(e.id)

/** 유형 색 — 코드 앞자리(대분류). 모르면 흰색 */
export const eventTypeColor = (code: string | null) => (code && EVENT_GROUP_COLOR[code[0]]) || EVENT_OTHER_COLOR

// 트리 id — 지역 'region:{동 id}', 이벤트 대분류 'event:group:{id}', 소분류 'event:{대분류}:{소분류}'
//   (대분류 id 와 소분류 id 가 서로 겹쳐서 대분류를 붙인다)
export const REGION_ALL = 'region:all'
export const EVENT_ALL = 'event:all'
const regionId = (id: number) => `region:${id}`
const groupId = (id: number) => `event:group:${id}`
const subId = (group: number, id: number) => `event:${group}:${id}`

/** 발생 지역 — 전체 ▶ 동 */
export function regionTree(regions: readonly RegionItem[]): TreeNode[] {
  return [{ id: REGION_ALL, label: '전체', children: regions.map((r) => ({ id: regionId(r.id), label: r.name })) }]
}

/** 이벤트 유형 — 전체 ▶ 대분류 ▶ 소분류. 소분류가 없는 대분류('공지/안내')는 그 자체가 leaf */
export function typeTree(types: readonly EventTypeItem[]): TreeNode[] {
  return [
    {
      id: EVENT_ALL,
      label: '전체',
      children: types.map((t) => {
        const subs = t.children
        return subs.length ? { id: groupId(t.id), label: t.name, children: subs.map((c) => ({ id: subId(t.id, c.id), label: c.name })) } : { id: groupId(t.id), label: t.name }
      }),
    },
  ]
}

export interface Leaf {
  key: string
  label: string
}
export const regionLeaves = (regions: readonly RegionItem[]): Leaf[] => regions.map((r) => ({ key: regionId(r.id), label: r.name }))
export const typeLeaves = (types: readonly EventTypeItem[]): Leaf[] =>
  types.flatMap((t) => (t.children.length ? t.children.map((c) => ({ key: subId(t.id, c.id), label: c.name })) : [{ key: groupId(t.id), label: t.name }]))

/** 처음엔 모두 선택 */
export const allKeys = (leaves: readonly Leaf[]) => new Set(leaves.map((l) => l.key))

export interface Token {
  label: string
  /** 없으면 ✕ 없음 ('전체' 토큰) */
  key?: string
}
/** 칸에 보일 토큰 — 다 고르면 '#{전체}' 하나, 하나도 안 고르면 없음(안내 글), 일부면 고른 것마다 */
export function tokensOf(leaves: readonly Leaf[], checked: ReadonlySet<string>, allLabel: string): Token[] {
  const picked = leaves.filter((l) => checked.has(l.key))
  if (!picked.length) return []
  if (picked.length === leaves.length) return [{ label: allLabel }]
  return picked.map((l) => ({ label: `#${l.label}`, key: l.key }))
}

/** 고른 조건 → 조회 파라미터. 대분류를 통째로 고르면 typeIds, 일부면 그 소분류를 subTypeIds. 지역을 다 고르면 비움(= 전체) */
export function searchParams(regions: readonly RegionItem[], types: readonly EventTypeItem[], regionChecked: ReadonlySet<string>, typeChecked: ReadonlySet<string>): EventSearchParams {
  const typeIds: number[] = []
  const subTypeIds: number[] = []
  for (const g of types) {
    const subs = g.children
    if (!subs.length) {
      if (typeChecked.has(groupId(g.id))) typeIds.push(g.id)
      continue
    }
    const picked = subs.filter((c) => typeChecked.has(subId(g.id, c.id)))
    if (!picked.length) continue
    if (picked.length === subs.length) typeIds.push(g.id)
    else subTypeIds.push(...picked.map((c) => c.id))
  }
  const picked = regions.filter((r) => regionChecked.has(regionId(r.id)))
  return { typeIds, subTypeIds, regionIds: picked.length === regions.length ? [] : picked.map((r) => r.id) }
}

/** 실시간으로 온 이벤트 — 맨 위로, 같은 이벤트는 새 것으로 바꾼다. 최신 100건만 남긴다 (사용자 10-22) */
export function upsertEvent(list: readonly OwlEvent[], e: OwlEvent): OwlEvent[] {
  const key = eventKey(e)
  return [e, ...list.filter((x) => eventKey(x) !== key)].slice(0, EVENT_LIMIT)
}

const two = (n: number) => String(n).padStart(2, '0')
/** 발생 일시 'YY-MM-DD HH:MM:SS' */
export function rowTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${String(d.getFullYear()).slice(-2)}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`
}
/** 조회 시각 'YYYY-MM-DD HH:MM:SS' */
export function fullTime(d: Date): string {
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`
}
/** '가상시설0565 가상시설0480 312' → '가상시설0480 312' */
export function shortLocation(address: string | null): string {
  if (!address) return ''
  return address.split(/\s+/).slice(2).join(' ') || address
}
