package com.eseict.ulsan.server.domain;

/**
 * 자원 동그라미 한 칸의 종류. 장비마다 4칸 구성이 다르다(ResourceLayout).
 * 기준(warnPct·failPct)은 사용률 %. warn 이상 노랑, fail 이상 빨강. 기준이 null 이면 판정하지 않는다(항상 파랑).
 */
public enum ResourceKind {
    // 서버 (마스터 확정 2026-10-01)
    SYSTEM_DISK("시스템디스크", 85.0, 95.0),
    MEMORY("메모리", 80.0, 90.0),
    CPU("CPU", 70.0, 90.0),
    DATA_DISK("데이터디스크", 85.0, 95.0),
    NETWORK("네트워크", 80.0, 90.0),
    // 방화벽
    LOG_SSD("로그SSD", 85.0, 95.0),
    SESSION("세션", null, null),            // 기준 정하기 전 — 항상 파랑
    // 스위치
    LOAD("CPU", null, null),                // 1분 부하. 코어 수 확인 전이라 % 없음 — 항상 파랑
    PORT_USAGE("포트", null, null),         // 꽂힌 포트 비율 — 항상 파랑
    BANDWIDTH("대역폭", 80.0, 90.0);

    private final String label;
    private final Double warnPct;
    private final Double failPct;

    ResourceKind(String label, Double warnPct, Double failPct) {
        this.label = label;
        this.warnPct = warnPct;
        this.failPct = failPct;
    }

    public String label() { return label; }
    public Double warnPct() { return warnPct; }
    public Double failPct() { return failPct; }

    /** 사용률 → 판정. null 이면 실측 대기. 기준이 없는 종류는 null(판정 안 함). */
    public Verdict judge(Double pct) {
        return ResourceReading.judge(pct, warnPct, failPct);
    }
}
