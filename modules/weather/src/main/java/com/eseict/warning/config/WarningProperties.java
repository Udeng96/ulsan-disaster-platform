package com.eseict.warning.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "warning")
public record WarningProperties(
        String baseUrl,
        String serviceKey,
        int timeoutMs,
        long delayMs
) {}
