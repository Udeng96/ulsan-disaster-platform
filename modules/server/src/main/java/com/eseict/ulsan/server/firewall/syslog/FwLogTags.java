package com.eseict.ulsan.server.firewall.syslog;

import java.util.Set;

/** fw_log.tag 묶음. 경고·위협 태그 이름은 실제 로그가 오면 확정한다. */
public final class FwLogTags {

    /** 10초마다 오는 집계 로그. 이벤트 목록에서는 뺀다. */
    public static final Set<String> COUNTER = Set.of("resource_cnt", "fw4_traffic_cnt", "fw6_traffic_cnt");
    /** 화면 「이벤트」에 올리는 종류. */
    public static final Set<String> EVENT = Set.of("audit", "alert", "threat", "fw4_deny", "fw6_deny");
    /** 차단 건수로 세는 종류 (IPv4 차단 · IPv6 차단 · 위협). */
    public static final Set<String> BLOCK = Set.of("threat", "fw4_deny", "fw6_deny");
    public static final Set<String> ALERT = Set.of("alert");

    private FwLogTags() {
    }
}
