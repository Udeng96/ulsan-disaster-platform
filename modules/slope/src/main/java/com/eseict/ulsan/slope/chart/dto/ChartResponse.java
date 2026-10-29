package com.eseict.ulsan.slope.chart.dto;

import java.util.List;

/**
 * 차트 응답.
 *
 * <p>같은 관측항목의 선들은 단위와 임계값이 같으므로 {@code unit}·{@code thresholds} 는
 * 응답 레벨에 한 번만 둔다.
 *
 * <p><b>막대 여부는 시리즈마다 다르다</b> ({@link ChartSeries#bar}). 강우량 실시간이 막대와
 * 선을 함께 쓰기 때문이다.
 *
 * @param unit  ° / % / 회 / mm. 모든 series 공통
 * @param range realtime / hour / day / month
 */
public record ChartResponse(
        Long observationItemId,
        String category,
        String unit,
        String range,
        List<ChartThreshold> thresholds,
        List<ChartSeries> series
) {
}
