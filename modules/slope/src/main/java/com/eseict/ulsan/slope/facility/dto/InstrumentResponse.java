package com.eseict.ulsan.slope.facility.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 계측 상세 화면의 목록 한 행 = 계측기 1대.
 *
 * @param category       목록 그룹 (INCLINOMETER / ROCKFALL_DETECTOR / RAIN_GAUGE).
 *                       없는 종류는 응답에 아예 안 나오므로 화면이 줄을 만들지 않는다
 * @param level          행 뱃지. 소속 관측항목 중 가장 나쁜 단계
 * @param lastMeasuredAt 마지막 수신 시각. <b>반드시 화면에 노출할 것</b> — 장애 시 값을
 *                       갱신하지 않고 직전 값을 유지하므로, 이게 없으면 41일 전 값과 1분 전
 *                       값을 구분할 수 없다
 */
public record InstrumentResponse(
        Long id,
        String displayName,
        String sourceName,
        String category,
        String level,
        LocalDateTime lastMeasuredAt,
        List<InstrumentValue> values,
        String spotNo,
        String address,
        java.math.BigDecimal lat,
        java.math.BigDecimal lng,
        LocalDateTime installedAt
) {
}
