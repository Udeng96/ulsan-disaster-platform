// 날짜·시간 표시 (화면 공통).

// HH:MM 포맷 (ISO offset string → 로컬 시간)
export function fmtHHMM(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// "YYYY년 M월 D일 요일" 포맷 (예: "2026년 6월 16일 화요일")
export function fmtKoDate(d: Date): string {
  const days = [
    '일요일',
    '월요일',
    '화요일',
    '수요일',
    '목요일',
    '금요일',
    '토요일',
  ]
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}`
}

// "오후 HH:MM" / "오전 HH:MM" 포맷 — 메리디엠 / 시간 분리해 반환.
export function fmtKoTime(d: Date): { meridiem: string; time: string } {
  const h = d.getHours()
  const meridiem = h < 12 ? '오전' : '오후'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const time = `${String(h12).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return { meridiem, time }
}
