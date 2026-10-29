package com.eseict.ulsan.slope.chart;

import com.eseict.ulsan.slope.ingest.BucketType;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * 차트 조회 범위. 화면 탭 4개에 대응한다.
 *
 * <p><b>시간·일·월 탭은 진행 중인 칸을 포함해 7칸</b>이다 (2026-09-30 사용자 요청) — 최근
 * 7시간, 7일, 7개월. 칸 경계에 맞춰 자르므로 첫 칸도 온전하다. 빈 칸 처리는 화면이 한다.
 *
 * <p>실시간 구간을 40분으로 잡은 건 화면 캡처 기준이다 — X축이 18:43~19:23 이었다.
 * 1분 원본을 5분 칸으로 묶는다.
 */
public enum ChartRange {

    /** 최근 40분, 5분 칸 */
    REALTIME(null, "15M"),
    /** 1시간 칸 7개 */
    HOUR(BucketType.HOUR, "60M"),
    /** 1일 칸 7개 */
    DAY(BucketType.DAY, "1D"),
    /** 1개월 칸 7개 */
    MONTH(BucketType.MONTH, null);

    /** 시간·일·월 탭의 칸 수. 진행 중인 칸을 포함한다. */
    public static final int POINTS = 7;

    private final BucketType bucketType;
    private final String rainWindow;

    ChartRange(BucketType bucketType, String rainWindow) {
        this.bucketType = bucketType;
        this.rainWindow = rainWindow;
    }

    /** 조회 시작 시각. 시간·일·월은 첫 칸의 시작이다. */
    public LocalDateTime from(LocalDateTime now) {
        return switch (this) {
            case REALTIME -> now.minus(REALTIME_LOOKBACK);
            case HOUR -> now.truncatedTo(ChronoUnit.HOURS).minusHours(POINTS - 1);
            case DAY -> now.truncatedTo(ChronoUnit.DAYS).minusDays(POINTS - 1);
            case MONTH -> now.truncatedTo(ChronoUnit.DAYS).withDayOfMonth(1).minusMonths(POINTS - 1);
        };
    }

    /**
     * 이 탭에서 쓸 강우량 임계 창. 없으면 null — 임계선을 그리지 않는다.
     *
     * <p>집계 단위와 창이 같아야 비교가 성립한다. 시간 탭의 막대는 1시간 합이라 60분 창과,
     * 일 탭은 1일 누적과 맞는다. <b>실시간은 5분 버킷이라 어느 창과도 안 맞아, 강우량만
     * 15분 이동합 선을 따로 그리고 거기에 15분 창을 건다.</b>
     *
     * <p>월 탭은 대응하는 창이 없다 — 업체 기준표의 최장이 2일이다.
     */
    public String rainWindow() {
        return rainWindow;
    }

    /** 강우량 실시간의 이동합 구간. 15분 창 임계값과 같은 단위가 되도록 맞춘다. */
    public static final Duration RAIN_ROLLING = Duration.ofMinutes(15);

    /** 실시간 조회 구간. */
    public static final Duration REALTIME_LOOKBACK = Duration.ofMinutes(40);

    /** 실시간 버킷 크기. 화면 기획이 5분 간격이다. */
    public static final Duration REALTIME_BUCKET = Duration.ofMinutes(5);

    /** null 이면 원본을 읽는다. */
    public BucketType bucketType() {
        return bucketType;
    }

    public boolean isRealtime() {
        return bucketType == null;
    }
}
