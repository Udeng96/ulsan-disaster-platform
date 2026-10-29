package com.eseict.ulsan.server.firewall;

import static org.assertj.core.api.Assertions.assertThat;

import com.eseict.ulsan.server.domain.ResourceKind;
import com.eseict.ulsan.server.domain.ResourceReading;
import com.eseict.ulsan.server.firewall.snmp.FwStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class FirewallMonitorCollectorTest {

    @Test
    void 자원_4칸_로그SSD_메모리_CPU_세션() {
        FwStatus s = FwStatus.builder()
                .collectedAt(OffsetDateTime.parse("2026-10-15T03:48:10+09:00"))
                .diskLogPct((short) 12).memPct((short) 41).memUsed(6_920_601L).memTotal(16_777_216L)
                .cpuPct(new BigDecimal("22.0")).sessionCnt(124_000)
                .build();
        List<ResourceReading> r = FirewallMonitorCollector.resources(s, new FirewallProperties.Capacity(10, 8_000_000L, 1000));
        assertThat(r).extracting(ResourceReading::kind)
                .containsExactly(ResourceKind.LOG_SSD, ResourceKind.MEMORY, ResourceKind.CPU, ResourceKind.SESSION);
        assertThat(r.get(0).detail()).isEqualTo("120G/1000G");
        assertThat(r.get(1).detail()).isEqualTo("6.6G/16G");
        assertThat(r.get(2).detail()).isEqualTo("10코어");
        assertThat(r.get(3).pct()).isEqualTo(1.6);
        assertThat(r.get(3).detail()).isEqualTo("12.4만/800만");
        assertThat(r.get(3).judged()).isFalse();
    }

    @Test
    void 사양이_비면_세션은_숫자만() {
        FwStatus s = FwStatus.builder().collectedAt(OffsetDateTime.now()).sessionCnt(5000).build();
        List<ResourceReading> r = FirewallMonitorCollector.resources(s, new FirewallProperties.Capacity(null, null, null));
        assertThat(r.get(3).pct()).isNull();
        assertThat(r.get(3).detail()).isEqualTo("5000");
        assertThat(r.get(0).measured()).isFalse();
    }
}
