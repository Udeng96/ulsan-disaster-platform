package com.eseict.ulsan.slope.ingest;

import com.eseict.ulsan.slope.ingest.dto.VendorInstrument;
import com.eseict.ulsan.slope.ingest.dto.VendorItem;
import com.eseict.ulsan.slope.ingest.dto.VendorIssuance;
import com.eseict.ulsan.slope.ingest.dto.VendorReading;
import com.eseict.ulsan.slope.ingest.dto.VendorThreshold;
import com.eseict.ulsan.slope.ingest.dto.VendorZone;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 업체 상시계측 DB 조회. 읽기 전용이다.
 *
 * <p><b>시각 주의</b> — 업체 {@code msr_dt} 는 TZ 없는 {@code timestamp} 에 KST 로 저장돼
 * 있는데 DB 세션은 UTC 다. SQL 의 {@code now()} 를 쓰면 9시간 어긋나므로, 애플리케이션에서
 * 계산한 {@link LocalDateTime} 을 항상 파라미터로 넘긴다.
 *
 * <p>업체 DB 는 망연계 너머에 있다. 조회 횟수를 늘리지 않도록 한 번에 전건을 가져오고,
 * 커넥션 풀 상한(5)으로 동시 쿼리 수에 구조적 상한을 둔다.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "slope.vendor.enabled", havingValue = "true")
public class VendorReader {

    @Qualifier("vendorJdbcTemplate")
    private final JdbcTemplate jdbc;

    // ------------------------------------------------------------------ 마스터

    /** 급경사지 3곳. */
    public List<VendorZone> readZones() {
        return jdbc.query("""
                SELECT zne_id, dsname, dsaddr, bdong_cd, lat, lon, grid_x, grid_y, crtcl_type
                FROM ews.zne
                ORDER BY zne_id
                """, (rs, n) -> new VendorZone(
                rs.getLong("zne_id"),
                rs.getString("dsname"),
                rs.getString("dsaddr"),
                rs.getString("bdong_cd"),
                rs.getBigDecimal("lat"),
                rs.getBigDecimal("lon"),
                (Integer) rs.getObject("grid_x"),
                (Integer) rs.getObject("grid_y"),
                rs.getString("crtcl_type")));
    }

    /**
     * 계측기 48대. {@code obsv_man} 을 조인해 국가지점번호·설치주소를 함께 가져온다.
     *
     * <p>{@code obsv_man} 은 1:1 이고 우리가 쓰는 것이 두 컬럼뿐이라 별도 자원으로 다루지 않는다.
     */
    public List<VendorInstrument> readInstruments() {
        return jdbc.query("""
                SELECT o.obsv_id, o.zne_id, o.obsv_nm, o.lat, o.lon, o.rgs_dt,
                       m.spo_no_cd, m.dtl_adres
                FROM ews.obsv o
                LEFT JOIN ews.obsv_man m ON m.obsv_id = o.obsv_id
                ORDER BY o.obsv_id
                """, (rs, n) -> new VendorInstrument(
                rs.getLong("obsv_id"),
                rs.getLong("zne_id"),
                rs.getString("obsv_nm"),
                rs.getBigDecimal("lat"),
                rs.getBigDecimal("lon"),
                rs.getString("spo_no_cd"),
                rs.getString("dtl_adres"),
                toLocalDateTime(rs.getTimestamp("rgs_dt"))));
    }

    /**
     * 관측항목 70개. 단위(°/%/회/mm)는 {@code obsv_unit} 에 있는데 한 항목의 축들이 모두
     * 같은 단위라 {@code min()} 으로 하나만 집는다.
     */
    public List<VendorItem> readItems() {
        return jdbc.query("""
                SELECT i.obsv_item_id, i.obsv_id, i.obsv_item_nm, i.use_yn,
                       min(u.unit) AS unit
                FROM ews.obsv_item i
                JOIN ews.obsv_unit u ON u.obsv_item_id = i.obsv_item_id
                GROUP BY i.obsv_item_id, i.obsv_id, i.obsv_item_nm, i.use_yn
                ORDER BY i.obsv_item_id
                """, (rs, n) -> new VendorItem(
                rs.getLong("obsv_item_id"),
                rs.getLong("obsv_id"),
                rs.getString("obsv_item_nm"),
                rs.getString("unit"),
                rs.getBoolean("use_yn")));
    }

