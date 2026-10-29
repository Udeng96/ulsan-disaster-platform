package com.eseict.ulsan.server.sw.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 「아는 장비로 등록」 요청. */
public record KnownMacRequest(
        @Schema(description = "02:00:00:00:00:01 (대소문자 무관)", example = "02:00:00:00:00:01")
        @NotBlank @Pattern(regexp = "^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$") String mac,
        @Schema(description = "무슨 장비인지", example = "CCTV 서버 다시 연결") @Size(max = 128) String note) {
}
