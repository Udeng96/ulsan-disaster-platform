package kr.ulsan.broadcast.voice.terminal;

import java.math.BigDecimal;
import java.time.LocalDate;

/** 단말 1대 (지도 마커·목록·상세 공용). region 은 행정동 이름. 항목은 gis 응답과 같다. */
public record VoiceTerminalResponse(
        Long id,
        String terminalCode,
        String name,
        String layerCode,
        CommType commType,
        String phone,
        String address,
        BigDecimal lat,
        BigDecimal lng,
        LocalDate installedAt,
        String manufacturer,
        String model,
        String groupType,
        String region
) {
    /** 지도 레이어 코드. */
    public static final String LAYER_CODE = "BROADCAST";

    public static VoiceTerminalResponse from(VoiceTerminal t) {
        return new VoiceTerminalResponse(t.getId(), t.getTerminalCode(), t.getName(), LAYER_CODE, t.getCommType(),
                t.getPhone(), t.getAddress(), t.getLat(), t.getLng(), t.getInstalledAt(), t.getManufacturer(),
                t.getModel(), t.getGroupType(), t.getRegion() == null ? null : t.getRegion().getName());
    }
}
