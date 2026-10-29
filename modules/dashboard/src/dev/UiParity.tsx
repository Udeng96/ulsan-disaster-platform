// 개발용 — 옛 컴포넌트와 새 공통 컴포넌트를 나란히 그려 모양이 같은지 비교한다 (/dev/ui, dev 서버에서만).
//   e2e/ui-parity.spec.ts 가 data-pair 마다 old·new 를 캡처해 픽셀 비교한다.
//   옛 컴포넌트가 모두 바뀌면 이 파일도 지운다.
import type { ReactNode } from 'react'
import { ExpandButton as OldExpandRound } from '@/components/button/ExpandButton'
import { Checkbox as OldCheckbox } from '@/components/inputs/Checkbox'
import { ExpandButton as OldExpandSquare } from '@/features/shared/cctv-stream/ExpandButton'
import { NumberBadge as OldNumberBadge } from '@/features/shared/cctv-stream/NumberBadge'
import { RadioDot as OldRadio } from '@/features/menus/disaster-alert/RadioDot'
import { SlopeSubTabs as OldSubTabs } from '@/features/menus/steep-slope/SlopeSubTabs'
import { SectionCard as OldSectionCard } from '@/features/wall/left-panel/SectionCard'
import { StatusPill as OldStatusPill } from '@/features/wall/right-panel/StatusPill'
import { TreeSelect as OldPanelTree } from '@/features/menus/disaster-alert/TreeSelect'
import { TreeSelect as OldDropdownTree } from '@/features/shared/map/event-panel/DropdownPanel'
import { LabelToggle as OldToggle } from '@/features/menus/layer/LabelToggle'
import { Button, Checkbox, ConfirmDialog, ExpandButton, NumberBadge, Radio, SectionCard, StatusPill, SubTabs, Toggle, TreeSelect, type TreeNode } from '@/shared/ui'

const SLOPE_TABS = [
  { id: 'overview', label: '총괄·관제' },
  { id: 'measure', label: '계측 상세' },
  { id: 'alert', label: '조기경보·통계' },
] as const

const TREE: TreeNode[] = [
  {
    id: 'all',
    label: '전체',
    children: [
      { id: 'g1', label: '동구', children: [{ id: 'a', label: '방어동 마을방송' }, { id: 'b', label: '일산동 마을방송' }] },
      { id: 'g2', label: '중구', children: [{ id: 'c', label: '성안동 마을방송' }, { id: 'd', label: '태화동 마을방송' }] },
      { id: 'g3', label: '남구', children: [{ id: 'e', label: '가상시설0412 마을방송' }] },
    ],
  },
]
const TREE_CHECKED = new Set(['a', 'b', 'c'])
const FLAT: TreeNode[] = [{ id: 'x', label: '방어동 (3)' }, { id: 'y', label: '일산동 (1)' }]
const treeBox = 'flex w-[360px] flex-col gap-1 self-stretch p-2'

function Pair({ name, w, h, old, next }: { name: string; w: number; h: number; old: ReactNode; next: ReactNode }) {
  const box = (side: string, c: ReactNode) => (
    <div data-side={side} className="relative overflow-hidden bg-neutral-900 [transform:translateZ(0)]" style={{ width: w, height: h }}>
      {/* 글라스 효과 확인용 줄무늬 바탕 */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,var(--color-neutral-600)_0_6px,var(--color-neutral-800)_6px_12px)]" />
      <div className="relative grid size-full place-items-center">{c}</div>
    </div>
  )
  return (
    <div data-pair={name} className="flex items-center gap-6">
      <span className="w-48 text-sm text-white">{name}</span>
      {box('old', old)}
      {box('new', next)}
    </div>
  )
}

/** 옛 VoiceComposer 초기화 확인창 마크업 그대로 (비교용). */
function OldConfirm() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 5000, background: 'rgba(0, 0, 0, 0.50)' }}>
      <div className="flex flex-col items-start" style={{ width: '408px', height: '234px', borderRadius: '16px', border: '1px solid #1B4671', background: '#002247' }}>
        <div className="flex items-center self-stretch" style={{ padding: '14px 24px', gap: '16px' }}>
          <span style={{ flex: '1 0 0', color: '#FFF', fontFamily: 'Roboto', fontSize: '18px', fontWeight: 500, lineHeight: '1' }}>초기화</span>
          <button type="button" aria-label="닫기" className="flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <path d="M10.9883 11.9946L17.4942 18.5005L18.5054 17.4893L11.9995 10.9834L18.5054 4.47755L17.4942 3.46639L10.9883 9.97226L4.47894 3.46289L3.46777 4.47405L9.97715 10.9834L3.46777 17.4928L4.47894 18.504L10.9883 11.9946Z" fill="#F3F4F6" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col items-start self-stretch" style={{ flex: '1 0 0', minHeight: 0, justifyContent: 'center', padding: '24px', gap: '10px' }}>
          <span style={{ color: '#DCE6EE', fontFamily: 'Roboto', fontSize: '15px', fontWeight: 400, lineHeight: '1' }}>입력된 내용을 모두 초기화 하겠습니까?</span>
        </div>
        <div className="flex items-center justify-end self-stretch" style={{ padding: '14px 24px', gap: '8px' }}>
          <button type="button" className="voice-modal-btn voice-modal-btn-cancel">취소</button>
          <button type="button" className="voice-modal-btn voice-modal-btn-reset">초기화</button>
        </div>
      </div>
    </div>
  )
}

