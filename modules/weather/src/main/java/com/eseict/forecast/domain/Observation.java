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
 * KMA 초단기실황 — 매 정시 1행.
 * 카테고리(T1H/REH/RN1/WSD/VEC/PTY)들을 1행으로 피벗해서 저장.
 */
@Entity
@Table(
        name = "observation",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_observation_location_time",
                columnNames = {"location_id", "observed_at"}
        ),
        indexes = @Index(
                name = "ix_observation_location_time",
                columnList = "location_id, observed_at DESC"
        )
)
public class Observation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "location_id", nullable = false)
    private Long locationId;

    @Column(name = "observed_at", nullable = false)
    private OffsetDateTime observedAt;

    @Column(name = "temperature_c", precision = 5, scale = 2)
    private BigDecimal temperatureC;       // T1H

    @Column(name = "humidity_pct", precision = 5, scale = 2)
    private BigDecimal humidityPct;        // REH

    @Column(name = "rainfall_mm", precision = 6, scale = 2)
    private BigDecimal rainfallMm;         // RN1

    @Column(name = "wind_speed_ms", precision = 5, scale = 2)
    private BigDecimal windSpeedMs;        // WSD

    @Column(name = "wind_direction_deg", precision = 5, scale = 2)
    private BigDecimal windDirectionDeg;   // VEC

    @Column(name = "pty_code")
    private Integer ptyCode;               // 0=없음 1=비 2=비/눈 3=눈 5=빗방울 6=빗방울/눈 7=눈날림

    @Column(name = "fetched_at", nullable = false)
    private OffsetDateTime fetchedAt;

    protected Observation() {
    }

    public Observation(Long locationId, OffsetDateTime observedAt,
                       BigDecimal temperatureC, BigDecimal humidityPct, BigDecimal rainfallMm,
                       BigDecimal windSpeedMs, BigDecimal windDirectionDeg,
                       Integer ptyCode, OffsetDateTime fetchedAt) {
        this.locationId = locationId;
        this.observedAt = observedAt;
        this.temperatureC = temperatureC;
        this.humidityPct = humidityPct;
        this.rainfallMm = rainfallMm;
        this.windSpeedMs = windSpeedMs;
        this.windDirectionDeg = windDirectionDeg;
        this.ptyCode = ptyCode;
        this.fetchedAt = fetchedAt;
    }

    public Long getId() { return id; }
    public Long getLocationId() { return locationId; }
    public OffsetDateTime getObservedAt() { return observedAt; }
    public BigDecimal getTemperatureC() { return temperatureC; }
    public BigDecimal getHumidityPct() { return humidityPct; }
    public BigDecimal getRainfallMm() { return rainfallMm; }
    public BigDecimal getWindSpeedMs() { return windSpeedMs; }
    public BigDecimal getWindDirectionDeg() { return windDirectionDeg; }
    public Integer getPtyCode() { return ptyCode; }
    public OffsetDateTime getFetchedAt() { return fetchedAt; }
}
