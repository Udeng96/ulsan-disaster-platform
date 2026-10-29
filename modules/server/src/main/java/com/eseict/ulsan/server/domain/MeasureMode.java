package com.eseict.ulsan.server.domain;

/**
 * 값을 어떻게 얻는가. 화면의 점 모양을 정한다.
 * DIRECT·SNMP = 채운 점 ● / INDIRECT = 속 빈 점 ○ (행정망 — 다른 서버의 수신 기록으로 확인) / NONE = 수집 안 함.
 */
public enum MeasureMode {
    DIRECT(true),
    SNMP(true),
    INDIRECT(false),
    NONE(false);

    private final boolean direct;

    MeasureMode(boolean direct) { this.direct = direct; }

    public boolean isDirect() { return direct; }
    public boolean isIndirect() { return this == INDIRECT; }
}
