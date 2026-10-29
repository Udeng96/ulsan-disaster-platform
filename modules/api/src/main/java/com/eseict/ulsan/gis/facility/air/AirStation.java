package com.eseict.ulsan.gis.facility.air;

import com.eseict.ulsan.gis.common.region.Region;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 대기질 측정소.
 *
 * <p>남구 7개소. 측정값(미세먼지/오존 등)은 별도 (weather 모듈) — 여기선 메타만.
 */
@Entity
@Table(name = "station", schema = "air")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AirStation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "network_type", nullable = false, length = 20)
    private NetworkType networkType;

    /** 설치 위치 설명 (예: 가상시설0422). */
    @Column(length = 500)
    private String location;

    /** 도로명 주소. */
    @Column(length = 500)
    private String address;

    @Column(precision = 10, scale = 7)
    private BigDecimal lat;

    @Column(precision = 10, scale = 7)
    private BigDecimal lng;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
