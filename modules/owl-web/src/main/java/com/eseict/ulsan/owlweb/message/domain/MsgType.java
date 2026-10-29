package com.eseict.ulsan.owlweb.message.domain;

/**
 * 메시지 구분 ([메시지_구분] msgSprtr).
 *
 * <p>문서(설명서 getMsgSprtr/setMsgSprtr) 기준 코드 매핑: 1:상황보고, 2:대응지시,
 * 3:관측정보, 4:긴급구조, 5:기타. 원본 코드가 없거나 매칭 안 되면 문서 default 인
 * {@link #RESPONSE_ORDER}(2:대응지시)로 처리한다.
 *
 * <p><b>owl 의 {@code collect.MsgType} 과 상수 이름이 정확히 같아야 한다</b> — owl 이 enum
 * 이름(예: {@code "EMERGENCY_RESCUE"})으로 직렬화해 보내므로, 여기 없는 이름이 오면
 * 역직렬화가 실패해 그 폴링 배치 전체가 날아간다.
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
