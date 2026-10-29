package com.eseict.airquality.domain;

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
 * 에어코리아 대기질 측정 1행 (측정소 × 시각).
 * 등급(grade): 1=좋음, 2=보통, 3=나쁨, 4=매우나쁨
 */
@Entity
@Table(
        name = "air_quality",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_air_quality_station_time",
                columnNames = {"station_name", "measured_at"}
        ),
        indexes = @Index(
                name = "ix_air_quality_station_time",
                columnList = "station_name, measured_at DESC"
        )
)
public class AirQuality {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "location_id")
    private Long locationId;

    @Column(name = "station_name", nullable = false, length = 64)
    private String stationName;

    @Column(name = "measured_at", nullable = false)
    private OffsetDateTime measuredAt;

    @Column(name = "pm10_value", precision = 7, scale = 2)
    private BigDecimal pm10Value;
    @Column(name = "pm10_grade")
    private Integer pm10Grade;

    @Column(name = "pm25_value", precision = 7, scale = 2)
    private BigDecimal pm25Value;
    @Column(name = "pm25_grade")
    private Integer pm25Grade;

    @Column(name = "o3_value", precision = 7, scale = 4)
    private BigDecimal o3Value;
    @Column(name = "o3_grade")
    private Integer o3Grade;

    @Column(name = "no2_value", precision = 7, scale = 4)
    private BigDecimal no2Value;
    @Column(name = "no2_grade")
    private Integer no2Grade;

    @Column(name = "so2_value", precision = 7, scale = 4)
    private BigDecimal so2Value;
    @Column(name = "so2_grade")
    private Integer so2Grade;

    @Column(name = "co_value", precision = 7, scale = 4)
    private BigDecimal coValue;
    @Column(name = "co_grade")
    private Integer coGrade;

    @Column(name = "khai_value", precision = 6, scale = 2)
    private BigDecimal khaiValue;       // 통합대기환경지수
    @Column(name = "khai_grade")
    private Integer khaiGrade;

    @Column(name = "fetched_at", nullable = false)
    private OffsetDateTime fetchedAt;

    protected AirQuality() {
    }

    public AirQuality(Long locationId, String stationName, OffsetDateTime measuredAt,
                      BigDecimal pm10Value, Integer pm10Grade,
                      BigDecimal pm25Value, Integer pm25Grade,
                      BigDecimal o3Value, Integer o3Grade,
                      BigDecimal no2Value, Integer no2Grade,
                      BigDecimal so2Value, Integer so2Grade,
                      BigDecimal coValue, Integer coGrade,
                      BigDecimal khaiValue, Integer khaiGrade,
                      OffsetDateTime fetchedAt) {
        this.locationId = locationId;
        this.stationName = stationName;
        this.measuredAt = measuredAt;
        this.pm10Value = pm10Value; this.pm10Grade = pm10Grade;
        this.pm25Value = pm25Value; this.pm25Grade = pm25Grade;
        this.o3Value = o3Value;     this.o3Grade = o3Grade;
        this.no2Value = no2Value;   this.no2Grade = no2Grade;
        this.so2Value = so2Value;   this.so2Grade = so2Grade;
        this.coValue = coValue;     this.coGrade = coGrade;
        this.khaiValue = khaiValue; this.khaiGrade = khaiGrade;
        this.fetchedAt = fetchedAt;
    }

    public Long getId() { return id; }
    public Long getLocationId() { return locationId; }
    public String getStationName() { return stationName; }
    public OffsetDateTime getMeasuredAt() { return measuredAt; }
    public BigDecimal getPm10Value() { return pm10Value; }
    public Integer getPm10Grade() { return pm10Grade; }
    public BigDecimal getPm25Value() { return pm25Value; }
    public Integer getPm25Grade() { return pm25Grade; }
    public BigDecimal getO3Value() { return o3Value; }
    public Integer getO3Grade() { return o3Grade; }
    public BigDecimal getKhaiValue() { return khaiValue; }
    public Integer getKhaiGrade() { return khaiGrade; }
}
