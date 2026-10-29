package kr.ulsan.broadcast.voice.template;

import java.util.List;

/** 문구 API 실패 응답. status = VALIDATION_ERROR(400) | NOT_FOUND(404). */
public record MessageTemplateErrorResponse(String status, List<String> message) {
}
