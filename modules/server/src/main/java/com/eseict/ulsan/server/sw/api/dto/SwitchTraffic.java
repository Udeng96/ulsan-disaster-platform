package com.eseict.ulsan.server.sw.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * ③ 트래픽 그래프. 24h = 끝난 1시간마다 점 1개(24개), 7d = 끝난 하루마다 점 1개(7개, 오늘 제외).
 * 점 값은 그 구간 평균 Gbps. 평소선 = 지난 7일 평균.
 */
public record SwitchTraffic(
        @Schema(description = "24h | 7d") String range,
        @Schema(description = "평소선 Gbps = 지난 7일 평균. 기록 없으면 null") Double baselineGbps,
        List<Point> points) {

    public record Point(
            @Schema(description = "구간 시작 시각 (서울)") OffsetDateTime at,
            @Schema(description = "구간 평균 Gbps. 기록 없으면 null") Double gbps,
            @Schema(description = "구간에서 가장 느린 응답 ms") Integer maxRttMs,
            @Schema(description = "응답 배경색: OK(1ms 미만) / WARN(1~5ms 노랑) / FAIL(5ms 이상 빨강). 기록 없으면 null") String rttLevel,
            @Schema(description = "구간에서 가장 높은 브로드캐스트 %") Double maxBroadcastPct,
            @Schema(description = "브로드캐스트 5% 이상 구간이면 true → 빗금") boolean broadcastHigh) {
    }
}