    /**
     * 임계값 기준표. <b>센서마다 출처가 다르다</b> (2026-09-08 업체 답변).
     *
     * <table>
     *   <tr><th>센서</th><th>테이블</th><th>비고</th></tr>
     *   <tr><td>경사계</td><td>{@code stdr_surf_dsplmt}</td><td>값 하나</td></tr>
     *   <tr><td>토양함수비</td><td>{@code stdr_soil_wtrrat}</td><td>값 하나</td></tr>
     *   <tr><td>강우량</td><td>{@code stdr_rain_maxacc}</td><td><b>창이 4개</b></td></tr>
     *   <tr><td>낙석</td><td>{@code obsv_unit_crtcl}</td><td>구간의 하한</td></tr>
     * </table>
     *
     * <p>낙석은 행안부 연계 대상이 아니라 업체가 따로 관리한다. {@code obsv_unit_crtcl} 은
     * {@code [min, max)} 구간이라 <b>하한을 임계값으로 쓴다</b> — 그 단계에 들어가는 지점이
     * 되어 {@code stdr_*} 의 {@code threshold_value} 와 같은 의미가 된다. 정상(0~100) 구간은
     * 임계선이 아니라 제외한다.
     *
     * <p>{@code obsv_unit_crtcl} 에는 경사계·함수비도 들어 있으나 쓰지 않는다. 같은 항목의
     * 값이 {@code stdr_*} 와 어긋나기 때문이다 — 경계가 0.9 대 1.2 다. 어느 쪽이 실제 판정
     * 기준인지 업체에 확인 중이라 기존 출처를 유지한다 (deploy/미결사항.md A-2c).
     */
    public List<VendorThreshold> readThresholds() {
        return jdbc.query("""
                SELECT obsv_item_id, obsv_unit_type, alarm_type, threshold_value, '-' AS time_window
                FROM ews.stdr_surf_dsplmt
                WHERE use_yn = true AND obsv_item_id IS NOT NULL
                UNION ALL
                SELECT obsv_item_id, obsv_unit_type, alarm_type, threshold_value, '-'
                FROM ews.stdr_soil_wtrrat
                WHERE use_yn = true AND obsv_item_id IS NOT NULL
                UNION ALL
                SELECT u.obsv_item_id, u.obsv_unit_type, c.crtcl_type, c.min_value::numeric, '-'
                FROM ews.obsv_unit_crtcl c
                JOIN ews.obsv_unit u ON u.obsv_unit_id = c.obsv_unit_id
                WHERE u.obsv_unit_type = 'U210' AND c.crtcl_type <> 'NORMAL'
                UNION ALL
                SELECT obsv_item_id, obsv_unit_type, alarm_type, "15m_max",  '15M'
                FROM ews.stdr_rain_maxacc WHERE use_yn = true AND obsv_item_id IS NOT NULL
                UNION ALL
                SELECT obsv_item_id, obsv_unit_type, alarm_type, "60m_max",  '60M'
                FROM ews.stdr_rain_maxacc WHERE use_yn = true AND obsv_item_id IS NOT NULL
                UNION ALL
                SELECT obsv_item_id, obsv_unit_type, alarm_type, "1day_acc", '1D'
                FROM ews.stdr_rain_maxacc WHERE use_yn = true AND obsv_item_id IS NOT NULL
                UNION ALL
                SELECT obsv_item_id, obsv_unit_type, alarm_type, "2day_acc", '2D'
                FROM ews.stdr_rain_maxacc WHERE use_yn = true AND obsv_item_id IS NOT NULL
                """, (rs, n) -> new VendorThreshold(
                rs.getLong("obsv_item_id"),
                rs.getString("obsv_unit_type"),
                rs.getString("alarm_type"),
                rs.getBigDecimal("threshold_value"),
                rs.getString("time_window")));
    }

