package com.eseict.ulsan.gis.facility.air.dto;

import com.eseict.ulsan.gis.facility.air.AirStation;
import com.eseict.ulsan.gis.facility.air.NetworkType;
import java.math.BigDecimal;

/**
 * 대기질 측정소 응답 — 마커 / 리스트용.
 */
public record AirStationResponse(
        Long id,
        String name,
        String layerCode,
        NetworkType networkType,
        String location,
        String address,
        BigDecimal lat,
        BigDecimal lng,
        String region
) {
    /** 이 도메인이 표시될 지도 레이어 코드. */
    public static final String LAYER_CODE = "AIR_QUALITY";

    public static AirStationResponse from(AirStation s) {
        return new AirStationResponse(
                s.getId(),
                s.getName(),
                LAYER_CODE,
                s.getNetworkType(),
                s.getLocation(),
                s.getAddress(),
                s.getLat(),
                s.getLng(),
                s.getRegion() == null ? null : s.getRegion().getName()
        );
    }
}
