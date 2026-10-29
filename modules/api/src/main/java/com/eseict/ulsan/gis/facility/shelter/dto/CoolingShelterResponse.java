package com.eseict.ulsan.gis.facility.shelter.dto;

import com.eseict.ulsan.gis.facility.shelter.CoolingShelter;
import java.math.BigDecimal;

/**
 * 무더위쉼터 응답 — 마커 / 리스트 / 상세 한 endpoint 에서 사용.
 */
public record CoolingShelterResponse(
        Long id,
        String name,
        String layerCode,
        String roadAddress,
        String parcelDetail,
        BigDecimal lat,
        BigDecimal lng,
        String region,
        String facilityType,
        Integer capacity,
        String weekdayOpen,
        String weekdayClose
) {
    /** 이 도메인이 표시될 지도 레이어 코드. */
    public static final String LAYER_CODE = "SHELTER";

    public static CoolingShelterResponse from(CoolingShelter s) {
        return new CoolingShelterResponse(
                s.getId(),
                s.getName(),
                LAYER_CODE,
                s.getRoadAddress(),
                s.getParcelDetail(),
                s.getLat(),
                s.getLng(),
                s.getRegion() == null ? null : s.getRegion().getName(),
                s.getFacilityType(),
                s.getCapacity(),
                s.getWeekdayOpen(),
                s.getWeekdayClose()
        );
    }
}
