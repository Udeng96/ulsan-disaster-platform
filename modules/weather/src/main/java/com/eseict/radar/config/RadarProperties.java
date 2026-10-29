package com.eseict.radar.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "radar")
public record RadarProperties(
        String baseUrl,
        String serviceKey,
        int timeoutMs,
        String dataType,        // CMP_WRC 고정 (레이더합성영상)
        long delayMs,
        String proxyPrefix      // 대시보드 응답에 쓸 nginx 프록시 prefix (예: /kma-radar)
) {}
