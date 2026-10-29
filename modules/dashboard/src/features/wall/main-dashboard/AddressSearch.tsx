// 헤더 우측 주소 검색 dropdown — V-World 주소 검색 + 최근 검색어 영속.
//   - 비활성 (isFocused=false): 둥근 검색바 1줄
//   - 활성 (isFocused=true): 펼친 dropdown
//       · isSearched=true  → 검색 결과 리스트
//       · isSearched=false → 최근 검색어 리스트
// 결과 클릭 시 부모로 onSelect(item) 콜백 → 부모가 투망 트리거 + 메뉴 reset 등.
// 외부 리셋은 부모가 `key` prop 변경 → 강제 remount 로 자체 state 초기화.

import { useRef, useState, type KeyboardEvent } from 'react'
import { searchAddress, type AddressSearchItem } from '@/api/vworld'
import { useRecentSearches } from '@/hooks/useRecentSearches'
import { highlightKeyword } from './highlightKeyword'

const INPUT_STYLE = {
  fontFamily: 'Roboto, system-ui, sans-serif',
  fontSize: '24px',
  fontWeight: 500,
  lineHeight: '26px',
} as const

interface Props {
  /** 검색 결과 선택 시 부모로 통보. 부모가 투망 트리거 / 지도 flyTo / 메뉴 reset 등 처리.
   *  미지정 시 (지도 미연동 상태) 결과 클릭은 dropdown 닫기만 함 — 추후 지도 붙으면 연결. */
  onSelect?: (result: AddressSearchItem) => void
}

export function AddressSearch({ onSelect }: Props) {
  const [searchValue, setSearchValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isSearched, setIsSearched] = useState(false)
  const [searchResults, setSearchResults] = useState<AddressSearchItem[]>([])
  // 최근 검색어 — localStorage 영속, useRecentSearches 훅이 캡슐화.
  const {
    items: recentSearches,
    add: addRecent,
    remove: removeRecent,
    clear: clearRecent,
  } = useRecentSearches()

  // 연속 검색 시 늦게 도착한 이전 응답이 최신 결과를 덮지 않게 시퀀스 가드.
  const searchSeqRef = useRef(0)

  // 키워드로 검색 실행 — Enter / 최근 검색어 클릭 공용.
  // 백엔드 /api/search (vWorld 통합검색 proxy) 호출.
  const runSearch = (keyword: string) => {
    const trimmed = keyword.trim()
    if (!trimmed) return
    setIsSearched(true)
    addRecent(trimmed)
    const seq = ++searchSeqRef.current
    searchAddress(trimmed)
      .then((items) => {
        if (searchSeqRef.current === seq) setSearchResults(items)
      })
      .catch((err) => {
        console.warn('[search] 검색 실패', err)
        if (searchSeqRef.current === seq) setSearchResults([])
      })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') runSearch(searchValue)
  }

  // 최근 검색어 항목 클릭 → input 채우고 재검색.
  const handleRecentClick = (keyword: string) => {
    setSearchValue(keyword)
    runSearch(keyword)
  }

  const handleClearSearch = () => {
    setSearchValue('')
    setIsSearched(false)
    setIsFocused(false)
    setSearchResults([])
  }

  // 검색 결과 클릭 → 부모 onSelect 통보 (있으면) + 자체 state 초기화 (dropdown 닫힘).
  const handleSelectResult = (result: AddressSearchItem) => {
    onSelect?.(result)
    setSearchValue('')
    setSearchResults([])
    setIsSearched(false)
    setIsFocused(false)
  }

  const renderRightIcon = () =>
    isSearched ? (
      <button
        type="button"
        onClick={handleClearSearch}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center"
        aria-label="검색 지우기"
      >
        <img
          src="/btc/btc_search-delete_normal_24x24.svg"
          alt=""
          width={24}
          height={24}
        />
      </button>
    ) : (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
        <img
          src="/btc/btc_search_normal_24x24.svg"
          alt="검색"
          width={24}
          height={24}
        />
      </div>
    )

  // ── 비활성 (Inactive) — 둥근 검색바 1줄 ──
  if (!isFocused) {
    return (
      <div
        className="absolute right-[56px] top-[20px] flex h-16 w-[360px] items-center gap-2 rounded-[99px] bg-white/10 backdrop-blur-[4px]"
        style={{ padding: '0 16px 0 24px', zIndex: 3000 }}
      >
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="주소 입력"
          className="flex-1 bg-transparent outline-none text-white placeholder:text-white placeholder:opacity-75"
          style={INPUT_STYLE}
        />
        {renderRightIcon()}
      </div>
    )
  }

  // ── 활성 (Active) — dropdown 패널 펼침 ──
  return (
    <div
      className="absolute right-[56px] top-[20px] flex w-[360px] flex-col rounded-[32px] backdrop-blur-[20px]"
      style={{
        background: 'rgba(0, 26, 56, 0.80)',
        boxShadow:
          '0 4px 20px 0 rgba(0, 0, 0, 0.12), 0 4px 8px 0 rgba(0, 0, 0, 0.08)',
        zIndex: 3000,
      }}
    >
      {/* 헤더 (input row) — padding 12/16/12/24, 콘텐츠 320×40 */}
      <div
        className="flex h-16 w-full items-center gap-2"
        style={{ padding: '12px 16px 12px 24px' }}
      >
        <input
          type="text"
          autoFocus
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="주소 입력"
          className="flex-1 bg-transparent outline-none text-white placeholder:text-white placeholder:opacity-75"
          style={INPUT_STYLE}
        />
        {renderRightIcon()}
      </div>
      {/* 1px 구분선 — W 328 (= 360 - 좌우 16) 중앙 정렬 */}
      <div className="mx-auto h-px w-[328px] bg-white/10" />

      {isSearched ? (
        <SearchResults
          results={searchResults}
          keyword={searchValue}
          onSelect={handleSelectResult}
        />
      ) : (
        <RecentSearches
          items={recentSearches}
          onClickItem={handleRecentClick}
          onRemoveItem={removeRecent}
          onClearAll={clearRecent}
        />
      )}
    </div>
  )
}

