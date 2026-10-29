package com.eseict.ulsan.earthquake.event;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import org.springframework.jdbc.core.RowMapper;

/**
 * 업체 {@code v_evt_all} 한 행 — 기상청 지진통보와 현장 트리거가 함께 온다.
 *
 * <p>{@code evtType} 은 {@code K}(기상청 통보) / {@code H}(현장 트리거)다
 * (2026-08-26 실DB 확인). 종류에 따라 비는 컬럼이 다르다:
 *
 * <ul>
 *   <li>기상청 통보 — {@code mag}/{@code lat}/{@code lon}/{@code originArea} 채워짐,
 *       {@code net}/{@code obsId}/{@code obsName}/{@code pgaVal} 은 null
 *   <li>현장 트리거 — 그 반대
 * </ul>
 *
 * <p>뷰가 {@code evtTime} 을 {@code datetime} 으로 이미 변환해서 준다 — 원본 테이블의
 * {@code VARCHAR(14)} 를 우리가 파싱할 필요가 없다.
 *
 * <p>{@code obsId} 는 계측시설 코드(예: {@code NG})다. 실시간 API 의 관측소
 * ({@code NGG}/{@code NGT}/…)보다 상위 단위라 {@code instrument} 와 직접 매핑되지 않는다.
 */
public record EventRow(
        String evtType,
        String evtId,
        LocalDateTime evtTime,
        String net,
        String obsId,
        String obsName,
        BigDecimal pgaVal,
        BigDecimal mag,
        BigDecimal lat,
        BigDecimal lon,
        String originArea,
        LocalDateTime regDate
) {

    static final RowMapper<EventRow> ROW_MAPPER = (rs, rowNum) -> new EventRow(
            rs.getString("evt_type"),
            rs.getString("evt_id"),
            toLocalDateTime(rs.getTimestamp("evt_time")),
            rs.getString("net"),
            rs.getString("obs_id"),
            rs.getString("obs_name"),
            rs.getBigDecimal("pga_val"),
            rs.getBigDecimal("mag"),
            rs.getBigDecimal("lat"),
            rs.getBigDecimal("lon"),
            rs.getString("origin_area"),
            toLocalDateTime(rs.getTimestamp("regdate"))
    );

    private static LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}
