package com.eseict.ulsan.server.domain;

/** 화면 색의 유일한 근원. 정상 초록 · 주의 노랑 · 장애 빨강 · 실측 대기 회색. 숫자가 클수록 나쁘다. */
public enum Verdict {
    OK(0, "정상", "#45E36C"),
    WARN(1, "주의", "#F2D230"),
    FAIL(2, "장애", "#FF4245"),
    UNKNOWN(-1, "실측 대기", "#5A708A");

    private final int severity;
    private final String label;
    private final String color;

    Verdict(int severity, String label, String color) {
        this.severity = severity;
        this.label = label;
        this.color = color;
    }

    public int severity() { return severity; }
    public String label() { return label; }
    public String color() { return color; }

    /** 둘 중 나쁜 쪽. UNKNOWN은 판정이 아니므로 상대가 있으면 상대를 따른다. */
    public Verdict worse(Verdict other) {
        if (other == null || other == UNKNOWN) return this;
        if (this == UNKNOWN) return other;
        return this.severity >= other.severity ? this : other;
    }
}
