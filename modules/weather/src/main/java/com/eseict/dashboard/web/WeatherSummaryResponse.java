package com.eseict.dashboard.web;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * 좌측 IP wall 패널 (LeftPanel.weather card) 의 모든 슬롯을 한 응답에 묶음.
 *  - location: 관심 지점 메타
 *  - observation: 가장 최근 실황 (현재 온도/습도/바람/강수 등)
 *  - predictions: 다음 3 시간 예보 (시간별 예보 row 용)
 *  - airQuality: 가장 최근 대기질 (PM10/PM25/O3 등)
 *  - warnings: 활성 기상특보 N 건 (최신 순)
 */
public record WeatherSummaryResponse(
        LocationDto location,
        ObservationDto observation,
        List<PredictionDto> predictions,
        AirQualityDto airQuality,
        List<WarningDto> warnings
) {

    public record LocationDto(
            String name,
            BigDecimal latitude,
            BigDecimal longitude
    ) {}

    public record ObservationDto(
            OffsetDateTime observedAt,
            BigDecimal temperatureC,
            BigDecimal humidityPct,
            BigDecimal rainfallMm,
            BigDecimal windSpeedMs,
            BigDecimal windDirectionDeg,
            Integer ptyCode
    ) {}

    public record PredictionDto(
            OffsetDateTime forecastAt,
            Integer skyCode,
            Integer ptyCode,
            BigDecimal temperatureC,
            BigDecimal humidityPct,
            BigDecimal rainfallMm,
            BigDecimal windSpeedMs,
            BigDecimal windDirectionDeg
    ) {}

    public record AirQualityDto(
            OffsetDateTime measuredAt,
            String stationName,
            BigDecimal pm10Value,
            Integer pm10Grade,
            BigDecimal pm25Value,
            Integer pm25Grade,
            BigDecimal o3Value,
            Integer o3Grade,
            BigDecimal khaiValue,
            Integer khaiGrade
    ) {}

    public record WarningDto(
            OffsetDateTime tmFc,
            String title,
            String content
    ) {}
}