    /**
     * 발령 기록 전건. 우리 단계 변화 이력에 발령 여부를 채우는 데 쓴다.
     *
     * <p>남구 2년간 2건이라 전건을 가져와도 부담이 없다. 해제(CLEAR)는 빠진다 —
     * 우리가 대조하려는 것은 "이 단계 변화가 발령으로 이어졌는가" 이기 때문이다.
     */
    public List<VendorIssuance> readIssuances() {
        return jdbc.query("""
                SELECT zne_id, snr_now_state, rgs_dt, usr_nm
                FROM ews.snr_isnc_log
                WHERE snr_isnc_type = 'ISSUANCE' AND zne_id IS NOT NULL
                ORDER BY rgs_dt
                """, (rs, n) -> new VendorIssuance(
                rs.getLong("zne_id"),
                rs.getString("snr_now_state"),
                rs.getTimestamp("rgs_dt").toLocalDateTime(),
                rs.getString("usr_nm")));
    }

    // ------------------------------------------------------------------ 화면 직접 조회

    /**
     * 지구 상태 — {@code zne_snr.zne_state}.
     *
     * <p><b>업체가 지정한 지구 현재 상태다</b> (2026-09-30 답변). {@code zne.crtcl_type} 은
     * 실시간 갱신이 아니다. 자동 발령 지구는 임계 10분 초과 시 시스템이, 담당자 발령 지구는
     * 담당자가 발령할 때 바뀐다.
     *
     * @return 업체 지구 id → 단계 코드
     */
    public java.util.Map<Long, String> readZoneStates(List<Long> zoneIds) {
        java.util.Map<Long, String> result = new java.util.HashMap<>();
        jdbc.query("""
                SELECT zne_id, zne_state FROM ews.zne_snr WHERE zne_id IN (%s)
                """.formatted(placeholders(zoneIds)),
                rs -> {
                    result.put(rs.getLong("zne_id"), rs.getString("zne_state"));
                }, zoneIds.toArray());
        return result;
    }

    /**
     * 관측단위별 <b>최근 2건</b> + 관측항목 단계. 계측 상세 화면이 읽는다.
     *
     * <p>2건인 이유 — 최신 행이 경사계 0,0,0 이상치일 수 있어 그 직전 행으로 대신한다
     * ({@code SlopeAreaService#latestByItem}). 같은 측정 시각이 두 번 등록된 행이 있어 시각별
     * 하나로 줄인다. 인덱스 {@code (obsv_unit_id, msr_dt DESC)} 를 그대로 탄다.
     *
     * <p>값이 한 번도 없는 단위도 단계는 필요해 {@code LEFT JOIN} 한다 — 그때 {@code val}·
     * {@code msrDt} 는 null.
     */
    public List<VendorReading> readRecent(List<Long> zoneIds) {
        return jdbc.query("""
                SELECT i.obsv_item_id, i.crtcl_type, u.obsv_unit_type, d.val, d.msr_dt
                FROM ews.obsv_item i
                JOIN ews.obsv o ON o.obsv_id = i.obsv_id
                JOIN ews.obsv_unit u ON u.obsv_item_id = i.obsv_item_id
                LEFT JOIN LATERAL (
                    SELECT DISTINCT ON (d.msr_dt) val, msr_dt
                    FROM ews.obsv_data d
                    WHERE d.obsv_unit_id = u.obsv_unit_id
                      AND d.msr_dt IS NOT NULL
                    ORDER BY d.msr_dt DESC, d.rgs_dt DESC
                    LIMIT 2
                ) d ON true
                WHERE o.zne_id IN (%s)
                """.formatted(placeholders(zoneIds)), VendorReader::mapReading, zoneIds.toArray());
    }

    private static String placeholders(List<?> values) {
        return String.join(",", java.util.Collections.nCopies(values.size(), "?"));
    }

    // ------------------------------------------------------------------ 공통

    private static VendorReading mapReading(java.sql.ResultSet rs, int n) throws java.sql.SQLException {
        return new VendorReading(
                rs.getLong("obsv_item_id"),
                rs.getString("crtcl_type"),
                rs.getString("obsv_unit_type"),
                rs.getBigDecimal("val"),
                toLocalDateTime(rs.getTimestamp("msr_dt")));
    }

    private static LocalDateTime toLocalDateTime(java.sql.Timestamp ts) {
        return ts == null ? null : ts.toLocalDateTime();
    }
}
