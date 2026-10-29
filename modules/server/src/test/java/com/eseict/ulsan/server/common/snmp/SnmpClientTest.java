package com.eseict.ulsan.server.common.snmp;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.snmp4j.smi.TimeTicks;
import org.snmp4j.smi.Counter64;
import org.snmp4j.smi.OctetString;

class SnmpClientTest {
    @Test
    void 스위치_가동시간은_표시문자열이_아닌_숫자로_전달한다() {
        String value = SnmpClient.valueOf(new TimeTicks(242337000L));
        assertThat(Long.parseLong(value) / 100).isEqualTo(2423370L);
    }

    @Test
    void 최대_ticks와_누적바이트를_보존한다() {
        assertThat(SnmpClient.valueOf(new TimeTicks(4294967295L))).isEqualTo("4294967295");
        assertThat(SnmpClient.valueOf(new Counter64(123456789012L))).isEqualTo("123456789012");
        assertThat(SnmpClient.valueOf(new OctetString("ge1"))).isEqualTo("ge1");
    }
}
