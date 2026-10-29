package com.eseict.ulsan.gis.facility.shelter;

import com.eseict.ulsan.gis.common.region.Region;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * 무더위쉼터.
 *
 * <p>남구 71개소. safetydata 재난안전데이터공유플랫폼 API 에서 받은 2026년 데이터.
 * 시설유형은 한글 라벨 (경로당/금융기관/기타), 운영시간은 HHMM 문자열.
 */
@Entity
@Table(name = "cooling_shelter", schema = "shelter")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CoolingShelter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "road_address", length = 500)
    private String roadAddress;

    @Column(name = "parcel_detail", length = 200)
    private String parcelDetail;

    @Column(precision = 10, scale = 7)
    private BigDecimal lat;

    @Column(precision = 10, scale = 7)
    private BigDecimal lng;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    /** 시설유형 — 경로당 / 금융기관 / 기타. */
    @Column(name = "facility_type", nullable = false, length = 30)
    private String facilityType;

    /** 이용가능 인원. */
    private Integer capacity;

    /** 평일 운영 시작 (HHMM). */
    @Column(name = "weekday_open", length = 4)
    private String weekdayOpen;

    /** 평일 운영 종료 (HHMM). */
    @Column(name = "weekday_close", length = 4)
    private String weekdayClose;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
