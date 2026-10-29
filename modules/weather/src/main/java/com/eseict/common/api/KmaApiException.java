package com.eseict.common.api;

/**
 * KMA / 에어코리아 open API 호출 실패를 나타내는 공통 예외.
 * 각 모듈이 자체 예외를 두던 것을 통합한 것.
 *
 * resultCode 는 KMA 응답 헤더의 코드 (있으면). 없으면 null.
 * 스케줄러들은 이 예외를 잡아 로그만 남기고 다음 사이클을 기다린다.
 */
public class KmaApiException extends RuntimeException {

    private final String resultCode;

    public KmaApiException(String message) {
        super(message);
        this.resultCode = null;
    }

    public KmaApiException(String message, Throwable cause) {
        super(message, cause);
        this.resultCode = null;
    }

    public KmaApiException(String resultCode, String message) {
        super("[" + resultCode + "] " + message);
        this.resultCode = resultCode;
    }

    /** KMA 응답 header.resultCode. null 가능. */
    public String getResultCode() {
        return resultCode;
    }
}
