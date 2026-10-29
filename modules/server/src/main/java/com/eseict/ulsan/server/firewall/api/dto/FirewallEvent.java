package com.eseict.ulsan.server.firewall.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/** 이벤트 목록 한 줄 (경고·관리자·위협 로그). */
public record FirewallEvent(
        OffsetDateTime at,
        @Schema(description = "audit / alert / threat …") String tag,
        @Schema(description = "CSV 원문") String body,
        @Schema(description = "화면용 한 줄. audit 은 \"계정(접속IP) · 메뉴 · 동작 · 결과\", 그 외 태그는 body 그대로. 항상 값 있음") String summary) {
}
