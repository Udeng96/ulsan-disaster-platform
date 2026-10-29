package kr.ulsan.broadcast.signboard;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

/**
 * 전광판 API 예외 → {@link SignboardResponse} 형식 응답. (전광판 컨트롤러 전용)
 * 검증에서 걸린 요청도 {@code RECEIVE}·{@code CONTENT}·{@code RESPONSE FAIL} 로그를 남긴다.
 */
@RestControllerAdvice(assignableTypes = {SignboardAlertController.class, SignboardTestController.class})
public class SignboardExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(SignboardExceptionHandler.class);

    private final ObjectMapper objectMapper;

    public SignboardExceptionHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /** 요청 검증 실패(msgCn 비어 있음) → 400, status=VALIDATION_ERROR + 필드별 메시지 목록. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<SignboardResponse> handleValidation(MethodArgumentNotValidException e) {
        List<String> messages = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .toList();
        Object target = e.getBindingResult().getTarget();
        if (target instanceof SignboardAlertRequest) {
            SignboardService.logRequest(objectMapper, target);
        }
        return fail(messages);
    }

    private ResponseEntity<SignboardResponse> fail(List<String> messages) {
        log.warn("[SIGNBOARD RESPONSE] FAIL {}", String.join(", ", messages));
        return ResponseEntity.badRequest().body(SignboardResponse.error("VALIDATION_ERROR", messages));
    }
}
