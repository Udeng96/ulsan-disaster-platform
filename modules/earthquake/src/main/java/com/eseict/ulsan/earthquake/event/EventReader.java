package com.eseict.ulsan.earthquake.event;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 업체 DB({@code accdb}, MariaDB) 조회. <b>읽기 전용</b> — 남의 시스템이라 쓰지 않는다.
 *
 * <p>업체가 제공하는 것은 원본 테이블이 아니라 <b>뷰</b>다 (2026-08-26 확인).
 *
 * <ul>
 *   <li>{@code v_evt_kma}   — 기상청 지진통보
 *   <li>{@code v_evt_local} — 남구청 현장 트리거
 *   <li>{@code v_evt_all}   — 위 둘을 합친 것. {@code evt_type} 으로 구분
 * </ul>
 *
 * <b>{@code v_evt_all} 하나만 읽는다.</b> 두 이벤트를 대조하는 것이 목적이라 한 번에 시간순으로
 * 받는 편이 낫다.
 *
 * <p><b>기상청 뷰는 전국·해외 지진을 다 담는다</b> (북한·일본 포함). 지역으로 거르지 않는다 —
 * 먼 지진이 현장 트리거를 일으킨 경우 대조 대상이 사라지기 때문이다. 화면에서 필요하면 거른다.
 *
 * <p>뷰가 시각을 {@code datetime} 으로 변환해서 준다 — 원본의 {@code VARCHAR(14)} 를 우리가
 * 파싱하지 않는다.
 */
@Component
@ConditionalOnProperty(prefix = "earthquake.event", name = "polling", havingValue = "true")
public class EventReader {

    private static final String COLUMNS = """
            evt_type, evt_id, evt_time, net, obs_id, obs_name,
            pga_val, mag, lat, lon, origin_area, regdate
            """;

    /**
     * 증분 조회.
     *
     * <p>기준은 {@code regdate}(업체 등록시각)다. 발생시각으로 자르면 뒤늦게 등록된 이벤트를
     * 영영 놓친다 — 지진 발생보다 업체 등록이 늦기 때문.
     *
     * <p><b>{@code >=} 다 ({@code >} 아님).</b> 마지막 적재분과 같은 초에 나중에 등록된 이벤트를
     * {@code >} 로는 영영 놓친다. 경계의 행은 매번 다시 읽히지만 적재가 자연키 upsert 라
     * 중복이 쌓이지 않는다.
     */
    private static final String SELECT_SINCE = """
            SELECT %s FROM v_evt_all
            WHERE regdate >= ?
            ORDER BY regdate ASC
            """.formatted(COLUMNS);

    /** 최근 이벤트 — 업체 DB 를 눈으로 확인할 때. */
    private static final String SELECT_RECENT = """
            SELECT %s FROM v_evt_all
            ORDER BY regdate DESC
            LIMIT ?
            """.formatted(COLUMNS);

    /** 종류별 최근 이벤트. */
    private static final String SELECT_RECENT_BY_TYPE = """
            SELECT %s FROM v_evt_all
            WHERE evt_type = ?
            ORDER BY regdate DESC
            LIMIT ?
            """.formatted(COLUMNS);

    private final JdbcTemplate jdbcTemplate;

    /**
     * 업체 DB 전용 {@link JdbcTemplate} 을 명시적으로 주입받는다.
     * 우리 DB 용 JdbcTemplate 이 하나 더 있어 한정자 없이는 모호하다.
     */
    public EventReader(@Qualifier("eventSourceJdbcTemplate") JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** {@code since} 이후 등록된 이벤트를 등록순으로. */
    public List<EventRow> findRegisteredAfter(LocalDateTime since) {
        return jdbcTemplate.query(SELECT_SINCE, EventRow.ROW_MAPPER, since);
    }

    /** 최근 이벤트 — 확인용. */
    public List<EventRow> findRecent(int limit) {
        return jdbcTemplate.query(SELECT_RECENT, EventRow.ROW_MAPPER, limit);
    }

    /** 종류별 최근 이벤트 — 확인용. */
    public List<EventRow> findRecentByType(String evtType, int limit) {
        return jdbcTemplate.query(SELECT_RECENT_BY_TYPE, EventRow.ROW_MAPPER, evtType, limit);
    }
}