export default function UiParity() {
  return (
    <div className="flex h-screen flex-col gap-3 overflow-auto bg-black p-6">
      {(['checked', 'unchecked', 'indeterminate', 'disabled'] as const).map((s) => (
        <Pair key={s} name={`checkbox-${s}`} w={40} h={40} old={<OldCheckbox state={s} />} next={<Checkbox state={s} />} />
      ))}
      <Pair name="checkbox-26" w={40} h={40} old={<OldCheckbox state="checked" size={26} />} next={<Checkbox state="checked" size={26} />} />
      {[true, false].map((c) => (
        <Pair key={String(c)} name={`radio-${c}`} w={40} h={40}
          old={<span className="group inline-flex p-2"><OldRadio checked={c} /></span>}
          next={<span className="group inline-flex p-2"><Radio checked={c} /></span>} />
      ))}
      <Pair name="expand-round" w={56} h={56} old={<OldExpandRound />} next={<ExpandButton />} />
      <Pair name="expand-square" w={56} h={56} old={<OldExpandSquare />} next={<ExpandButton variant="square" className="absolute! right-3 bottom-3" />} />
      <Pair name="expand-square-disabled" w={56} h={56} old={<OldExpandSquare disabled />} next={<ExpandButton variant="square" disabled className="absolute! right-3 bottom-3" />} />
      {(['small', 'large'] as const).flatMap((size) =>
        (['normal', 'event'] as const).map((v) => (
          <Pair key={size + v} name={`badge-${size}-${v}`} w={40} h={40}
            old={<OldNumberBadge number={3} size={size} variant={v} />} next={<NumberBadge number={3} size={size} variant={v} />} />
        )),
      )}
      {(['normal', 'caution', 'critical'] as const).map((k) => (
        <Pair key={k} name={`pill-${k}`} w={70} h={44} old={<OldStatusPill status="0" kind={k} />} next={<StatusPill status={k}>0</StatusPill>} />
      ))}
      <Pair name="subtabs" w={1000} h={80}
        old={<OldSubTabs active="measure" onChange={() => {}} />}
        next={<SubTabs tabs={SLOPE_TABS} active="measure" onChange={() => {}} />} />
      <Pair name="section-card" w={480} h={300}
        old={<OldSectionCard title="위성 지도" bodyHeight={219} />}
        next={<SectionCard title="위성 지도" bodyHeight={219} />} />
      {(['cancel', 'reset', 'confirm'] as const).map((v) => (
        <Pair key={v} name={`button-${v}`} w={140} h={56}
          old={<button type="button" className={`voice-modal-btn voice-modal-btn-${v}`}>확인</button>}
          next={<Button variant={v === 'reset' ? 'danger' : v === 'confirm' ? 'primary' : 'cancel'}>확인</Button>} />
      ))}
      <Pair name="tree-panel" w={400} h={360}
        old={<div className={treeBox}><OldPanelTree data={TREE} checked={TREE_CHECKED} onToggle={() => {}} /></div>}
        next={<div className={treeBox}><TreeSelect data={TREE} checked={TREE_CHECKED} onToggle={() => {}} /></div>} />
      <Pair name="tree-panel-flat" w={400} h={110}
        old={<div className={treeBox}><OldPanelTree data={FLAT} checked={new Set(['x'])} onToggle={() => {}} startLevel={1} /></div>}
        next={<div className={treeBox}><TreeSelect data={FLAT} checked={new Set(['x'])} onToggle={() => {}} startLevel={1} /></div>} />
      <Pair name="tree-dropdown" w={400} h={200}
        old={<div className={treeBox}><OldDropdownTree data={TREE} checked={TREE_CHECKED} onChange={() => {}} /></div>}
        next={<div className={treeBox}><TreeSelect variant="dropdown" data={TREE} checked={TREE_CHECKED} onToggle={() => {}} /></div>} />
      {[true, false].map((on) => (
        <Pair key={String(on)} name={`toggle-${on}`} w={60} h={40} old={<OldToggle on={on} onChange={() => {}} />} next={<Toggle on={on} onChange={() => {}} />} />
      ))}
      <Pair name="confirm-dialog" w={480} h={300} old={<OldConfirm />}
        next={<ConfirmDialog open title="초기화" message="입력된 내용을 모두 초기화 하겠습니까?" confirmLabel="초기화" onConfirm={() => {}} onClose={() => {}} />} />
    </div>
  )
}
