package kr.ulsan.broadcast.dashboard;

import kr.ulsan.broadcast.voice.VoiceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** 자동음성 API 예외 → HTTP 응답 매핑. (전광판은 별도 핸들러) */
@RestControllerAdvice(assignableTypes = VoiceCastController.class)
public class ApiExceptionHandler {

    /** 업체 통신 실패 → 502 (모듈 잘못이 아니라 업체/네트워크 문제). RESPONSE 로그는 VoiceService 가 남긴다. */
    @ExceptionHandler(VoiceException.class)
    public ResponseEntity<VoiceCastResponse> handleVoice(VoiceException e) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(VoiceCastResponse.fail(e.getMessage()));
    }
}
