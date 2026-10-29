package com.eseict.ulsan.server.sw;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * switch.* 설정.
 * cpuCores: 스위치 CPU 코어 수. 비우면 CPU 칸은 「부하 11.9」 숫자만(판정 없음, 파랑).
 *           한드림넷에서 코어 수를 받으면 넣는다 → 부하 ÷ 코어 수 = CPU %, 70% 주의 · 90% 장애.
 * errorWindow: 이 기간 안에 에러 수가 늘어난 포트를 「에러 포트」로 센다. 기본 1시간.
 */
@ConfigurationProperties(prefix = "switch")
public record SwitchProperties(Snmp snmp, Integer cpuCores, java.time.Duration errorWindow) {

    public SwitchProperties {
        if (errorWindow == null) errorWindow = java.time.Duration.ofHours(1);
    }

    public record Snmp(boolean enabled, String host, int port, String community, int timeoutMs, long intervalMs) {
    }
}
