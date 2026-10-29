package com.eseict.ulsan.slope.facility.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 급경사지 하나 + 소속 계측기.
 *
 * <p>계측 상세 화면의 가운데 패널이 이 구조다 — 급경사지 이름 아래에 종류별로 묶인 계측기.
 *
 * @param grade D / E. 업체가 주지 않아 우리가 관리한다. 아직 비어 있다
 * @param level 현재 상태. 소속 관측항목 중 가장 나쁜 단계다
 * @param lastMeasuredAt 소속 관측항목이 마지막으로 값을 보낸 시각.
 *                       장애여도 {@code level} 은 직전 값을 유지하므로 신선도는 이것으로 본다
 */
public record AreaResponse(
        Long id,
        String name,
        String address,
        BigDecimal lat,
        BigDecimal lng,
        String grade,
        String level,
        LocalDateTime lastMeasuredAt,
        List<InstrumentResponse> instruments
) {
}
