package com.eseict.ulsan.slope.ingest.dto;

import java.math.BigDecimal;

/**
 * 업체 기준표 한 행. 출처가 센서마다 다르다.
 *
 * <table>
 *   <tr><th>센서</th><th>테이블</th><th>값</th></tr>
 *   <tr><td>경사계</td><td>{@code stdr_surf_dsplmt}</td><td>{@code threshold_value}</td></tr>
 *   <tr><td>토양함수비</td><td>{@code stdr_soil_wtrrat}</td><td>{@code threshold_value}</td></tr>
 *   <tr><td>강우량</td><td>{@code stdr_rain_maxacc}</td><td>창별 4개</td></tr>
 *   <tr><td>낙석</td><td>{@code obsv_unit_crtcl}</td><td>{@code min_value}</td></tr>
 * </table>
 *
 * <p>조회 키가 {@code obsv_item_id} 인 것이 중요하다. 기준표에 {@code obsv_unit_id} 도 있지만
 * 우리는 그 값을 보관하지 않는다 — 관측항목의 업체 키와 축 코드만으로 찾을 수 있다.
 *
 * @param level      업체 {@code alarm_type} (INTEREST/ATTENTION/WARNING/DANGER)
 * @param timeWindow 강우량만 15M/60M/1D/2D. 그 외는 {@code "-"}
 */
public record VendorThreshold(
        Long obsvItemId,
        String unitType,
        String level,
        BigDecimal value,
        String timeWindow
) {
    /** 창이 없는 센서. */
    public static final String NO_WINDOW = "-";
}
