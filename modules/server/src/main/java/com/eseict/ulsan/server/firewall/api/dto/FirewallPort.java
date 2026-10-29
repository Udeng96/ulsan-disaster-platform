package com.eseict.ulsan.server.firewall.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** 전면 포트 표 한 줄. */
public record FirewallPort(
        @Schema(description = "전면 라벨 UTP1 / SFP1 / MGMT") String label,
        String ifName,
        @Schema(description = "external / internal / unknown") String zone,
        @Schema(description = "용도 (수기)") String usage,
        @Schema(description = "반대편 장비 (수기)") String peer,
        boolean linkUp,
        String speed,
        @Schema(description = "수신 bps") Long inBps,
        @Schema(description = "송신 bps") Long outBps) {
}