// ── 검색 결과 리스트 ──
function SearchResults({
  results,
  keyword,
  onSelect,
}: {
  results: AddressSearchItem[]
  keyword: string
  onSelect: (result: AddressSearchItem) => void
}) {
  return (
    <div
      className="flex w-full flex-col items-start gap-2"
      style={{ padding: '16px 20px 20px 20px' }}
    >
      <div
        className="scrollbar-custom flex h-[303px] w-full flex-col items-center gap-2 self-stretch overflow-y-auto rounded-2xl bg-white/5"
        style={{ padding: '12px' }}
      >
        {results.length === 0 ? (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontFamily: 'Roboto, system-ui, sans-serif',
              fontSize: '14px',
            }}
          >
            검색 결과가 없습니다
          </div>
        ) : (
          results.map((result) => {
            // id prefix 로 PLACE / ADDRESS 구분 (vworld.ts 에서 부여):
            // - place:*   → 건물명/POI → title=건물명 강조, sub=도로명 주소
            // - address:* → 도로명 주소 → title=도로명 강조, sub=지번
            const isPlace = result.id.startsWith('place:')
            const subText = isPlace ? result.roadAddress : result.parcelAddress
            return (
              <button
                type="button"
                key={result.id}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => onSelect(result)}
                className="h-[56px] w-[282px] shrink-0 rounded-lg text-left transition-colors hover:bg-white/[0.08]"
              >
                <div
                  className="flex h-full w-full flex-col items-start justify-center gap-[2px]"
                  style={{ padding: '10px 8px' }}
                >
                  <span
                    style={{
                      fontFamily: 'Roboto, system-ui, sans-serif',
                      fontSize: '18px',
                      fontWeight: 600,
                      lineHeight: '20px',
                      color: '#FFF',
                    }}
                  >
                    {highlightKeyword(result.title, keyword)}
                  </span>
                  {subText && (
                    <span
                      style={{
                        fontFamily: 'Roboto, system-ui, sans-serif',
                        fontSize: '14px',
                        fontWeight: 500,
                        lineHeight: '16px',
                        color: 'rgba(255, 255, 255, 0.65)',
                      }}
                    >
                      {/* 보조 주소에도 같은 키워드 강조 (건물명·주소 어느 쪽으로 찾아도 보이게). */}
                      {highlightKeyword(subText, keyword)}
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

// ── 최근 검색어 리스트 ──
function RecentSearches({
  items,
  onClickItem,
  onRemoveItem,
  onClearAll,
}: {
  items: readonly string[]
  onClickItem: (keyword: string) => void
  onRemoveItem: (keyword: string) => void
  onClearAll: () => void
}) {
  return (
    <div
      className="flex w-full flex-col items-start gap-2"
      style={{ padding: '16px 20px 20px 20px' }}
    >
      {/* 헤더 row — 좌측 '최근 검색어' 타이틀, 우측 '전체 삭제' 버튼.
          버튼은 검색어가 있을 때만 표출. mousedown preventDefault 로
          input blur 막아서 dropdown 닫히기 전에 click 처리. */}
      <div className="flex w-full items-center justify-between">
        <h3 className="text-b3" style={{ color: '#DCE6EE' }}>
          최근 검색어
        </h3>
        {items.length > 0 && (
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onClearAll}
            className="cursor-pointer transition-opacity hover:opacity-100"
            style={{
              color: 'rgba(255, 255, 255, 0.60)',
              fontFamily: 'Roboto',
              fontSize: '13px',
              fontWeight: 500,
              letterSpacing: '-0.2px',
              opacity: 0.7,
            }}
          >
            전체 삭제
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="flex h-[277px] w-full items-center justify-center self-stretch rounded-2xl border border-white/[0.15]">
          <p
            className="text-b2 text-center"
            style={{ color: 'rgba(255, 255, 255, 0.50)' }}
          >
            최근 검색어가 없습니다.
          </p>
        </div>
      ) : (
        <div
          className="scrollbar-custom flex h-[277px] w-full flex-col items-center gap-2 self-stretch overflow-y-auto rounded-2xl bg-white/5"
          style={{ padding: '12px' }}
        >
          {items.map((item) => (
            <div
              key={item}
              className="h-[49px] w-[282px] shrink-0 rounded-lg transition-colors hover:bg-white/[0.08]"
            >
              <div
                className="flex h-full w-full flex-col items-start justify-center gap-[10px]"
                style={{ padding: '4px 8px' }}
              >
                <div className="flex w-full items-center gap-2 self-stretch">
                  <button
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => onClickItem(item)}
                    className="flex flex-1 cursor-pointer flex-col items-start gap-1 text-left"
                  >
                    <span className="text-b3 text-white">{item}</span>
                  </button>
                  <button
                    type="button"
                    // mousedown preventDefault — input blur 막아 dropdown unmount 전에 click 처리.
                    onPointerDown={(e) => e.preventDefault()}
                    className="shrink-0 cursor-pointer opacity-50 transition-opacity hover:opacity-100"
                    aria-label={`${item} 삭제`}
                    onClick={() => onRemoveItem(item)}
                  >
                    <img
                      src="/ic/ic_delete_default_line_normal_white_24.svg"
                      alt=""
                      width={24}
                      height={24}
                    />
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
