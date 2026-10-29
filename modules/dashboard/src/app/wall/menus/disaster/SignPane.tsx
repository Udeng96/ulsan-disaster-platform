// 재해 문자 전광판 — 왼쪽 전광판 카드 목록 + 오른쪽 고른 전광판 CCTV(3×2) + 아래 텍스트 입력.
import { memo, useMemo } from 'react'
import { CctvPlayer } from '@/features/shared/cctv-stream/CctvPlayer'
import { Checkbox, cn, ExpandButton, type TreeNode } from '@/shared/ui'
import { dash } from '../../dashboard/state'
import { previewCells, signItems, type PreviewCell } from './logic'
import { disaster, lists, setInput, toggleSign } from './state'

const title18 = 'font-sans text-[18px] leading-none font-medium whitespace-nowrap'
const cellHead = 'flex h-8 shrink-0 items-center gap-[7px] border-b border-white/20 bg-neutral-800/80 px-2.5 py-1.5'
const cellName = 'font-sans text-[15px] leading-4 font-medium text-white'

const SignCard = memo(function SignCard({ node, on }: { node: TreeNode; on: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => toggleSign(node)}
      className={cn('flex items-center gap-2.5 self-stretch rounded-[6px] px-2.5 py-4', on ? 'border-2 border-primary-light bg-neutral-450' : 'border border-neutral-450 bg-neutral-600')}
    >
      <Checkbox state={on ? 'checked' : 'unchecked'} size={18} />
      <span className="font-sans text-[18px] leading-none font-medium whitespace-nowrap text-white">{node.label}</span>
    </button>
  )
})

function Boards({ items }: { items: TreeNode[] }) {
  const checked = disaster.use((s) => s.signChecked)
  const total = lists.use((s) => s.signboard.length)
  return (
    <div className="flex w-[292px] shrink-0 flex-col items-start justify-center gap-2 self-stretch">
      <div className="flex items-center justify-between self-stretch pl-0.5">
        <span className={cn(title18, 'text-neutral-200')}>송출 대상 전광판 선택</span>
        <span className={cn(title18, 'text-right text-neutral-200')}>
          (선택 {checked.size}/{total})
        </span>
      </div>
      <div className="flex min-h-0 flex-[1_0_0] flex-col items-start gap-1.5 self-stretch overflow-y-auto rounded-xl border border-neutral-450 bg-neutral-800 p-2.5 scroll-slim">
        {items.map((n) => (
          <SignCard key={n.id} node={n} on={checked.has(n.id)} />
        ))}
      </div>
    </div>
  )
}

function Cell({ cell, number, onClose }: { cell: PreviewCell | null; number: number; onClose: (label: string) => void }) {
  if (!cell) {
    return (
      <div className="flex h-[180px] w-[260px] shrink-0 flex-col border-2 border-neutral-450">
        <div className={cellHead}>
          <span className={cellName}>할당된 CCTV 없음</span>
        </div>
        <CctvPlayer cctvId={undefined} width={256} height={144} />
      </div>
    )
  }
  return (
    <div role="group" aria-label={cell.label} className="flex h-[180px] w-[260px] shrink-0 flex-col border-2 border-neutral-450">
      <div className={cellHead}>
        <span className={cn(cellName, 'min-w-0 flex-[1_0_0] truncate')}>{cell.label}</span>
        <button type="button" aria-label="닫기" onClick={() => onClose(cell.label)} className="flex size-5 shrink-0 items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M1 1L11 11M11 1L1 11" className="stroke-neutral-200" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="relative min-h-0 flex-[1_0_0] overflow-hidden bg-neutral-900">
        <CctvPlayer cctvId={cell.cctvId} width={256} height={144} />
        <div className="absolute right-3 bottom-3 flex">
          <ExpandButton variant="square" label="확장" onClick={() => dash.set({ modalCctv: { number, name: cell.label, cctvId: cell.cctvId } })} />
        </div>
      </div>
    </div>
  )
}

function Previews({ items }: { items: TreeNode[] }) {
  const checked = disaster.use((s) => s.signChecked)
  const boards = lists.use((s) => s.signboard)
  const cctvOf = lists.use((s) => s.signboardCctv)
  const cells = useMemo(() => previewCells(checked, boards, cctvOf), [checked, boards, cctvOf])
  // 칸의 ✕ — 이름이 같은 전광판 카드를 해제
  const close = (label: string) => {
    const node = items.find((n) => n.label === label)
    if (node && disaster.get().signChecked.has(node.id)) toggleSign(node)
  }
  return (
    <div className="flex min-w-0 flex-[1_0_0] flex-col items-start justify-center gap-2 self-stretch">
      <div className="flex items-center self-stretch pl-0.5">
        <span className={cn(title18, 'text-neutral-50')}>선택한 전광판 CCTV</span>
        <span className="ml-auto font-['Pretendard',sans-serif] text-[14px] leading-5 font-normal tracking-[-0.14px] whitespace-nowrap text-neutral-200">
          ⓘ 전광판을 선택하면 선택한 순서대로 CCTV 영상이 표시됩니다.
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-start justify-center self-stretch overflow-hidden rounded-xl border border-neutral-300/50 bg-neutral-800">
        {[0, 1].map((r) => (
          <div key={r} className="flex items-center">
            {cells.slice(r * 3, r * 3 + 3).map((c, i) => (
              <Cell key={i} cell={c} number={r * 3 + i + 1} onClose={close} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Text() {
  const content = disaster.use((s) => s.content)
  const locked = disaster.use((s) => s.verified)
  return (
    <div className="flex min-h-0 flex-[1_0_0] flex-col items-start gap-2 self-stretch">
      <span className={cn(title18, 'text-neutral-100')}>텍스트 입력</span>
      <textarea
        aria-label="전광판 내용"
        value={content}
        readOnly={locked}
        onChange={(e) => setInput({ content: e.target.value })}
        placeholder="내용을 입력해 주세요."
        className="min-h-0 flex-[1_0_0] resize-none self-stretch overflow-y-auto rounded-xl border border-neutral-450 bg-neutral-800 p-3 font-sans text-[24px] leading-[150%] font-medium text-white outline-none transition-ui scroll-slim placeholder:text-neutral-300 focus:border-primary-dark"
      />
    </div>
  )
}

export function SignPane() {
  const boards = lists.use((s) => s.signboard)
  const items = useMemo(() => signItems(boards), [boards])
  return (
    <div className="flex min-h-0 flex-[1_0_0] flex-col gap-10 self-stretch">
      <div className="flex h-[416px] w-[1092px] items-center gap-4">
        <Boards items={items} />
        <Previews items={items} />
      </div>
      <Text />
    </div>
  )
}
