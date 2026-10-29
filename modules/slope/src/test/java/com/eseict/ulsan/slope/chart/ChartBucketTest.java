package com.eseict.ulsan.slope.chart;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 차트 조회 시작 — 시간·일·월은 진행 중인 칸을 포함해 7칸이 되는 첫 칸의 시작, 실시간은 40분 전.
 */
class ChartBucketTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 30, 17, 3, 20);

    @Test
    @DisplayName("시간 7칸 · 일 7칸 · 월 7칸 · 실시간 40분")
    void from() {
        assertThat(ChartRange.HOUR.from(NOW)).isEqualTo(LocalDateTime.of(2026, 9, 30, 11, 0));
        assertThat(ChartRange.DAY.from(NOW)).isEqualTo(LocalDateTime.of(2026, 9, 24, 0, 0));
        assertThat(ChartRange.MONTH.from(NOW)).isEqualTo(LocalDateTime.of(2026, 3, 1, 0, 0));
        assertThat(ChartRange.REALTIME.from(NOW)).isEqualTo(NOW.minusMinutes(40));
    }
}
