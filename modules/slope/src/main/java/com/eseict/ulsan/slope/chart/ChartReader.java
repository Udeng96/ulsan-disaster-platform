package com.eseict.ulsan.slope.chart;

import com.eseict.ulsan.slope.chart.dto.ChartPoint;
import com.eseict.ulsan.slope.facility.ObservationCategory;
import com.eseict.ulsan.slope.ingest.BucketType;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 차트 데이터 조회. <b>전부 업체 DB 에서 직접 읽는다</b> (2026-09-30 사용자 결정).
 *
 * <p><b>실시간·시간·일 탭은 1분 원본({@code obsv_data})에서 묶는다.</b> 업체 시·일 집계
 * ({@code time_data}·{@code day_data})에는 관측단위 인덱스가 없어 조회마다 테이블 전체를 훑는다
 * (시간 집계 352MB). 원본은 {@code (obsv_unit_id, msr_dt DESC)} 인덱스가 있어 한 단위의 구간만
 * 읽는다 — 일 탭 30일이 단위당 약 43,000행이다. 원본은 1년 보관이다.
 *
 * <p>월 탭만 업체 {@code month_data} 를 읽는다. 4,600행이라 인덱스 없이도 가볍다.
 *
 * <p>관측단위는 {@code (obsv_item_id, obsv_unit_type)} 로 찾는다. 결과는 {@link ChartService}
 * 가 캐시한다.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "slope.vendor.enabled", havingValue = "true")
public class ChartReader {

    @Qualifier("vendorJdbcTemplate")
    private final JdbcTemplate jdbc;

    /**
     * 한 관측단위의 1분 원본. 파라미터는 업체 관측항목 id, 축 코드, 시작 시각.
     *
     * <p><b>같은 측정 시각이 두 번 들어온 행이 있다</b> (등록 시각만 다르다). 그대로 합치면 강우량
     * 합계와 건수가 부풀어, 측정 시각마다 가장 늦게 등록된 행 하나만 쓴다.
     */
    private static final String RAW = """
            (SELECT DISTINCT ON (msr_dt) msr_dt, val
             FROM ews.obsv_data
             WHERE obsv_unit_id = (SELECT obsv_unit_id FROM ews.obsv_unit
                                   WHERE obsv_item_id = ? AND obsv_unit_type = ? LIMIT 1)
               AND msr_dt >= ?
             ORDER BY msr_dt, rgs_dt DESC) d""";

    private static final String UNIT = """
            (SELECT obsv_unit_id FROM ews.obsv_unit WHERE obsv_item_id = ? AND obsv_unit_type = ? LIMIT 1)""";

    /**
     * 경사계 0,0,0 이상치 제외. 같은 시각 같은 관측항목의 다른 축이 전부 0 인 0 값을 버린다.
     * 값이 0 인 행에만 하위 조회가 돌아 비용이 작다. 첫 파라미터는 업체 관측항목 id.
     */
    private static final String NOT_ZERO_OUTLIER = """
            AND NOT (d.val = 0 AND NOT EXISTS (
                SELECT 1 FROM ews.obsv_unit u2
                JOIN ews.obsv_data d2 ON d2.obsv_unit_id = u2.obsv_unit_id AND d2.msr_dt = d.msr_dt
                WHERE u2.obsv_item_id = ? AND d2.val <> 0))""";

    /**
     * 실시간 탭 — <b>1분 원본을 5분 버킷으로 묶는다.</b> 40분이면 9점이다.
     *
     * <p><b>묶는 방식이 센서마다 다르다.</b> 업체 {@code obsv_unit.obsv_agg_type} 을 따른다 —
     * 강우량만 합계이고 나머지는 평균이다. 평균은 경사계 0,0,0 이상치에 끌려 내려가므로 걸러낸다.
     *
     * <p>{@code complete} 는 5개 중 4개 이상 들어왔는지로 본다. 진행 중인 마지막 버킷은
     * 자연히 false 가 된다.
     */
    public List<ChartPoint> readRealtime(Long vendorItemId, String unitType, ObservationCategory category,
                                         LocalDateTime from) {
        boolean inclinometer = category == ObservationCategory.INCLINOMETER;
        String sql = """
                SELECT date_bin(INTERVAL '5 minutes', d.msr_dt, TIMESTAMP '2000-01-01') AS bucket,
                       %s AS v, count(*) AS n
                FROM %s
                WHERE true %s
                GROUP BY 1 ORDER BY 1
                """.formatted(category.accumulate() ? "sum(d.val)" : "avg(d.val)", RAW,
                inclinometer ? NOT_ZERO_OUTLIER : "");
        List<Object> args = new ArrayList<>(List.of(vendorItemId, unitType, from));
        if (inclinometer) {
            args.add(vendorItemId);
        }
        return jdbc.query(sql, (rs, n) -> new ChartPoint(
                rs.getTimestamp("bucket").toLocalDateTime(),
                rs.getBigDecimal("v"),
                rs.getInt("n") >= 4), args.toArray());
    }

