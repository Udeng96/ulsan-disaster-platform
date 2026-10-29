package com.eseict.ulsan.slope.facility;

import java.util.Map;

/**
 * 단계 코드 → 화면 표기.
 *
 * <p>DB 에는 업체 코드({@code NORMAL}/{@code INTEREST}/…)로 저장하고 API 응답에서만 한글로
 * 바꾼다. 코드는 안 바뀌지만 표기는 아직 확정이 아니기 때문이다 — 업체 DB 안에서도 같은 코드가
 * 두 이름으로 정의돼 있다 (deploy/업체-질문.md 3번).
 *
 * <table>
 *   <tr><th>코드</th><th>{@code ews.crtcl}</th><th>{@code dsrisk_obsv_stp_cd} (SLOPE)</th></tr>
 *   <tr><td>WARNING</td><td>경고</td><td><b>경계</b></td></tr>
 *   <tr><td>DANGER</td><td>위험</td><td><b>심각</b></td></tr>
 * </table>
 *
 * <p><b>급경사지용인 {@code dsrisk_obsv_stp_cd} 쪽(경계/심각)을 따른다.</b> 화면 문구와도
 * 일치하고, {@code ews.crtcl} 은 재해유형 구분이 없는 공통 마스터다.
 *
 * <p>변환을 여기 한 곳에 모아둔 이유 — 단계 테이블을 우리 DB 에 만들어 관리하기로 하면
 * 이 클래스만 그쪽을 읽도록 바꾸면 된다.
 */
public final class LevelName {

    private static final Map<String, String> NAMES = Map.of(
            "NORMAL", "정상",
            "INTEREST", "관심",
            "ATTENTION", "주의",
            "WARNING", "경계",
            "DANGER", "심각",
            "ERROR", "장애",
            "ERROR2", "장애"
    );

    /** 낮을수록 안전. 가장 나쁜 단계를 고를 때 쓴다. */
    private static final Map<String, Integer> ORDER = Map.of(
            "NORMAL", 10,
            "INTEREST", 20,
            "ATTENTION", 30,
            "WARNING", 40,
            "DANGER", 50,
            "ERROR", 60,
            "ERROR2", 70
    );

    private LevelName() {
    }

    /** 모르는 코드는 그대로 돌려준다 — 업체가 새 단계를 추가해도 화면이 비지 않는다. */
    public static String of(String code) {
        return code == null ? null : NAMES.getOrDefault(code, code);
    }

    /**
     * 화면 표기 → 코드. 업체 문자의 {@code snr_step}(관심/주의/경계/심각)을 읽는 데 쓴다.
     * 장애처럼 코드가 여럿인 표기나 모르는 표기는 null.
     */
    public static String codeOf(String name) {
        if (name == null) {
            return null;
        }
        return switch (name.trim()) {
            case "정상" -> "NORMAL";
            case "관심" -> "INTEREST";
            case "주의" -> "ATTENTION";
            case "경계" -> "WARNING";
            case "심각" -> "DANGER";
            default -> null;
        };
    }

    /** 정상. 해제는 이 단계로만 간다 — 중간 단계를 거치지 않는다. */
    public static final String NORMAL = "NORMAL";

    /** 발령이 필요한 최소 단계. 관심부터다. */
    public static final String ALERT_FROM = "INTEREST";

    /**
     * 발령 대상 단계인지 — 관심 이상인가.
     *
     * <p>장애(ERROR/ERROR2)는 순서상 가장 크지만 발령 대상이 아니다. 값이 안 들어오는 것이지
     * 위험한 것이 아니기 때문이다.
     */
    public static boolean needsAlarm(String code) {
        if (code == null || code.startsWith("ERROR")) {
            return false;
        }
        return ORDER.getOrDefault(code, 0) >= ORDER.get(ALERT_FROM);
    }

    /**
     * 둘 중 더 나쁜 단계.
     *
     * <p>계측기 행의 뱃지에 쓴다 — 경사계 1대가 관측항목 둘을 내는데 단계가 어긋나는 경우가
     * 실제로 있다(22대 중 4대).
     */
    public static String worse(String a, String b) {
        if (a == null) {
            return b;
        }
        if (b == null) {
            return a;
        }
        return ORDER.getOrDefault(a, 0) >= ORDER.getOrDefault(b, 0) ? a : b;
    }

    /** {@code a} 가 {@code b} 보다 나쁜가. 같으면 false. */
    public static boolean isWorse(String a, String b) {
        if (a == null) {
            return false;
        }
        if (b == null) {
            return true;
        }
        return ORDER.getOrDefault(a, 0) > ORDER.getOrDefault(b, 0);
    }
}
