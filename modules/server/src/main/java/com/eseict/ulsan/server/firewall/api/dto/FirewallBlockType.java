package com.eseict.ulsan.server.firewall.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** ⑪ 유형별 내역 한 줄. SECUI Syslog 정의서를 받기 전까지 로그 tag 로만 나눈다. */
public record FirewallBlockType(
        @Schema(description = "fw4_deny / fw6_deny / threat") String tag,
        @Schema(description = "IPv4 차단 / IPv6 차단 / 위협") String label,
        @Schema(description = "지난 24시간 건수") long count) {
}
