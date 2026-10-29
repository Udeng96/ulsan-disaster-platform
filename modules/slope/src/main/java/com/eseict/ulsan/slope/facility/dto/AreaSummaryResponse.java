package com.eseict.ulsan.slope.facility.dto;

/**
 * 급경사지 요약 — 요약 바 배지용.
 *
 * <p>{@code 가상시설0553 [정상]  가상시설0680 [정상]  가상시설0432 [정상]} 를 그리는 데 필요한 것만 담는다.
 *
 * <p>{@link AreaResponse} 와 나눈 이유 — 요약 바는 3탭 공통이라 어느 화면에 있든 갱신돼야
 * 하는데, 계측 상세가 아닌 화면에서는 계측기 48대가 쓸모없다. 전체 응답이 약 30KB 인 반면
 * 이것은 200바이트 남짓이다.
 *
 * @param grade D / E. 업체가 주지 않아 우리가 관리한다. 아직 비어 있다
 * @param level 현재 상태 (정상/관심/주의/경계/심각)
 * @param lastMeasuredAt 소속 관측항목이 마지막으로 값을 보낸 시각.
 *                       <b>장애여도 {@code level} 은 직전 값을 유지하므로 이것 없이는
 *                       신선한 정상인지 멈춘 정상인지 구분할 수 없다</b> — 가상시설0553이
 *                       그 상태다
 */
public record AreaSummaryResponse(
        Long id,
        String name,
        String grade,
        String level,
        java.time.LocalDateTime lastMeasuredAt
) {
}
