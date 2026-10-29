package com.eseict.ulsan.server.firewall.snmp;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.eseict.ulsan.server.common.snmp.SnmpClient;
import com.eseict.ulsan.server.firewall.FirewallProperties;
import java.io.IOException;
import java.util.Map;
import org.junit.jupiter.api.Test;

class FirewallSnmpCollectorTest {
    final FwStatusRepository status = mock(FwStatusRepository.class);
    final FwInterfaceRepository ports = mock(FwInterfaceRepository.class);
    final FwPolicyRepository policies = mock(FwPolicyRepository.class);
    final FwPolicyChangeRepository changes = mock(FwPolicyChangeRepository.class);
    final FirewallSnmpCollector collector = new FirewallSnmpCollector(new FirewallProperties(
            new FirewallProperties.Snmp(true, "127.0.0.1", 161, "test", "test", "test", 100, 10000),
            new FirewallProperties.Syslog(false, "/tmp/unused", 2000), null), status, ports, policies, changes);

    @Test
    void 정상_빈_정책표는_과거_정책을_제거한다() throws Exception {
        try (var ignored = mockConstruction(SnmpClient.class, (snmp, context) -> {
            when(snmp.get(anyList())).thenReturn(Map.of());
            when(snmp.walk(anyString())).thenReturn(Map.of());
        })) {
            collector.collect();
            var order = inOrder(policies);
            order.verify(policies).deleteAllInBatch();
            order.verify(policies).saveAll(argThat(rows -> !rows.iterator().hasNext()));
        }
    }

    @Test
    void 정책이_바뀌면_변경_기록을_남긴다() throws Exception {
        when(policies.findAll()).thenReturn(java.util.List.of(
                FwPolicy.builder().policyIdx(1).name("관리망 허용").action("ALLOW").collectedAt(java.time.OffsetDateTime.now()).build()));
        try (var ignored = mockConstruction(SnmpClient.class, (snmp, context) -> {
            when(snmp.get(anyList())).thenReturn(Map.of());
            when(snmp.walk(anyString())).thenReturn(Map.of());
            when(snmp.walk(SecuiOid.POLICY_TABLE)).thenReturn(Map.of(
                    SecuiOid.POLICY_NAME + ".1", "관리망 허용", SecuiOid.POLICY_ACTION + ".1", "ALLOW", SecuiOid.POLICY_SESSIONS + ".1", "0",
                    SecuiOid.POLICY_NAME + ".2", "웹서버 허용", SecuiOid.POLICY_ACTION + ".2", "ALLOW", SecuiOid.POLICY_SESSIONS + ".2", "0"));
        })) {
            collector.collect();
            verify(changes).save(argThat(c -> c.summary().equals("정책 변경 · 추가 「웹서버 허용」 · 삭제 0")
                    && c.getPolicyCount() == 2 && c.getAllowCount() == 2));
        }
    }

    @Test
    void 직전_정책표가_비어_있으면_변경으로_보지_않는다() throws Exception {
        when(policies.findAll()).thenReturn(java.util.List.of());
        try (var ignored = mockConstruction(SnmpClient.class, (snmp, context) -> {
            when(snmp.get(anyList())).thenReturn(Map.of());
            when(snmp.walk(anyString())).thenReturn(Map.of());
            when(snmp.walk(SecuiOid.POLICY_TABLE)).thenReturn(Map.of(
                    SecuiOid.POLICY_NAME + ".1", "관리망 허용", SecuiOid.POLICY_ACTION + ".1", "ALLOW", SecuiOid.POLICY_SESSIONS + ".1", "0"));
        })) {
            collector.collect();
            verifyNoInteractions(changes);
        }
    }

    @Test
    void 정책조회실패는_기존_데이터를_건드리지_않는다() throws Exception {
        try (var ignored = mockConstruction(SnmpClient.class, (snmp, context) -> {
            when(snmp.get(anyList())).thenReturn(Map.of());
            when(snmp.walk(anyString())).thenReturn(Map.of());
            when(snmp.walk(SecuiOid.POLICY_TABLE)).thenThrow(new IOException("timeout"));
        })) {
            assertThatThrownBy(collector::collect).isInstanceOf(IllegalStateException.class);
            verifyNoInteractions(status, ports, policies, changes);
        }
    }

    @Test
    void 정책해석실패는_상태까지_일부_저장하지_않는다() throws Exception {
        try (var ignored = mockConstruction(SnmpClient.class, (snmp, context) -> {
            when(snmp.get(anyList())).thenReturn(Map.of());
            when(snmp.walk(anyString())).thenReturn(Map.of());
            when(snmp.walk(SecuiOid.POLICY_TABLE)).thenReturn(Map.of(SecuiOid.POLICY_NAME + ".invalid", "broken"));
        })) {
            assertThatThrownBy(collector::collect).isInstanceOf(IllegalStateException.class);
            verifyNoInteractions(status, ports, policies, changes);
        }
    }
}
