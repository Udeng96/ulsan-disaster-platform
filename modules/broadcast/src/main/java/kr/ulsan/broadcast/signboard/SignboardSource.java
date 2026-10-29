package kr.ulsan.broadcast.signboard;

/** 전광판 알림 요청이 들어온 입구. 이력({@code signboard_alert.source})에 남긴다. */
public enum SignboardSource {

    /** 화면(대시보드). */
    SCREEN,
    /** CAP 변환 모듈 (추후). */
    CAP
}
