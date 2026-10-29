package com.eseict.ulsan.server.firewall.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.eseict.ulsan.server.firewall.api.dto.FirewallBlockChart;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import org.junit.jupiter.api.Test;

class FirewallQueryServiceTest {

    @Test
    void audit_로그는_계정_IP_메뉴_동작_결과로_요약한다() {
        String body = "2026-09-15 17:24:26,BLUEMAX,admin,192.0.2.19,3,Admin Log,LOGIN,OK,,-";
        assertThat(FirewallQueryService.summarize("audit", body)).isEqualTo("admin(192.0.2.19) · Admin Log · LOGIN · OK");
    }

    @Test
    void LOG_COMMIT_뒤에_붙는_JSON은_요약에_들어가지_않는다() {
        String body = "2026-09-15 17:30:00,BLUEMAX,admin,192.0.2.19,3,Policy,LOG_COMMIT,OK,{\"old\":{\"a\":1,\"b\":2}},{\"new\":{\"a\":3}}";
        assertThat(FirewallQueryService.summarize("audit", body)).isEqualTo("admin(192.0.2.19) · Policy · LOG_COMMIT · OK");
    }

    @Test
    void 모르는_태그는_원문_그대로다() {
        assertThat(FirewallQueryService.summarize("alert", "x,y,z")).isEqualTo("x,y,z");
        assertThat(FirewallQueryService.summarize("audit", "짧은,줄")).isEqualTo("짧은,줄");
    }

    @Test
    void 그래프_24h는_1시간_건수_곱하기_24이고_빈_시간은_0이다() {
        LocalDateTime start = LocalDateTime.of(2026, 10, 14, 15, 0);
        FirewallBlockChart c = FirewallQueryService.chart("24h", 120, start, 24, ChronoUnit.HOURS,
                Map.of(start.plusHours(1), 5L));
        assertThat(c.points()).hasSize(24);
        assertThat(c.points().get(0).value()).isZero();
        assertThat(c.points().get(1).count()).isEqualTo(5);
        assertThat(c.points().get(1).value()).isEqualTo(120);
        assertThat(c.warn()).isEqualTo(240);
        assertThat(c.fail()).isEqualTo(360);
        assertThat(c.points().get(0).at().toString()).isEqualTo("2026-10-14T15:00+09:00");
    }

    @Test
    void 그래프_7일은_하루_건수_그대로다() {
        LocalDateTime start = LocalDateTime.of(2026, 10, 8, 0, 0);
        FirewallBlockChart c = FirewallQueryService.chart("7d", 0, start, 7, ChronoUnit.DAYS, Map.of(start.plusDays(6), 30L));
        assertThat(c.points()).hasSize(7);
        assertThat(c.points().get(6).value()).isEqualTo(30);
    }

    @Test
    void 정책은_바뀐_뒤_24시간_동안_변경_그_뒤_유지() {
        OffsetDateTime now = OffsetDateTime.parse("2026-10-15T15:00+09:00");
        assertThat(FirewallQueryService.policyStatus(null, now)).isEqualTo("유지");
        assertThat(FirewallQueryService.policyStatus(now.minusHours(23), now)).isEqualTo("변경");
        assertThat(FirewallQueryService.policyStatus(now.minusHours(25), now)).isEqualTo("유지");
    }
}
