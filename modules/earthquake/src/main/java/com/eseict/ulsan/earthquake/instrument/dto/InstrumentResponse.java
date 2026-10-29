package com.eseict.ulsan.earthquake.instrument.dto;

import com.eseict.ulsan.earthquake.instrument.Instrument;
import java.math.BigDecimal;

/**
 * 지진 계측기 단건 응답.
 *
 * <p>{@code net}+{@code obs} 는 실시간 API 매핑 키라 그대로 내려준다. 좌표는 현재 4대 전건이
 * 남구청 위치 임시값이다.
 */
public record InstrumentResponse(
        Long id,
        String stationCode,
        String net,
        String obs,
        String installLocation,
        String axis,
        String modelName,
        String serialNo,
        String connectionType,
        BigDecimal lat,
        BigDecimal lng
) {
    public static InstrumentResponse from(Instrument i) {
        return new InstrumentResponse(
                i.getId(),
                i.getStationCode(),
                i.getNet(),
                i.getObs(),
                i.getInstallLocation(),
                i.getAxis(),
                i.getModelName(),
                i.getSerialNo(),
                i.getConnectionType(),
                i.getLat(),
                i.getLng()
        );
    }
}
