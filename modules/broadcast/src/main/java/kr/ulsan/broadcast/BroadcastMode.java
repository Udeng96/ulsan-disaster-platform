package kr.ulsan.broadcast;

/**
 * 모듈 동작 모드. {@code broadcast.mode} 하나로 전광판·음성 동작을 모두 결정한다.
 */
public enum BroadcastMode {

    /** 통신 차단. 화면 요청은 받아 로그·이력만 남기고 실제 전광판/음성엔 안 나감. (기본, 안전) */
    BLOCKED,

    /** 실제 운영. 대시보드 요청대로 전광판 전송·음성 송신을 실제로 수행. */
    REAL,

    /** 테스트. 실제 전송·송신을 하고, 전용 test API(음성 테스트 송신, 전광판 비우기)도 연다. */
    TEST
}