    /**
     * 강우량 실시간의 두 번째 선 — <b>직전 15분 누적.</b>
     *
     * <p>5분 합계 막대는 업체 기준(15분 누적)과 단위가 달라 임계값과 비교할 수 없다. 같은 단위의
     * 선을 하나 더 그리고 임계선을 거기에 건다. 창은 버킷 수가 아니라 <b>시간</b>으로 잡는다.
     */
    public List<ChartPoint> readRainRolling(Long vendorItemId, String unitType, LocalDateTime from) {
        return jdbc.query("""
                SELECT bucket, sum(v) OVER (
                           ORDER BY bucket
                           RANGE BETWEEN INTERVAL '10 minutes' PRECEDING AND CURRENT ROW
                       ) AS rolling
                FROM (
                    SELECT date_bin(INTERVAL '5 minutes', d.msr_dt, TIMESTAMP '2000-01-01') AS bucket,
                           sum(d.val) AS v
                    FROM %s
                    GROUP BY 1
                ) b
                ORDER BY bucket
                """.formatted(RAW), (rs, n) -> new ChartPoint(
                rs.getTimestamp("bucket").toLocalDateTime(),
                rs.getBigDecimal("rolling"),
                true), vendorItemId, unitType, from);
    }

    /**
     * 시간·일 탭 — 1분 원본을 시·일 단위로 묶는다. 월 탭은 {@link #readMonthly}.
     *
     * <p><b>종류마다 뽑는 값이 다르다</b> ({@link ChartPoint} 참고). 강우량 합계, 경사계
     * {@code max(|값|)}, 그 외 최댓값. 경사계는 절댓값 최대라 0,0,0 이상치의 영향을 받지 않는다.
     *
     * <p>완결 판정은 원본 건수가 구간 분 수의 80% 이상인가다 ({@link BucketType} 과 같은 비율).
     */
    public List<ChartPoint> readAggregated(Long vendorItemId, String unitType, ObservationCategory category,
                                           BucketType bucketType, LocalDateTime from) {
        String unit = bucketType == BucketType.HOUR ? "hour" : "day";
        int expectedMinutes = bucketType == BucketType.HOUR ? 60 : 24 * 60;
        String sql = """
                SELECT date_trunc('%s', d.msr_dt) AS bucket, %s AS v, count(*) AS n
                FROM %s
                GROUP BY 1 ORDER BY 1
                """.formatted(unit, rawExpression(category), RAW);
        return jdbc.query(sql, (rs, n) -> new ChartPoint(
                rs.getTimestamp("bucket").toLocalDateTime(),
                rs.getBigDecimal("v"),
                rs.getInt("n") >= expectedMinutes * 0.8), vendorItemId, unitType, from);
    }

    /** 월 탭 — 업체 {@code month_data}. {@code msr_cnt} 는 집계된 일 수다. */
    public List<ChartPoint> readMonthly(Long vendorItemId, String unitType, ObservationCategory category,
                                        LocalDateTime from) {
        String sql = """
                SELECT a.msr_dt AS bucket, %s AS v, a.msr_cnt
                FROM ews.month_data a
                WHERE a.obsv_unit_id = %s AND a.msr_dt >= ?
                ORDER BY a.msr_dt
                """.formatted(monthExpression(category), UNIT);
        return jdbc.query(sql, (rs, n) -> {
            LocalDateTime bucket = rs.getTimestamp("bucket").toLocalDateTime();
            return new ChartPoint(bucket, rs.getBigDecimal("v"),
                    BucketType.MONTH.isComplete(rs.getInt("msr_cnt"), bucket));
        }, vendorItemId, unitType, from);
    }

    private String rawExpression(ObservationCategory category) {
        if (category.accumulate()) {
            return "sum(d.val)";
        }
        return category == ObservationCategory.INCLINOMETER ? "max(abs(d.val))" : "max(d.val)";
    }

    private String monthExpression(ObservationCategory category) {
        if (category.accumulate()) {
            return "a.msr_val";
        }
        return category == ObservationCategory.INCLINOMETER
                ? "GREATEST(abs(a.min_val), abs(a.max_val))"
                : "a.max_val";
    }
}
