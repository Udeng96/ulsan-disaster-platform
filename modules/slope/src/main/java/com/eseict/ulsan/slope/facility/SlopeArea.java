package com.eseict.ulsan.slope.facility;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 급경사지(붕괴위험지역) — 업체 상시계측 연계 대상 3곳.
 *
 * <p><b>관리지역({@link ManagedArea}, 165개소)과 별개 자원이다.</b> 같은 장소를 가리키는 3건이
 * 양쪽에 있지만 이름도 각자 관리한다 — 대장은 {@code 가상시설0554}, 업체는 {@code 가상시설0553}.
 *
 * <p>키가 두 개인 이유 — {@code id} 는 우리 것, {@code vendorId} 는 업체 {@code zne_id} 다.
 * 업체가 시스템을 재구축해 키가 바뀌어도 우리 id 가 유지되어야 단계 변화 이력
 * ({@link AreaLevelEvent})이 끊기지 않는다.
 */
@Entity
@Table(name = "area", schema = "slope")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SlopeArea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 업체 {@code zne_id} (3114040001~3). */
    @Column(name = "vendor_id", nullable = false, unique = true)
    private Long vendorId;

    @Column(nullable = false, length = 50)
    private String name;

    /** 업체 {@code dsaddr}. 지번 주소다. */
    @Column(length = 200)
    private String address;

    @Column(name = "legal_dong_code", length = 10)
    private String legalDongCode;

    private BigDecimal lat;
    private BigDecimal lng;

    /** 기상청 격자. 강우 예보 연동 대비해 받아둔다. */
    @Column(name = "grid_x")
    private Integer gridX;

    @Column(name = "grid_y")
    private Integer gridY;

    /** D / E 등급. 업체가 주지 않아 우리가 관리한다. */
    @Column(length = 10)
    private String grade;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public SlopeArea(Long vendorId, String name, String address, String legalDongCode,
                     BigDecimal lat, BigDecimal lng, Integer gridX, Integer gridY) {
        this.vendorId = vendorId;
        this.name = name;
        this.address = address;
        this.legalDongCode = legalDongCode;
        this.lat = lat;
        this.lng = lng;
        this.gridX = gridX;
        this.gridY = gridY;
    }
}
