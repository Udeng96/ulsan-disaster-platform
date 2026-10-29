package com.eseict.ulsan.slope.chart.dto;

import java.util.List;

/**
 * 차트에 그릴 선 하나.
 *
 * <p>경사계는 2개(X축·Y축)가 온다. 업체 판정이 두 축을 함께 보므로 X만 그리면 차트는 임계선
 * 아래인데 뱃지는 관심인 계측기가 생긴다.
 *
 * <p>강우량 실시간도 2개다 — 5분 합계 막대와 15분 이동합 선. <b>순서는 항상
 * [막대, 선] 으로 고정한다.</b>
 *
 * @param unitType 업체 관측단위 코드 (U081/U082/U040/U210/U010)
 * @param label    X축 / Y축 / 함수비 / 감지 / 5분 강우량 / 15분 누적
 * @param bar      true 면 막대. 강우량 집계가 ACCUMULATE 라 누적 구간을 막대로 본다
 */
public record ChartSeries(
        String unitType,
        String label,
        boolean bar,
        List<ChartPoint> points
) {
}
