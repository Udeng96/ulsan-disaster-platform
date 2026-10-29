package com.eseict.ulsan.slope.facility;

import java.util.List;

/**
 * 관측항목 종류 — 4가지. 값과 단계가 붙는 단위다.
 *
 * <p>{@link InstrumentCategory}(계측기 3종)와 다르다. 경사계 1대가 경사계·토양함수비 두
 * 관측항목을 내므로, 여기만 4종이다. 지도 범례가 4종인 것도 이 단위다.
 *
 * <p>종류마다 차트가 다르다.
 * <ul>
 *   <li>축 개수 — 경사계만 3축(U081/U082/U083), 나머지 1축</li>
 *   <li>집계 — 강우량만 누적, 나머지 평균</li>
 *   <li>차트 모양 — 강우량만 막대, 나머지 선</li>
 *   <li>임계선 — 경사계·토양함수비만 있다. 낙석·강우량은 업체 기준표가 비어 있다</li>
 * </ul>
 *
 * <p>U083(Z축)은 저장만 하고 화면에 쓰지 않는다 — 13~100° 대의 설치 각도라
 * 임계값(0.3~1.7°)과 스케일이 맞지 않아, 같이 그리면 X·Y 가 바닥에 눌린다.
 */
public enum ObservationCategory {

    INCLINOMETER("경사계", "°", false, true,
            List.of(new Axis("U081", "X축"), new Axis("U082", "Y축")),
            "U083"),

    SOIL_MOISTURE("토양함수비", "%", false, true,
            List.of(new Axis("U040", "함수비")),
            null),

    ROCKFALL_DETECTOR("낙석", "회", false, false,
            List.of(new Axis("U210", "감지")),
            null),

    RAIN_GAUGE("강우량계", "mm", true, false,
            List.of(new Axis("U010", "강우량")),
            null);

    /**
     * 차트에 그릴 선 하나.
     *
     * @param unitType 업체 관측단위 코드
     * @param label    화면 범례
     */
    public record Axis(String unitType, String label) {
    }

    private final String vendorName;
    private final String unit;
    private final boolean accumulate;
    private final boolean hasThreshold;
    private final List<Axis> axes;
    private final String hiddenUnitType;

    ObservationCategory(String vendorName, String unit, boolean accumulate, boolean hasThreshold,
                        List<Axis> axes, String hiddenUnitType) {
        this.vendorName = vendorName;
        this.unit = unit;
        this.accumulate = accumulate;
        this.hasThreshold = hasThreshold;
        this.axes = axes;
        this.hiddenUnitType = hiddenUnitType;
    }

    /** 업체 {@code obsv_item.obsv_item_nm} 표기. */
    public String vendorName() {
        return vendorName;
    }

    /** ° / % / 회 / mm */
    public String unit() {
        return unit;
    }

    /** true 면 누적합, false 면 평균. 업체 {@code obsv_unit.obsv_agg_type} 과 같다. */
    public boolean accumulate() {
        return accumulate;
    }

    /** 차트 모양. 강우량만 막대다. */
    public boolean bar() {
        return accumulate;
    }

    /** 임계선을 그릴 수 있는지. 낙석·강우량은 업체 기준표가 비어 있다. */
    public boolean hasThreshold() {
        return hasThreshold;
    }

    /** 화면에 그릴 축. 경사계만 2개. */
    public List<Axis> axes() {
        return axes;
    }

    /** 저장은 하되 화면에 쓰지 않는 축. 경사계 U083 뿐이고 나머지는 null. */
    public String hiddenUnitType() {
        return hiddenUnitType;
    }

    /** 저장 대상 전체 축 코드 — 표출 축 + 숨김 축. */
    public List<String> allUnitTypes() {
        List<String> shown = axes.stream().map(Axis::unitType).toList();
        return hiddenUnitType == null
                ? shown
                : java.util.stream.Stream.concat(shown.stream(), java.util.stream.Stream.of(hiddenUnitType)).toList();
    }

    public static ObservationCategory ofVendorName(String obsvItemNm) {
        if (obsvItemNm == null) {
            return null;
        }
        for (ObservationCategory c : values()) {
            if (c.vendorName.equals(obsvItemNm)) {
                return c;
            }
        }
        return null;
    }
}
