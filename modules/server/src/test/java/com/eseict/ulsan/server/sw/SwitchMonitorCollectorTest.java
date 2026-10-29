package com.eseict.ulsan.server.sw;

import static org.assertj.core.api.Assertions.assertThat;

import com.eseict.ulsan.server.domain.ResourceKind;
import com.eseict.ulsan.server.domain.ResourceReading;
import com.eseict.ulsan.server.sw.snmp.SwInterface;
import com.eseict.ulsan.server.sw.snmp.SwStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class SwitchMonitorCollectorTest {

    static final OffsetDateTime T = OffsetDateTime.parse("2026-10-15T03:48:10+09:00");

    static SwInterface port(String name, boolean up, Integer mbps, Long in, Long out) {
        return SwInterface.builder().collectedAt(T).ifIndex(1).ifName(name).linkUp(up).speedMbps(mbps)
                .inBytes(0).outBytes(0).inBps(in).outBps(out).build();
    }

    final SwStatus status = SwStatus.builder().collectedAt(T).load1m(new BigDecimal("11.89"))
            .memTotalKb(2_097_152L).memUsedKb(377_487L).build();
    final List<SwInterface> ports = List.of(
            port("ge1", true, 1000, 100_000_000L, 300_000_000L),
            port("ge2", true, 1000, 200_000_000L, 100_000_000L),
            port("ge3", false, null, null, null),
            port("ge4", false, null, null, null));

    @Test
    void 코어수_모르면_CPU칸은_부하숫자만() {
        List<ResourceReading> r = SwitchMonitorCollector.resources(status, ports, null);
        assertThat(r).extracting(ResourceReading::kind)
                .containsExactly(ResourceKind.LOAD, ResourceKind.MEMORY, ResourceKind.PORT_USAGE, ResourceKind.BANDWIDTH);
        assertThat(r.get(0).pct()).isNull();
        assertThat(r.get(0).detail()).isEqualTo("부하 11.9");
        assertThat(r.get(0).verdict()).isNull();
        assertThat(r.get(1).pct()).isEqualTo(18.0);
        assertThat(r.get(1).detail()).isEqualTo("0.4G/2G");
        assertThat(r.get(2).detail()).isEqualTo("2/4");
        assertThat(r.get(3).pct()).isEqualTo(25.0);                 // (3억 + 2억) / 20억
        assertThat(r.get(3).detail()).isEqualTo("0.5/2Gbps");
    }

    @Test
    void 코어수_알면_CPU_퍼센트로_판정() {
        ResourceReading cpu = SwitchMonitorCollector.resources(status, ports, 16).get(0);
        assertThat(cpu.kind()).isEqualTo(ResourceKind.CPU);
        assertThat(cpu.pct()).isEqualTo(74.3);
        assertThat(cpu.judged()).isTrue();
    }

    @Test
    void 트래픽은_받은양의_합() {
        assertThat(SwitchMonitorCollector.trafficGbps(ports)).isEqualTo(0.3);
        assertThat(SwitchMonitorCollector.trafficGbps(List.of(port("ge1", true, 1000, null, null)))).isNull();
    }
}
