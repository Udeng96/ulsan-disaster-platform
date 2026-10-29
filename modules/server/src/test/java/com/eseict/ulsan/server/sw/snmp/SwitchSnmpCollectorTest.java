package com.eseict.ulsan.server.sw.snmp;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.eseict.ulsan.server.common.snmp.SnmpClient;
import com.eseict.ulsan.server.sw.SwitchProperties;
import java.io.IOException;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SwitchSnmpCollectorTest {
    final SwStatusRepository status = mock(SwStatusRepository.class);
    final SwInterfaceRepository ports = mock(SwInterfaceRepository.class);
    final SwMacRepository macs = mock(SwMacRepository.class);
    final SwKnownMacRepository known = mock(SwKnownMacRepository.class);
    final SwEventRepository events = mock(SwEventRepository.class);
    final SwitchSnmpCollector collector = new SwitchSnmpCollector(
            new SwitchProperties(new SwitchProperties.Snmp(true, "127.0.0.1", 161, "test", 100, 10000), null, null),
            status, ports, macs, known, events);

    @Test
    void 정상_빈_MAC_스냅샷은_과거_MAC을_제거한다() throws Exception {
        try (var ignored = mockConstruction(SnmpClient.class, (snmp, context) -> {
            when(snmp.get(anyList())).thenReturn(Map.of(SubGateOid.SYS_UPTIME, "242337000"));
            when(snmp.walk(anyString())).thenReturn(Map.of());
        })) {
            collector.collect();
            verify(status).save(argThat(s -> s.getUptimeSec() == 2423370L));
            var order = inOrder(macs);
            order.verify(macs).deleteAllInBatch();
            order.verify(macs).saveAll(argThat(rows -> !rows.iterator().hasNext()));
        }
    }

    @Test
    void 조회실패는_과거_MAC을_지우지_않고_롤백용_예외를_전달한다() throws Exception {
        try (var ignored = mockConstruction(SnmpClient.class, (snmp, context) -> {
            when(snmp.get(anyList())).thenThrow(new IOException("timeout"));
        })) {
            assertThatThrownBy(collector::collect).isInstanceOf(IllegalStateException.class);
            verifyNoInteractions(status, ports, macs, known, events);
        }
    }
}
