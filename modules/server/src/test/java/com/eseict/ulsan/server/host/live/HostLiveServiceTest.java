package com.eseict.ulsan.server.host.live;

import static org.assertj.core.api.Assertions.assertThat;

import com.eseict.ulsan.server.domain.Verdict;
import com.eseict.ulsan.server.host.db.DbStatsProperties;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class HostLiveServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-16T01:00:00Z");   // 서울 10:00

    @Test
    void 주요_서비스_실행_중이면_언제부터() {
        var s = HostLiveService.services(List.of(new HostLive.ServiceState("nginx", true, Instant.parse("2026-10-02T00:13:00Z"))));
        assertThat(s.text()).isEqualTo("nginx 실행 중 · 10-02 09:13부터");
        assertThat(s.verdict()).isEqualTo(Verdict.OK);
    }

    @Test
    void 하나라도_멈추면_장애() {
        var s = HostLiveService.services(List.of(
                new HostLive.ServiceState("nginx", true, Instant.parse("2026-10-02T00:13:00Z")),
                new HostLive.ServiceState("java", false, null)));
        assertThat(s.text()).isEqualTo("nginx 실행 중 · 10-02 09:13부터 / java 멈춤");
        assertThat(s.verdict()).isEqualTo(Verdict.FAIL);
    }

    @Test
    void 주요_서비스를_안_정했으면_미지정() {
        var s = HostLiveService.services(List.of());
        assertThat(s.text()).isEqualTo("주요 서비스 미지정");
        assertThat(s.verdict()).isNull();
    }

    @Test
    void 오늘_받음_보냄() {
        assertThat(HostLiveService.netText(new long[]{1_288_490_189L, 356_515_840L})).isEqualTo("오늘 받음 1.2GB · 보냄 340.0MB");
        assertThat(HostLiveService.bytes(512)).isEqualTo("512B");
        assertThat(HostLiveService.netText(null)).isNull();
    }

    @Test
    void 대시보드는_3번_DB_기록으로_마지막_수신_오늘_수신() {
        var props = new DbStatsProperties(null, null, null);
        var r = HostLiveService.dbReceived(
                Map.of("slope", NOW.minusSeconds(120), "gis", NOW.minusSeconds(60), "earthquake", NOW.minusSeconds(30)),
                Map.of("slope", 10L, "gis", 1_200L, "earthquake", 5L), List.of("gis", "slope"), props, NOW, "");
        assertThat(r.text()).isEqualTo("마지막 수신 09:59 — GIS · 급경사지");
        assertThat(r.verdict()).isEqualTo(Verdict.OK);
        assertThat(r.throughput()).isEqualTo("오늘 수신 1,210건");
    }

    @Test
    void 부엉이는_간접_표시() {
        var r = HostLiveService.dbReceived(Map.of(), Map.of("gis", 3L), List.of("owl"), new DbStatsProperties(null, null, null), NOW,
                " (3번 DB 기록)");
        assertThat(r.text()).isEqualTo("수신 기록 대기 (3번 DB 기록)");
        assertThat(r.verdict()).isNull();
        assertThat(r.throughput()).isEqualTo("오늘 수신 0건 (3번 DB 기록)");
    }
}
