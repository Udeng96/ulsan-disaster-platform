package com.eseict.ulsan.slope.chart.dto;

import java.math.BigDecimal;

/**
 * 임계값 가로선.
 *
 * <p>경사계(0.3/0.6/0.9/1.7°)와 토양함수비(20/32.5/35/45%)만 있다. 낙석은 업체에 기준표
 * 자체가 없고, 강우량은 테이블은 있으나 비어 있다 (deploy/업체-질문.md 2번).
 *
 * @param level 화면 표기 (관심/주의/경계/심각)
 */
public record ChartThreshold(
        String level,
        BigDecimal value
) {
}
