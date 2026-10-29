package com.eseict.ulsan.gis.facility.pump.dto;

import com.eseict.ulsan.gis.facility.pump.EquipmentCategory;
import com.eseict.ulsan.gis.facility.pump.PumpEquipment;
import com.eseict.ulsan.gis.facility.pump.PumpStation;
import com.eseict.ulsan.gis.facility.pump.StatusPattern;
import java.math.BigDecimal;
import java.util.List;

/**
 * 펌프장 응답 — 마커 / 리스트 / 상세 한 endpoint 에서 다 사용.
 *
 * <p>장비는 화면 표출 대상 ({@code isDisplayed=true}) 만 포함. 화면 그룹화는 프론트가
 * {@code category} 기준으로 처리.
 */
public record PumpStationResponse(
        Long id,
        String name,
        String layerCode,
        BigDecimal lat,
        BigDecimal lng,
        String address,
        String drainageZone,
        String region,
        List<EquipmentItem> equipments
) {
    /** 이 도메인이 표시될 지도 레이어 코드. */
    public static final String LAYER_CODE = "PUMP_STATION";

    public record EquipmentItem(
            Long id,
            String name,
            EquipmentCategory category,
            StatusPattern statusPattern,
            Short state,
            BigDecimal value,
            Short priority
    ) {
        public static EquipmentItem from(PumpEquipment e) {
            return new EquipmentItem(
                    e.getId(),
                    e.getName(),
                    e.getCategory(),
                    e.getStatusPattern(),
                    e.getState(),
                    e.getValue(),
                    e.getPriority()
            );
        }
    }

    public static PumpStationResponse from(PumpStation ps) {
        List<EquipmentItem> equipments = ps.getEquipments().stream()
                .filter(PumpEquipment::isDisplayed)
                .map(EquipmentItem::from)
                .toList();
        return new PumpStationResponse(
                ps.getId(),
                ps.getName(),
                LAYER_CODE,
                ps.getLat(),
                ps.getLng(),
                ps.getAddress(),
                ps.getDrainageZone().getName(),
                ps.getRegion().getName(),
                equipments
        );
    }
}
