package com.eseict.ulsan.gis.common.web;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 서비스에서 던지는 API 예외 — {@link ApiExceptionHandler} 가 상태코드와 {@link ErrorResponse} 로 바꾼다.
 */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public ApiException(HttpStatus status, String code, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.code = code;
    }
}
