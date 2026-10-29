package com.eseict.forecast.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * KMA 초단기예보 — (base, forecast) 시각 쌍별 1행.
 * 같은 base에서 N개의 미래 fcstTime을 받음.
 * 새 base 발표 시점에 직전 예보를 덮어쓰는 게 아니라 누적 보관 (히스토리).
 */
@Entity
@Table(
        name = "prediction",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_prediction_loc_base_fcst",
                columnNames = {"location_id", "base_at", "forecast_at"}
        ),
        indexes = @Index(
                name = "ix_prediction_loc_fcst",
                columnList = "location_id, forecast_at DESC, base_at DESC"
        )
)
public class Prediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "location_id", nullable = false)
    private Long locationId;

    @Column(name = "base_at", nullable = false)
    private OffsetDateTime baseAt;

    @Column(name = "forecast_at", nullable = false)
    private OffsetDateTime forecastAt;

    @Column(name = "sky_code")
    private Integer skyCode;               // 1=맑음 3=구름많음 4=흐림

    @Column(name = "pty_code")
    private Integer ptyCode;               // 0=없음 1=비 ...

    @Column(name = "temperature_c", precision = 5, scale = 2)
    private BigDecimal temperatureC;

    @Column(name = "humidity_pct", precision = 5, scale = 2)
    private BigDecimal humidityPct;

    @Column(name = "rainfall_mm", precision = 6, scale = 2)
    private BigDecimal rainfallMm;

    @Column(name = "rainfall_raw", length = 32)
    private String rainfallRaw;            // "강수없음", "1mm 미만" 등 원본 보존

    @Column(name = "wind_speed_ms", precision = 5, scale = 2)
    private BigDecimal windSpeedMs;

    @Column(name = "wind_direction_deg", precision = 5, scale = 2)
    private BigDecimal windDirectionDeg;

    @Column(name = "fetched_at", nullable = false)
    private OffsetDateTime fetchedAt;

    protected Prediction() {
    }

    public Prediction(Long locationId, OffsetDateTime baseAt, OffsetDateTime forecastAt,
                      Integer skyCode, Integer ptyCode,
                      BigDecimal temperatureC, BigDecimal humidityPct,
                      BigDecimal rainfallMm, String rainfallRaw,
                      BigDecimal windSpeedMs, BigDecimal windDirectionDeg,
                      OffsetDateTime fetchedAt) {
        this.locationId = locationId;
        this.baseAt = baseAt;
        this.forecastAt = forecastAt;
        this.skyCode = skyCode;
        this.ptyCode = ptyCode;
        this.temperatureC = temperatureC;
        this.humidityPct = humidityPct;
        this.rainfallMm = rainfallMm;
        this.rainfallRaw = rainfallRaw;
        this.windSpeedMs = windSpeedMs;
        this.windDirectionDeg = windDirectionDeg;
        this.fetchedAt = fetchedAt;
    }

    public Long getId() { return id; }
    public Long getLocationId() { return locationId; }
    public OffsetDateTime getBaseAt() { return baseAt; }
    public OffsetDateTime getForecastAt() { return forecastAt; }
    public Integer getSkyCode() { return skyCode; }
    public Integer getPtyCode() { return ptyCode; }
    public BigDecimal getTemperatureC() { return temperatureC; }
    public BigDecimal getHumidityPct() { return humidityPct; }
    public BigDecimal getRainfallMm() { return rainfallMm; }
    public String getRainfallRaw() { return rainfallRaw; }
    public BigDecimal getWindSpeedMs() { return windSpeedMs; }
    public BigDecimal getWindDirectionDeg() { return windDirectionDeg; }
    public OffsetDateTime getFetchedAt() { return fetchedAt; }
}
