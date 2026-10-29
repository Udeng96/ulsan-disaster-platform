package kr.ulsan.broadcast.voice.template;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

/** 문구 API 예외 → {@link MessageTemplateErrorResponse}. */
@RestControllerAdvice(assignableTypes = MessageTemplateController.class)
public class MessageTemplateExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(MessageTemplateExceptionHandler.class);

    /** 제목·내용이 비었거나 제목이 200자를 넘음 → 400. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<MessageTemplateErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        List<String> messages = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .toList();
        log.warn("[TEMPLATE] 실패 {}", String.join(", ", messages));
        return ResponseEntity.badRequest().body(new MessageTemplateErrorResponse("VALIDATION_ERROR", messages));
    }

    /** 없는 id → 404. */
    @ExceptionHandler(MessageTemplateNotFoundException.class)
    public ResponseEntity<MessageTemplateErrorResponse> handleNotFound(MessageTemplateNotFoundException e) {
        log.warn("[TEMPLATE] 실패 {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new MessageTemplateErrorResponse("NOT_FOUND", List.of(e.getMessage())));
    }
}
