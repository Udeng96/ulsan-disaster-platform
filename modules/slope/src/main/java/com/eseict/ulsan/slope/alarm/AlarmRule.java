package com.eseict.ulsan.slope.alarm;

import java.time.LocalDateTime;

/**
 * 발령 집계 규칙.
 *
 * <p><b>업체 답변에 따라 바뀔 수 있는 판단을 한 곳에 모아둔다.</b>
 *
 * <table>
 *   <tr><th>구분</th><th>출처</th><th>조건</th></tr>
 *   <tr><td>발령</td><td>{@code snr_isnc_log}</td><td>{@code snr_isnc_type = 'ISSUANCE'}</td></tr>
 *   <tr><td>해제</td><td>{@code snr_isnc_log}</td><td>{@code snr_isnc_type = 'CLEAR'}</td></tr>
 *   <tr><td>발령 필요</td><td>{@code warning_sms_log}</td><td>최근 25시간 "발령이 필요합니다" 문자, 180분 초과 없는 단계는 낮춤, 그 단계 이상 발령 전까지</td></tr>
 * </table>
 *
 * <p><b>스피커·전광판 로그는 쓰지 않는다.</b> 업체 확인 결과 그 둘은 마을 방송·전광판 문구를
 * 표출했다는 기록이고 발령 이력이 아니다 (2026-09-07 답변). 발령 1건이 송출 여러 건을 만들어
 * 그것으로 세면 수치가 크게 어긋난다 — 2년간 발령 2건 / 송출 11건.
 */
public final class AlarmRule {

    /** {@code snr_isnc_log.snr_isnc_type} — 발령. */
    public static final String ISSUANCE = "ISSUANCE";

    /** {@code snr_isnc_log.snr_isnc_type} — 해제. */
    public static final String CLEAR = "CLEAR";

    /**
     * 이 시각 전의 발령·해제 기록은 업체 테스트다 — 통계·이력에서 뺀다 (2026-10-06 사용자 확인).
     * 2026-04-14·15 발령 2건과 07-07 해제 2건, 모두 업체 "관리자" 계정이다. 남구청은 발령한 적이 없다.
     */
    public static final LocalDateTime TEST_UNTIL = LocalDateTime.of(2026, 7, 8, 0, 0);

    private AlarmRule() {
    }

    /**
     * 업체 지구명 → 우리 급경사지 이름.
     *
     * <p>업체가 약칭을 쓰는 경우가 있어 정규화한다.
     *
     * @return 우리 {@code area.name} 에 대응하는 이름. 대상 밖 지구면 null
     */
    public static String normalizeZone(String zoneName) {
        if (zoneName == null || zoneName.isBlank()) {
            return null;
        }
        return switch (zoneName.trim()) {
            case "삼익", "가상시설0432" -> "가상시설0432";
            case "우주", "가상시설0553" -> "가상시설0553";
            case "가상시설0680" -> "가상시설0680";
            // 울산지구 등 남구 코드로 들어오지만 우리 급경사지 3곳이 아닌 것은 제외한다.
            default -> null;
        };
    }
}
