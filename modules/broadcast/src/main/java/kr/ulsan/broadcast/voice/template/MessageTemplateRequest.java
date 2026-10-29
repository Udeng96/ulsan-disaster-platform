package kr.ulsan.broadcast.voice.template;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 문구 추가·수정 요청. 제목·내용 필수 (비면 400). */
public record MessageTemplateRequest(
        @NotBlank(message = "비어 있으면 안 됩니다") @Size(max = 200, message = "200자 이하여야 합니다") String title,
        @NotBlank(message = "비어 있으면 안 됩니다") String content
) {
}
