package com.eseict.ulsan.slope.ingest.dto;

import java.math.BigDecimal;

/** 업체 {@code ews.zne} 한 행. */
public record VendorZone(
        Long zneId,
        String name,
        String address,
        String legalDongCode,
        BigDecimal lat,
        BigDecimal lng,
        Integer gridX,
        Integer gridY,
        String crtclType
) {
}
