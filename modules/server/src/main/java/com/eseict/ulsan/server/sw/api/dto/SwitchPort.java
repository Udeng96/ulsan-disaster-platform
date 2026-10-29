package com.eseict.ulsan.server.sw.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** ⑨ 스위치 포트 한 줄. */
public record SwitchPort(
        String ifName,
        @Schema(description = "앞면 라벨 P1 / SFP1") String label,
        @Schema(description = "꽂힌 장비 host (수기, servers.host)") String host,
        String note,
        boolean linkUp,
        Integer speedMbps,
        Long inBps,
        Long outBps,
        @Schema(description = "에러 늘어난 수 (switch.error-window, 기본 1시간). 0 이면 공란") long errors,
        @Schema(description = "이 포트에서 보이는 MAC") List<String> macs,
        @Schema(description = "아는 장비(sw_known_mac)에 없는 MAC. 있으면 빨간 줄 「미확인 (MAC …)」") List<String> unknownMacs) {
}
