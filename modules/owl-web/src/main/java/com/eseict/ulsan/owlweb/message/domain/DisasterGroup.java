package com.eseict.ulsan.owlweb.message.domain;

/**
 * 재난유형 대분류 ([재난_구분] dstrTy). 이벤트 종류 필터의 기준.
 *
 * <p>부엉이는 메시지에 <b>소분류 코드</b>({@code dstrTyCd}, 예: 603=구급)만 실어 보내고
 * 대분류는 주지 않는다. 소분류 이름은 대분류를 넘나들며 중복되므로(화재=201 사회재난 /
 * 601 긴급구조, 지진=109 자연재난 / 504 모의훈련 …) 이름으로는 판별할 수 없고,
 * 코드로 역산해야 한다.
 *
 * <p><b>코드 앞자리 = 대분류. 단 3xx 는 예외로 사회재난(2)이다</b> — 코드목록 API 의
 * {@code dstrTy=2} 응답에 국가기반체계 마비 재난(301 에너지 … 308 식중독)이 함께 들어있다.
 * 앞자리만 보고 3을 별도 대분류로 취급하면 그 8개가 미분류로 샌다.
 */
public enum DisasterGroup {
    NATURAL("1", "자연재난"),
    SOCIAL("2", "사회재난"),
    OVERSEAS("4", "해외재난"),
    DRILL("5", "모의훈련"),
    EMERGENCY_RESCUE("6", "긴급구조"),
    NOTICE("9", "공지/안내");

    private final String code;
    private final String label;

    DisasterGroup(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public String getCode() {
        return code;
    }

    public String getLabel() {
        return label;
    }

    /**
     * 소분류 코드({@code dstrTyCd}) → 대분류. 정의 밖 코드거나 값이 없으면 null
     * (필터에서 빠질 뿐 적재는 그대로 된다 — 개방형 코드라 미등록 값이 올 수 있다).
     */
    public static DisasterGroup fromDisasterTypeCode(String disasterTypeCode) {
        if (disasterTypeCode == null || disasterTypeCode.isBlank()) {
            return null;
        }
        String head = disasterTypeCode.trim().substring(0, 1);
        if (head.equals("3")) {
            return SOCIAL;   // 301~308 국가기반체계 마비 — 코드목록상 사회재난에 속한다
        }
        for (DisasterGroup g : values()) {
            if (g.code.equals(head)) {
                return g;
            }
        }
        return null;
    }
}
