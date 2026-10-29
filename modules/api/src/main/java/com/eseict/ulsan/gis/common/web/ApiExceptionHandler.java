package com.eseict.ulsan.gis.common.web;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * 공통 예외 처리 — 실패 응답을 모두 {@link ErrorResponse} 형식으로 맞춘다.
 *
 * <ul>
 *   <li>{@link ApiException}: 서비스가 정한 상태코드 / code</li>
 *   <li>요청 파라미터 누락·형식 오류, 바디 파싱 실패, 검증 실패 → 400 BAD_REQUEST</li>
 *   <li>없는 경로 → 404 NOT_FOUND, 지원하지 않는 메서드 → 405 METHOD_NOT_ALLOWED</li>
 *   <li>그 밖의 예외 → 500 INTERNAL_ERROR (스택은 로그에만 남기고 응답엔 숨김)</li>
 * </ul>
 */
@Slf4j
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ApiException e) {
        if (e.getStatus().is5xxServerError()) {
            log.warn("[api] {} {}", e.getCode(), e.getMessage(), e.getCause());
        }
        return body(e.getStatus(), e.getCode(), e.getMessage());
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleStatus(ResponseStatusException e) {
        HttpStatusCode status = e.getStatusCode();
        HttpStatus resolved = HttpStatus.resolve(status.value());
        String code = resolved == null ? String.valueOf(status.value()) : resolved.name();
        return body(status, code, e.getReason() == null ? code : e.getReason());
    }

    @ExceptionHandler({
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class,
            HttpMessageNotReadableException.class,
            MethodArgumentNotValidException.class
    })
    public ResponseEntity<ErrorResponse> handleBadRequest(Exception e) {
        return body(HttpStatus.BAD_REQUEST, "BAD_REQUEST", badRequestMessage(e));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NoResourceFoundException e) {
        return body(HttpStatus.NOT_FOUND, "NOT_FOUND", "not found: /" + e.getResourcePath());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethod(HttpRequestMethodNotSupportedException e) {
        return body(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception e) {
        log.error("[api] unexpected error", e);
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "서버 내부 오류");
    }

    private static String badRequestMessage(Exception e) {
        if (e instanceof MissingServletRequestParameterException m) {
            return "required parameter missing: " + m.getParameterName();
        }
        if (e instanceof MethodArgumentTypeMismatchException m) {
            return "invalid parameter: " + m.getName();
        }
        if (e instanceof MethodArgumentNotValidException m && m.getBindingResult().getFieldError() != null) {
            var f = m.getBindingResult().getFieldError();
            return "invalid field: " + f.getField() + " (" + f.getDefaultMessage() + ")";
        }
        return "invalid request body";
    }

    private static ResponseEntity<ErrorResponse> body(HttpStatusCode status, String code, String message) {
        return ResponseEntity.status(status).body(new ErrorResponse(code, message));
    }
}
