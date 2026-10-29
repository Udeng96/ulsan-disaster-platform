package com.eseict.airquality.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "airquality")
public record AirqualityProperties(
        String baseUrl,
        String serviceKey,
        int timeoutMs,
        long delayMs
) {}
