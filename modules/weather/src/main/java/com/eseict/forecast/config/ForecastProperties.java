package com.eseict.forecast.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "forecast")
public record ForecastProperties(
        String baseUrl,
        String serviceKey,
        int timeoutMs,
        long observationDelayMs,
        long predictionDelayMs
) {}
