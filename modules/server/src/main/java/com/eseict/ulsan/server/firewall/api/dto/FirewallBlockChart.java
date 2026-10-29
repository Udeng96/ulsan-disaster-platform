package com.eseict.ulsan.server.firewall.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * ③ 차단 그래프. 선 세 개는 두 버튼 모두 하루 기준(평소 · 주의 = 평소×2 · 경계 = 평소×3).
 * 24h: 끝난 1시간마다 점 1개(24개), value = 그 1시간 건수 × 24 (일평균 환산).
 * 7d : 끝난 하루마다 점 1개(7개, 오늘 제외), value = 그 날 건수 그대로.
 */
public record FirewallBlockChart(
        @Schema(description = "24h | 7d") String range,
        @Schema(description = "평소선 = 지난 7일 하루 평균 차단 건수. 기록 없으면 0") double baseline,
        @Schema(description = "주의선 = 평소 × 2") double warn,
        @Schema(description = "경계선 = 평소 × 3") double fail,
        List<Point> points) {

    public record Point(
            @Schema(description = "구간 시작 시각 (서울)") OffsetDateTime at,
            @Schema(description = "구간 실제 차단 건수") long count,
            @Schema(description = "그래프에 찍는 값. 24h 는 count × 24, 7d 는 count") double value) {
    }
}
