package com.eseict.ulsan.slope.ingest.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 업체 {@code ews.obsv} + {@code ews.obsv_man} 한 행.
 *
 * @param spotNo  국가지점번호 ({@code obsv_man.spo_no_cd})
 * @param address 설치주소 ({@code obsv_man.dtl_adres})
 */
public record VendorInstrument(
        Long obsvId,
        Long zneId,
        String name,
        BigDecimal lat,
        BigDecimal lng,
        String spotNo,
        String address,
        LocalDateTime installedAt
) {
}
