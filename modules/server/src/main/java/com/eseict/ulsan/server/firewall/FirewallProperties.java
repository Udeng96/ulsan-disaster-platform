package com.eseict.ulsan.server.firewall;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "firewall")
public record FirewallProperties(Snmp snmp, Syslog syslog, Capacity capacity) {

    public FirewallProperties {
        if (capacity == null) capacity = new Capacity(null, null, null);
    }

    public record Snmp(boolean enabled, String host, int port, String user,
                       String authPassword, String privPassword, int timeoutMs, long intervalMs) {
    }

    public record Syslog(boolean enabled, String path, long intervalMs) {
    }

    /**
     * 장비 사양 (자산대장 · 규격). SNMP 로 안 나오는 분모. 비우면 그 칸은 숫자만 보이고 % 가 없다.
     * cpuCores 10 · sessionMax 800만 · logDiskGb 1000 (자산대장 사양 「SSD 1TB(로그)」 「800만 세션」).
     */
    public record Capacity(Integer cpuCores, Long sessionMax, Integer logDiskGb) {
    }
}
