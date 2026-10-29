import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button, Checkbox, ConfirmDialog, countChecked, ExpandButton, ExpandModal, NumberBadge, Radio, SectionCard, StateMessage, StatusPill, SubTabs, Toast, toggleNode, TreeSelect, treeStates, ZOOM_MS, type TreeNode } from '.'

describe('ExpandButton', () => {
  it('누르면 onClick', async () => {
    const onClick = vi.fn()
    render(<ExpandButton onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: '확대' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
  it('disabled 면 눌러도 안 불린다', async () => {
    const onClick = vi.fn()
    render(<ExpandButton variant="square" disabled onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
  it('hover 해도 다시 그리지 않는다 (상태 없음)', async () => {
    const { container } = render(<ExpandButton />)
    const before = container.innerHTML
    await userEvent.hover(screen.getByRole('button'))
    expect(container.innerHTML).toBe(before)
  })
})

describe('SubTabs', () => {
  const tabs = [
    { id: 'a', label: '가' },
    { id: 'b', label: '나' },
  ] as const
  it('선택된 탭 표시 + 바꾸면 onChange(id)', async () => {
    const onChange = vi.fn()
    render(<SubTabs tabs={tabs} active="a" onChange={onChange} />)
    expect(screen.getByRole('tab', { name: '가' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: '나' })).toHaveAttribute('aria-selected', 'false')
    await userEvent.click(screen.getByRole('tab', { name: '나' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })
})

describe('Toast', () => {
  it('메시지가 오면 보였다가 duration 뒤 사라지고 onDismiss', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    const { rerender } = render(<Toast message={null} onDismiss={onDismiss} />)
    expect(screen.getByRole('status', { hidden: true })).toHaveClass('opacity-0')
    rerender(<Toast message="전송 실패" duration={1000} onDismiss={onDismiss} />)
    expect(screen.getByRole('status')).toHaveClass('opacity-100')
    expect(screen.getByRole('status')).toHaveTextContent('전송 실패')
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('status', { hidden: true })).toHaveClass('opacity-0')
    expect(onDismiss).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })
})

describe('표시 컴포넌트', () => {
  it('Checkbox 상태별 그림', () => {
    const { container, rerender } = render(<Checkbox state="checked" size={26} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('data-state', 'checked')
    expect(svg).toHaveAttribute('width', '26')
    rerender(<Checkbox state="unchecked" />)
    expect(container.querySelectorAll('rect')).toHaveLength(2)
  })
  it('Radio 선택이면 점이 있다', () => {
    const { container } = render(<Radio checked />)
    expect(container.querySelector('circle')).not.toBeNull()
  })
  it('NumberBadge 이벤트면 빨강', () => {
    render(<NumberBadge number={4} variant="event" />)
    expect(screen.getByText('4').parentElement).toHaveClass('bg-event')
  })
  it('StatusPill 상태별 색', () => {
    render(<StatusPill status="critical">2</StatusPill>)
    expect(screen.getByText('2').parentElement).toHaveClass('bg-accent-red')
  })
  it('SectionCard 제목 + 확대 버튼', async () => {
    const onExpand = vi.fn()
    render(<SectionCard title="위성 지도" onExpand={onExpand}>본문</SectionCard>)
    expect(screen.getByText('위성 지도')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '확대' }))
    expect(onExpand).toHaveBeenCalledOnce()
  })
})

describe('Button', () => {
  it('기본 type=button + variant 색', () => {
    render(<Button variant="danger">삭제</Button>)
    const b = screen.getByRole('button', { name: '삭제' })
    expect(b).toHaveAttribute('type', 'button')
    expect(b).toHaveClass('bg-accent-red')
  })
})

describe('ConfirmDialog', () => {
  const setup = (open = true) => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(<ConfirmDialog open={open} title="초기화" message="모두 지울까요?" confirmLabel="초기화" onConfirm={onConfirm} onClose={onClose} />)
    return { onConfirm, onClose }
  }
  it('닫혀 있으면 안 그린다', () => {
    setup(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('확인·취소·X·ESC', async () => {
    const { onConfirm, onClose } = setup()
    expect(screen.getByRole('dialog', { name: '초기화' })).toHaveTextContent('모두 지울까요?')
    await userEvent.click(screen.getByRole('button', { name: '초기화' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    await userEvent.click(screen.getByRole('button', { name: '닫기' }))
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(3)
  })
})

describe('StateMessage', () => {
  it('오류는 alert, 나머지는 status', () => {
    const { rerender } = render(<StateMessage kind="error">검색 서버 응답 없음</StateMessage>)
    expect(screen.getByRole('alert')).toHaveTextContent('검색 서버 응답 없음')
    rerender(<StateMessage kind="empty">데이터가 없습니다</StateMessage>)
    expect(screen.getByRole('status')).toHaveTextContent('데이터가 없습니다')
  })
})

describe('TreeSelect', () => {
  const tree: TreeNode[] = [
    { id: 'all', label: '전체', children: [
      { id: 'g1', label: '동구', children: [{ id: 'a', label: '방어동' }, { id: 'b', label: '일산동' }] },
      { id: 'g2', label: '중구', children: [{ id: 'c', label: '성안동' }] },
    ] },
  ]

  it('부모 상태는 leaf 에서 계산 (전체·일부·없음)', () => {
    const s = treeStates(tree, new Set(['a', 'b']))
    expect(s.get('g1')).toBe('checked')
    expect(s.get('g2')).toBe('unchecked')
    expect(s.get('all')).toBe('indeterminate')
  })

  it('누르면 아래 leaf 를 모두 체크, 다 체크돼 있으면 모두 해제', () => {
    expect([...toggleNode(tree[0], new Set(['a']))].sort()).toEqual(['a', 'b', 'c'])
    expect([...toggleNode(tree[0].children![0], new Set(['a', 'b', 'c']))]).toEqual(['c'])
    expect(countChecked(tree, new Set(['a', 'c']))).toBe(2)
  })

  it('줄을 누르면 onToggle, 화살표는 펼침만 바꾼다', async () => {
    const onToggle = vi.fn()
    render(<TreeSelect data={tree} checked={new Set(['a'])} onToggle={onToggle} variant="dropdown" />)
    // dropdown 은 맨 위만 펼침 → 동구·중구는 보이고 그 아래는 안 보임
    expect(screen.queryByText('방어동')).toBeNull()
    await userEvent.click(screen.getAllByRole('button', { name: '펼치기' })[0])
    expect(screen.getByText('방어동')).toBeTruthy()
    expect(onToggle).not.toHaveBeenCalled()
    await userEvent.click(screen.getByText('동구'))
    expect(onToggle).toHaveBeenCalledWith(tree[0].children![0])
    expect(screen.getByText('전체').closest('[role=treeitem]')!.getAttribute('aria-checked')).toBe('mixed')
  })

  it('데이터가 늦게 오면(빈 목록 → 채워짐) 기본 펼침을 다시 적용', () => {
    const { rerender } = render(<TreeSelect data={[]} checked={new Set()} onToggle={() => {}} />)
    rerender(<TreeSelect data={tree} checked={new Set()} onToggle={() => {}} />)
    expect(screen.getByText('방어동')).toBeTruthy() // panel 은 깊이 1 까지 펼침
  })
})

describe('ExpandModal', () => {
  it('닫으면 작아지는 동안(ZOOM_MS) 내용을 남겼다가 없앤다', () => {
    vi.useFakeTimers()
    const { rerender } = render(<ExpandModal open onClose={() => {}} title="위성 지도">내용</ExpandModal>)
    expect(screen.getByRole('dialog', { name: '위성 지도' })).toBeTruthy()
    rerender(<ExpandModal open={false} onClose={() => {}} title="위성 지도">내용</ExpandModal>)
    expect(screen.getByText('내용')).toBeTruthy()
    act(() => vi.advanceTimersByTime(ZOOM_MS))
    expect(screen.queryByRole('dialog')).toBeNull()
    vi.useRealTimers()
  })
})
