package com.eseict.ulsan.gis.facility.pump;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 배수구역.
 *
 * 펌프장이 담당하는 권역. polygon 좌표는 프론트 상수로 관리하고,
 * 백엔드는 이름 기반 매칭만 제공한다.
 */
@Entity
@Table(name = "drainage_zone", schema = "pump")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DrainageZone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
