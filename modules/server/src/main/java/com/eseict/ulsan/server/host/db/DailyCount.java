package com.eseict.ulsan.server.host.db;

/**
 * 표 하나의 오늘 줄 (host_db_daily). 순수 계산 — DB 를 모른다.
 * 오늘 들어온 행 = carried + (last − base).
 */
public record DailyCount(long base, long last, long carried) {

    /** 그날 처음 본 표: 지금 누적을 기준으로 잡는다 (0시 이전에 들어온 건 안 셈). */
    public static DailyCount first(long current) {
        return new DailyCount(current, current, 0);
    }

    /** 새로 읽은 누적을 반영. 누적이 줄었으면 DB 재시작(통계 초기화) — 그때까지 센 만큼 넘기고 0 부터. */
    public DailyCount next(long current) {
        if (current < last) return new DailyCount(0, current, carried + (last - base));
        return new DailyCount(base, current, carried);
    }

    public long today() {
        return carried + (last - base);
    }
}
