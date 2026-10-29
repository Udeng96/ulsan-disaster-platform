// 헤더 오른쪽 주소 검색 — 평소엔 둥근 검색바, 누르면 펼쳐져 최근 검색어 / 검색 결과.
//   결과를 고르면 대시보드가 그곳으로 (selectAddress). 제목을 누르면 대시보드가 key 를 바꿔 처음으로.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { searchAddress, type AddressSearchItem } from './api'
import { cn } from '@/shared/ui'
import { selectAddress } from '../../dashboard/state'
import { addRecent, loadRecent, saveRecent, splitKeyword } from './logic'

// 펼친 목록의 버튼은 누를 때 입력칸 포커스를 뺏지 않게 (빼앗기면 목록이 먼저 닫힌다)
const keepFocus = (e: React.PointerEvent) => e.preventDefault()

function Highlight({ text, keyword }: { text: string | null; keyword: string }) {
  return splitKeyword(text, keyword).map((p, i) => (p.hit ? <span key={i} className="text-accent-teal">{p.text}</span> : p.text))
}

function Results({ items, keyword, onPick }: { items: AddressSearchItem[]; keyword: string; onPick: (r: AddressSearchItem) => void }) {
  return (
    <div className="flex w-full flex-col items-start gap-2 px-5 pt-4 pb-5">
      <div className="flex h-[303px] w-full flex-col items-center gap-2 self-stretch overflow-y-auto rounded-2xl bg-white/5 p-3 scroll-slim">
        {items.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center font-sans text-[14px] text-white/60">검색 결과가 없습니다</div>
        ) : (
          items.map((r) => {
            // place: 건물명 + 도로명 주소, address: 도로명 주소 + 지번
            const sub = r.id.startsWith('place:') ? r.roadAddress : r.parcelAddress
            return (
              <button key={r.id} type="button" onPointerDown={keepFocus} onClick={() => onPick(r)} className="h-14 w-[282px] shrink-0 rounded-lg text-left transition-colors hover:bg-white/8">
                <div className="flex h-full w-full flex-col items-start justify-center gap-0.5 px-2 py-2.5">
                  <span className="font-sans text-[18px] leading-5 font-semibold text-white">
                    <Highlight text={r.title} keyword={keyword} />
                  </span>
                  {sub && (
                    <span className="font-sans text-[14px] leading-4 font-medium text-white/65">
                      <Highlight text={sub} keyword={keyword} />
                    </span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function Recent({ items, onPick, onRemove, onClear }: { items: string[]; onPick: (k: string) => void; onRemove: (k: string) => void; onClear: () => void }) {
  return (
    <div className="flex w-full flex-col items-start gap-2 px-5 pt-4 pb-5">
      <div className="flex w-full items-center justify-between">
        <h3 className="text-b3 text-neutral-100">최근 검색어</h3>
        {items.length > 0 && (
          <button type="button" onPointerDown={keepFocus} onClick={onClear} className="cursor-pointer font-sans text-[13px] font-medium tracking-[-0.2px] text-white/60 opacity-70 transition-opacity hover:opacity-100">
            전체 삭제
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="flex h-[277px] w-full items-center justify-center self-stretch rounded-2xl border border-white/15">
          <p className="text-center text-b2 text-white/50">최근 검색어가 없습니다.</p>
        </div>
      ) : (
        <div className="flex h-[277px] w-full flex-col items-center gap-2 self-stretch overflow-y-auto rounded-2xl bg-white/5 p-3 scroll-slim">
          {items.map((k) => (
            <div key={k} className="h-[49px] w-[282px] shrink-0 rounded-lg transition-colors hover:bg-white/8">
              <div className="flex h-full w-full flex-col items-start justify-center gap-2.5 px-2 py-1">
                <div className="flex w-full items-center gap-2 self-stretch">
                  <button type="button" onPointerDown={keepFocus} onClick={() => onPick(k)} className="flex flex-1 cursor-pointer flex-col items-start gap-1 text-left">
                    <span className="text-b3 text-white">{k}</span>
                  </button>
                  <button type="button" onPointerDown={keepFocus} onClick={() => onRemove(k)} aria-label={`${k} 삭제`} className="shrink-0 cursor-pointer opacity-50 transition-opacity hover:opacity-100">
                    <img src="/ic/ic_delete_default_line_normal_white_24.svg" alt="" width={24} height={24} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const input = 'flex-1 bg-transparent font-sans text-[24px] leading-[26px] font-medium text-white outline-none placeholder:text-white placeholder:opacity-75'

export function AddressSearch() {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  // 검색한 뒤엔 결과, 아니면 최근 검색어
  const [searched, setSearched] = useState(false)
  const [results, setResults] = useState<AddressSearchItem[]>([])
  const [recent, setRecent] = useState(loadRecent)
  useEffect(() => saveRecent(recent), [recent])
  // 늦게 온 이전 응답이 최신 결과를 덮지 않게
  const seq = useRef(0)

  const run = (word: string) => {
    const k = word.trim()
    if (!k) return
    setSearched(true)
    setRecent((r) => addRecent(r, k))
    const n = ++seq.current
    searchAddress(k)
      .then((items) => n === seq.current && setResults(items))
      .catch((err) => {
        console.warn('[search] 검색 실패', err)
        if (n === seq.current) setResults([])
      })
  }
  const reset = () => {
    setValue('')
    setSearched(false)
    setFocused(false)
    setResults([])
  }
  const pick = (r: AddressSearchItem) => {
    selectAddress(r)
    reset()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') run(value)
  }

  const icon = searched ? (
    <button type="button" onClick={reset} aria-label="검색 지우기" className="flex size-10 shrink-0 cursor-pointer items-center justify-center">
      <img src="/btc/btc_search-delete_normal_24x24.svg" alt="" width={24} height={24} />
    </button>
  ) : (
    <div className="flex size-10 shrink-0 items-center justify-center">
      <img src="/btc/btc_search_normal_24x24.svg" alt="검색" width={24} height={24} />
    </div>
  )

  return (
    <div
      className={cn(
        'absolute top-5 right-14 z-[3000] flex w-[360px]',
        focused ? 'flex-col rounded-[32px] bg-neutral-800/80 shadow-search backdrop-blur-[20px]' : 'h-16 items-center gap-2 rounded-[99px] bg-white/10 pr-4 pl-6 backdrop-blur-[4px]',
      )}
    >
      {focused ? (
        <>
          <div className="flex h-16 w-full items-center gap-2 py-3 pr-4 pl-6">
            {/* 펼칠 때 새 입력칸이라 다시 포커스 */}
            <input type="text" autoFocus aria-label="주소 입력" value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => setFocused(false)} onKeyDown={onKeyDown} placeholder="주소 입력" className={input} />
            {icon}
          </div>
          <div className="mx-auto h-px w-[328px] bg-white/10" />
          {searched ? (
            <Results items={results} keyword={value} onPick={pick} />
          ) : (
            <Recent
              items={recent}
              onPick={(k) => {
                setValue(k)
                run(k)
              }}
              onRemove={(k) => setRecent((r) => r.filter((x) => x !== k))}
              onClear={() => setRecent([])}
            />
          )}
        </>
      ) : (
        <>
          <input type="text" aria-label="주소 입력" value={value} onChange={(e) => setValue(e.target.value)} onFocus={() => setFocused(true)} onKeyDown={onKeyDown} placeholder="주소 입력" className={input} />
          {icon}
        </>
      )}
    </div>
  )
}
