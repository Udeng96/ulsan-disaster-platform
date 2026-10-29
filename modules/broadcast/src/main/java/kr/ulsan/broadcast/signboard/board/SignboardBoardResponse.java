package kr.ulsan.broadcast.signboard.board;

import java.math.BigDecimal;

/** 전광판 1대 (지도 마커·목록 공용). region 은 행정동 이름. 항목은 gis 응답과 같다. */
public record SignboardBoardResponse(
        Long id,
        String name,
        String layerCode,
        String address,
        String host,
        BigDecimal lat,
        BigDecimal lng,
        String region
) {
    /** 지도 레이어 코드. */
    public static final String LAYER_CODE = "SIGNBOARD";

    public static SignboardBoardResponse from(SignboardBoard b) {
        return new SignboardBoardResponse(b.getId(), b.getName(), LAYER_CODE, b.getAddress(), b.getHost(),
                b.getLat(), b.getLng(), b.getRegion() == null ? null : b.getRegion().getName());
    }
}
