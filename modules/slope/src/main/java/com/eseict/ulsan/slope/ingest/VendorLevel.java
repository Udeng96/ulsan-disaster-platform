package com.eseict.ulsan.slope.ingest;

import java.util.Set;

/**
 * 업체 단계 코드 처리.
 *
 * <p><b>변환하지 않는다.</b> 업체 코드를 그대로 저장한다 — 화면 표기(정상/관심/주의/경계/심각)는
 * 업체 {@code ews.dsrisk_obsv_stp_cd} 가 {@code target_type='SLOPE'} 로 직접 제공하므로 우리가
 * 매핑을 만들 필요가 없다. 같은 코드라도 재해유형에 따라 표기가 다르다는 점이 중요하다 —
 * SLOPE 는 경계/심각인데 하천은 경보/대피다.
 *
 * <p>다루는 것은 <b>장애 판별 하나뿐</b>이다.
 */
public final class VendorLevel {

    /**
     * 장애 코드. 업체가 이 값을 주면 <b>단계·값을 갱신하지 않고 직전 값을 유지한다</b>
     * ("값이 안 들어오면 에러 대신 마지막값을 표시" 요구).
     *
     * <p>예외 상황이 아니라 상시 상태다 — 가상시설0553 지구는 소속 관측항목 29개 전부가 ERROR 다.
     * 그래서 화면 응답의 {@code lastMeasuredAt}(업체 마지막 측정 시각)이 신선도를 판단할 유일한 근거가 된다.
     */
    private static final Set<String> FAULTS = Set.of("ERROR", "ERROR2");

    private VendorLevel() {
    }

    public static boolean isFault(String crtclType) {
        return crtclType == null || FAULTS.contains(crtclType);
    }

    /** 저장 가능한 단계인지. 장애면 false. */
    public static boolean isValid(String crtclType) {
        return !isFault(crtclType);
    }
}
