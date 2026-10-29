package com.eseict.ulsan.server.firewall.syslog;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

/** 2026-09-15 수집 서버에서 실제로 받은 줄로 검증한다. */
class FirewallSyslogParserTest {

    @Test
    void 자원_집계() {
        var log = FirewallSyslogParser.parse(
                "2026-09-15T16:08:06.080386+09:00 <14>1 2026-09-15T07:05:11.832512Z [resource_cnt] [192.0.2.195] 2026-09-15 16:05:10,BLUEMAX,0.6,38.0,0.1,20,0.0-1.0,0.0-0.0,6.4,0.3")
                .orElseThrow();
        assertThat(log.getTag()).isEqualTo("resource_cnt");
        assertThat(log.getReceivedAt()).isEqualTo(OffsetDateTime.parse("2026-09-15T16:08:06.080386+09:00"));
        assertThat(log.getDeviceAt()).isEqualTo(OffsetDateTime.parse("2026-09-15T07:05:11.832512Z"));
        assertThat(log.getBody()).startsWith("2026-09-15 16:05:10,BLUEMAX,0.6,38.0");
    }

    @Test
    void 관리자_로그() {
        var log = FirewallSyslogParser.parse(
                "2026-09-15T17:27:20.580027+09:00 <14>1 2026-09-15T08:24:26.402327Z [audit] [192.0.2.195] 2026-09-15 17:24:26,BLUEMAX,admin,192.0.2.19,3,Admin Log,LOGIN,OK,,-")
                .orElseThrow();
        assertThat(log.getTag()).isEqualTo("audit");
        assertThat(log.getBody()).endsWith("Admin Log,LOGIN,OK,,-");
    }

    @Test
    void 형식이_다르면_버린다() {
        assertThat(FirewallSyslogParser.parse("2026-09-15T13:24:0.0+09:00 dbsvr rino firewall-log test")).isEmpty();
        assertThat(FirewallSyslogParser.parse("")).isEmpty();
    }
}
