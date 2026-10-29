package com.eseict.ulsan.slope.ledger.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 안전데이터 급경사지 목록(DSSP-IF-10158) 한 건.
 *
 * <p>응답 필드가 30개가 넘지만 대장 동기화에 쓰는 것만 매핑한다 (나머지는 무시).
 * 좌표는 도·분·초가 컬럼 3개로 쪼개져 있어 {@link #lat()} / {@link #lng()} 에서 십진도로 합친다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record LedgerItem(
        @JsonProperty("SCAR_MNG_NO") String mgmtNo,
        @JsonProperty("SCAR_NM") String name,
        @JsonProperty("STDG_CD_1") String legalDongCode,
        @JsonProperty("JRSD_DEPT_NM") String deptName,
        /** 삭제 여부. 'Y' 면 폐지된 급경사지. */
        @JsonProperty("DEL_YN") String deleted,

        @JsonProperty("GIS_CRTS_POTI_LAT_PROVIN") String latDeg,
        @JsonProperty("GIS_CRTS_POTI_LAT_MIN") String latMin,
        @JsonProperty("GIS_CRTS_POTI_LAT_SEC_1") BigDecimal latSec,
        @JsonProperty("GIS_CRTS_POTI_LOT_PROVIN") String lngDeg,
        @JsonProperty("GIS_CRTS_POTI_LOT_MIN") String lngMin,
        @JsonProperty("GIS_CRTS_POTI_LOT_SEC_1") BigDecimal lngSec
) {

    /** 위도 (십진도). 도·분·초 중 하나라도 없으면 null. */
    public BigDecimal lat() {
        return toDecimal(latDeg, latMin, latSec);
    }

    /** 경도 (십진도). */
    public BigDecimal lng() {
        return toDecimal(lngDeg, lngMin, lngSec);
    }

    public boolean isDeleted() {
        return "Y".equalsIgnoreCase(deleted);
    }

    /** 도 + 분/60 + 초/3600. slope.managed_area 의 NUMERIC(10,7) 에 맞춰 7자리로 자른다. */
    private static BigDecimal toDecimal(String deg, String min, BigDecimal sec) {
        if (deg == null || deg.isBlank() || min == null || min.isBlank() || sec == null) {
            return null;
        }
        try {
            return new BigDecimal(deg.trim())
                    .add(new BigDecimal(min.trim()).divide(BigDecimal.valueOf(60), 10, RoundingMode.HALF_UP))
                    .add(sec.divide(BigDecimal.valueOf(3600), 10, RoundingMode.HALF_UP))
                    .setScale(7, RoundingMode.HALF_UP);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
