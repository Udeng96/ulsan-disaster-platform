package kr.ulsan.broadcast;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 테스트용 행정동·단말·전광판 데이터 (운영은 DB 에 직접 넣는 데이터).
 * 테스트 DB(H2)는 엔티티 기준으로 만들어지므로 테이블 이름 앞에 hibernate 기본 스키마를 붙인다.
 */
public final class FacilityFixture {

    private FacilityFixture() {
    }

    public static void reset(JdbcTemplate jdbc, String schema) {
        jdbc.update("DELETE FROM " + schema + ".voice_terminal");
        jdbc.update("DELETE FROM " + schema + ".signboard_board");
        jdbc.update("DELETE FROM common.region");
        jdbc.update("INSERT INTO common.region (id, name) VALUES (5, '달동'), (7, '삼호동')");
        jdbc.update("INSERT INTO " + schema + ".voice_terminal (id, terminal_code, name, comm_type, phone, address, lat, lng,"
                + " installed_at, manufacturer, model, group_type, region_id) VALUES"
                + " (1, 'SGB129', '가상시설0003', 'BROADCAST_CDMA', '012-3332-2330', '가상시설0706', 0.0, 0.0,"
                + " DATE '2021-07-27', '세기미래기술', 'SGA-IC30', '경로당', 5),"
                + " (2, 'SGB200', '가상시설0322', 'BROADCAST_DATA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '예비단말기', NULL)");
        jdbc.update("INSERT INTO " + schema + ".signboard_board (id, name, address, host, lat, lng, region_id) VALUES"
                + " (1, '가상시설0528', '가상시설0596', '가상시설0210', 0.0, 0.0, 5),"
                + " (2, '가상시설0433', '가상시설0593', '가상시설0208', 0.0, 0.0, 7),"
                + " (3, '가상시설0692', '가상시설0562', NULL, 0.0, 0.0, NULL),"
                + " (4, '가상시설0303', '가상시설0603', '가상시설0207', 0.0, 0.0, NULL)");
    }
}
