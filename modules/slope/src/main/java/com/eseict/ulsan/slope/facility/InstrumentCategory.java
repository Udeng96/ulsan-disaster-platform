package com.eseict.ulsan.slope.facility;

/**
 * 계측기 종류 — 3가지.
 *
 * <p><b>토양함수비는 여기 없다.</b> 별도 장비가 아니라 경사계의 관측항목이기 때문이다.
 * 경사계 38대 중 22대가 토양함수비도 잰다 (삼익 8 + 우주 14, 가상시설0680은 없음).
 * 관측항목 단위 종류는 {@link ObservationCategory} 를 쓴다.
 *
 * <p>업체 {@code obsv.ordr} 이 1/3/4 로 종류와 정확히 대응하지만, 매뉴얼에는 "순서"로만
 * 적혀 있어 의미를 보장할 수 없다. 그래서 <b>판정은 {@code obsv_item.obsv_item_nm} 으로</b>
 * 한다 — 그쪽은 이름이 직접 적혀 있다.
 */
public enum InstrumentCategory {

    /** 경사계. 화면·지도 범례에서는 "계측기"로 표기된다. */
    INCLINOMETER("경사계"),
    ROCKFALL_DETECTOR("낙석"),
    RAIN_GAUGE("강우량계");

    private final String vendorName;

    InstrumentCategory(String vendorName) {
        this.vendorName = vendorName;
    }

    /** 업체 {@code obsv_item.obsv_item_nm} 표기. */
    public String vendorName() {
        return vendorName;
    }

    /**
     * 업체 관측항목명 → 계측기 종류.
     *
     * <p>토양함수비는 경사계 장비가 내는 값이므로 {@code INCLINOMETER} 로 접힌다.
     *
     * @return 대응하는 종류. 모르는 이름이면 null
     */
    public static InstrumentCategory ofVendorItem(String obsvItemNm) {
        if (obsvItemNm == null) {
            return null;
        }
        return switch (obsvItemNm) {
            case "경사계", "토양함수비" -> INCLINOMETER;
            case "낙석" -> ROCKFALL_DETECTOR;
            case "강우량계" -> RAIN_GAUGE;
            default -> null;
        };
    }
}
