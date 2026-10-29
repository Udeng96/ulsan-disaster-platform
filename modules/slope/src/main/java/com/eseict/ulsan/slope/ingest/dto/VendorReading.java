package com.eseict.ulsan.slope.ingest.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 관측단위 하나의 최신값.
 *
 * @param crtclType 관측항목 단계. ERROR/ERROR2 면 갱신하지 않는다
 * @param unitType  U081/U082/U083/U040/U210/U010
 * @param msrDt     업체 측정 시각 (KST)
 */
public record VendorReading(
        Long obsvItemId,
        String crtclType,
        String unitType,
        BigDecimal val,
        LocalDateTime msrDt
) {
}
