package com.eseict.ulsan.server.sw.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.eseict.ulsan.server.sw.api.dto.SwitchTraffic;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SwitchQueryServiceTest {

    @Test
    void 그래프_24h는_1시간_평균_Gbps_빈_시간은_null() {
        LocalDateTime start = LocalDateTime.of(2026, 10, 14, 16, 0);
        SwitchTraffic t = SwitchQueryService.chart("24h", 1.1, start, 24, ChronoUnit.HOURS,
                Map.of(start.plusHours(1), new Object[]{null, 1_234_000_000.0, 6.2}),
                Map.of(start.plusHours(1), 3));
        assertThat(t.points()).hasSize(24);
        assertThat(t.points().get(0).gbps()).isNull();
        var p = t.points().get(1);
        assertThat(p.gbps()).isEqualTo(1.23);
        assertThat(p.broadcastHigh()).isTrue();
        assertThat(p.rttLevel()).isEqualTo("WARN");
        assertThat(t.points().get(0).at().toString()).isEqualTo("2026-10-14T16:00+09:00");
    }

    @Test
    void 응답_배경색_기준() {
        assertThat(SwitchQueryService.rttLevel(0)).isEqualTo("OK");
        assertThat(SwitchQueryService.rttLevel(1)).isEqualTo("WARN");
        assertThat(SwitchQueryService.rttLevel(5)).isEqualTo("FAIL");
        assertThat(SwitchQueryService.rttLevel(null)).isNull();
    }
}
