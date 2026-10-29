package com.eseict.common.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;

/**
 * 관심 지점 마스터. 각 API의 지역 식별 키를 한 행에 집약한다.
 *  - KMA 단기예보: (gridNx, gridNy)
 *  - KMA 기상특보: warningStnId (예: "159" = 울산)
 *  - 에어코리아   : airStationName (예: "가상시설0480")
 */
@Entity
@Table(
        name = "location",
        uniqueConstraints = @UniqueConstraint(name = "uk_location_name", columnNames = "name")
)
public class Location {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "grid_nx", nullable = false)
    private Integer gridNx;

    @Column(name = "grid_ny", nullable = false)
    private Integer gridNy;

    @Column(name = "warning_stn_id", length = 8)
    private String warningStnId;

    @Column(name = "air_station_name", length = 64)
    private String airStationName;

    protected Location() {
    }

    public Location(String name,
                    BigDecimal latitude, BigDecimal longitude,
                    Integer gridNx, Integer gridNy,
                    String warningStnId, String airStationName) {
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
        this.gridNx = gridNx;
        this.gridNy = gridNy;
        this.warningStnId = warningStnId;
        this.airStationName = airStationName;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public BigDecimal getLatitude() { return latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public Integer getGridNx() { return gridNx; }
    public Integer getGridNy() { return gridNy; }
    public String getWarningStnId() { return warningStnId; }
    public String getAirStationName() { return airStationName; }
}
