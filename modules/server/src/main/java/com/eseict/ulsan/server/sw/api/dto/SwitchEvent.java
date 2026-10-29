package com.eseict.ulsan.server.sw.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/** ⑥ 최근 활동 한 줄. */
public record SwitchEvent(
        OffsetDateTime at,
        @Schema(description = "앞면 라벨 P6 / SFP2") String port,
        @Schema(description = "ERROR / LINK_UP / LINK_DOWN / NEW_MAC") String kind,
        @Schema(description = "화면 한 줄. 예: 「P6 에러 늘어남 (+3)」") String summary) {
}
