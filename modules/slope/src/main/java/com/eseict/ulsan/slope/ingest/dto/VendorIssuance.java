package com.eseict.ulsan.slope.ingest.dto;

import java.time.LocalDateTime;

/**
 * 업체 발령 기록 한 건 ({@code ews.snr_isnc_log} 의 ISSUANCE).
 *
 * <p>2년간 2건뿐이라 전건을 한 번에 가져와 메모리에서 대조한다.
 *
 * @param zoneVendorId 업체 {@code zne_id}
 * @param level        발령된 단계 ({@code snr_now_state})
 * @param issuer       발령자 이름 ({@code usr_nm})
 */
public record VendorIssuance(
        Long zoneVendorId,
        String level,
        LocalDateTime issuedAt,
        String issuer
) {
}
