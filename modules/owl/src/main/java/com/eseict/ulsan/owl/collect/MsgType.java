package com.eseict.ulsan.owl.collect;

/**
 * 메시지 구분 ([메시지_구분] msgSprtr).
 *
 * <p>문서(설명서 getMsgSprtr/setMsgSprtr) 기준 코드 매핑: 1:상황보고, 2:대응지시,
 * 3:관측정보, 4:긴급구조, 5:기타. 원본 코드가 없거나 정의 밖이면 문서 default 인
 * {@link #RESPONSE_ORDER}(2:대응지시)로 처리한다(설명서 "null일 경우 2:대응지시 default").
 */
public enum MsgType {
    SITUATION_REPORT("1", "상황보고"),
    RESPONSE_ORDER("2", "대응지시"),
    OBSERVATION("3", "관측정보"),
    EMERGENCY_RESCUE("4", "긴급구조"),
    ETC("5", "기타");

    private final String code;
    private final String label;

    MsgType(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public String getCode() {
        return code;
    }

    public String getLabel() {
        return label;
    }

    /** 원본 msgSprtr 코드 → enum. null/미매칭이면 문서 default(2:대응지시). */
    public static MsgType fromCode(String code) {
        if (code != null) {
            for (MsgType t : values()) {
                if (t.code.equals(code.trim())) {
                    return t;
                }
            }
        }
        return RESPONSE_ORDER;
    }
}
