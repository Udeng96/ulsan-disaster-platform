package com.eseict.ulsan.slope.facility.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 계측기 행에 표시할 값 하나.
 *
 * <p>경사계는 X축·Y축 두 개가 나오고, 그 계측기가 토양함수비도 재면 함수비가 하나 더 붙는다.
 * 화면은 이 목록을 이어붙여 {@code -0.10° / -0.11° | 28.1%} 로 그린다. 가상시설0680처럼 함수비가
 * 없으면 자동으로 2개만 나온다 — 조건 분기가 필요 없다.
 *
 * @param observationItemId 이 값이 속한 관측항목. <b>차트를 부를 때 쓰는 id 다</b> —
 *                          {@code GET /api/observations/{observationItemId}/chart}.
 *                          계측기 하나가 관측항목 둘을 낼 수 있어(경사계+함수비) 계측기 id 로는
 *                          어느 차트인지 정할 수 없다
 * @param type     관측항목 종류 (INCLINOMETER / SOIL_MOISTURE / ROCKFALL_DETECTOR / RAIN_GAUGE)
 * @param unitType 업체 관측단위 코드
 * @param label    X축 / Y축 / 함수비 / 감지 / 강우량
 * @param level      이 관측항목의 단계. 같은 계측기라도 경사계와 함수비가 다를 수 있다
 * @param measuredAt 이 축의 측정 시각. <b>실시간 차트에 점을 이어붙일 때 쓴다</b> —
 *                   화면은 차트를 진입 시 한 번만 받고, 이후 여기서 오는 값을 끝에 밀어 넣는다.
 *                   계측기 레벨의 {@code lastMeasuredAt} 은 관측항목 둘 중 더 최근 것이라
 *                   축 하나의 시각으로 쓰기에 부정확할 수 있다
 */
public record InstrumentValue(
        Long observationItemId,
        String type,
        String unitType,
        String label,
        BigDecimal value,
        String unit,
        String level,
        LocalDateTime measuredAt
) {
}
