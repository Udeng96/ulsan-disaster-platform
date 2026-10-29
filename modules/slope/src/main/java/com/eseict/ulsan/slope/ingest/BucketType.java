package com.eseict.ulsan.slope.ingest;

import java.time.LocalDateTime;
import java.time.YearMonth;

/**
 * 집계 구간. 업체 {@code time_data} / {@code day_data} / {@code month_data} 에 대응한다.
 *
 * <p><b>{@code measuredCount} 의 의미가 구간마다 다르다</b> — 한 단계 아래 버킷의 개수다.
 * 이 enum 이 그 기준을 한 곳에 모아둔다. 실측으로 확인한 값이다.
 *
 * <table>
 *   <tr><th>구간</th><th>measuredCount</th><th>완전한 값</th></tr>
 *   <tr><td>HOUR</td><td>원본 1분값 건수</td><td>60</td></tr>
 *   <tr><td>DAY</td><td>집계된 시간 수</td><td>24</td></tr>
 *   <tr><td>MONTH</td><td>집계된 일 수</td><td>그 달의 일수</td></tr>
 * </table>
 *
 * <p>업체는 {@code year_data} 도 갖고 있으나 화면에 년 탭이 없어 가져오지 않는다. 필요해지면
 * 여기에 상수 하나만 더하면 된다 — 테이블 구조는 그대로다.
 */
public enum BucketType {

    HOUR("ews.time_data", 60),
    DAY("ews.day_data", 24),
    /** 완전 기준이 달마다 달라 상수로 못 둔다. {@link #expectedCount(LocalDateTime)} 를 쓸 것. */
    MONTH("ews.month_data", -1);

    private final String vendorTable;
    private final int expected;

    BucketType(String vendorTable, int expected) {
        this.vendorTable = vendorTable;
        this.expected = expected;
    }

    public String vendorTable() {
        return vendorTable;
    }

    /** 이 구간이 완전할 때의 {@code measuredCount}. */
    public int expectedCount(LocalDateTime bucket) {
        return this == MONTH ? YearMonth.from(bucket).lengthOfMonth() : expected;
    }

    /**
     * 신뢰할 만큼 채워진 구간인지.
     *
     * <p><b>기준값과 같기를 요구하지 않는다.</b> 실측해보면 정상 동작하는 센서도 시간당
     * 55~59건이 흔하다 — 1분 주기라도 몇 건씩 빠진다. {@code >= 60} 으로 잡으면 대부분이
     * 결측으로 분류돼 화면이 온통 회색이 된다.
     *
     * <p>반면 장애 구간은 확연히 다르다. 실측 샘플에서 장애 상태 센서는 시간당 2건이었다.
     * 그래서 {@link #COMPLETE_RATIO} 로 가른다.
     *
     * <p>화면에서 "값이 0" 과 "데이터 없음" 을 구분하는 근거다.
     */
    public boolean isComplete(int measuredCount, LocalDateTime bucket) {
        return measuredCount >= expectedCount(bucket) * COMPLETE_RATIO;
    }

    /**
     * 이 비율 이상 채워졌으면 정상으로 본다.
     *
     * <p>시간 기준 60건 × 0.8 = 48건. 실측상 정상 구간(55~60)은 통과하고 장애 구간(2건)은
     * 걸러진다.
     */
    private static final double COMPLETE_RATIO = 0.8;
}
