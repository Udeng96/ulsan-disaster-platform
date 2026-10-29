package com.eseict.ulsan.gis.facility.pump;

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
 * 배수펌프장 안의 장비.
 *
 * <p>상태 표시 패턴 ({@link StatusPattern}):
 * <ul>
 *   <li>{@code ON_OFF}       — 펌프, 제진기, 스크린 등</li>
 *   <li>{@code OPEN_CLOSE}   — 밸브, 수문 등</li>
 *   <li>{@code WATER_LEVEL}  — 수위 (수치값 {@link #value})</li>
 *   <li>{@code NONE}         — PLC 자체</li>
 * </ul>
 *
 * <p>플래그:
 * <ul>
 *   <li>{@code isAvailable} — 장비 사용 가능 여부 (xlsx 사용유무 N → false)</li>
 *   <li>{@code isDisplayed} — 화면 표출 여부 (PLC → false 관례)</li>
 * </ul>
 */
@Entity
@Table(name = "pump_equipment", schema = "pump")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PumpEquipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pump_station_id", nullable = false)
    private PumpStation pumpStation;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_pattern", nullable = false, length = 20)
    private StatusPattern statusPattern;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EquipmentCategory category;

    /**
     * 표출 우선순위.
     * <ul>
     *   <li>{@code 1} — 주요 (펌프 / 수위계 / 수문 등)</li>
     *   <li>{@code 2} — 보조 (밸브 / 제진기 / 스크린)</li>
     *   <li>{@code 3} — 부속 (구리스 / 냉각수 / 공기압축 / 냉각탑 / 연료 / 에어콤푸레샤)</li>
     * </ul>
     *
     * <p>화면 공간 부족 시 낮은 값(주요) 부터 우선 표출.
     */
    @Column(nullable = false)
    private Short priority;

    /**
     * 장비 상태값. 외부 상태수집 모듈이 채운다.
     *
     * <ul>
     *   <li>{@code 1} — 켜짐 / 열림</li>
     *   <li>{@code 2} — 꺼짐 / 닫힘</li>
     *   <li>{@code 3} — 오류 (통신오류 포함)</li>
     *   <li>{@code 4} — 고장(정비)</li>
     *   <li>{@code NULL} — 미수집</li>
     * </ul>
     *
     * <p>DB 측에 {@code CHECK} 제약 — NULL 이거나 1~4.
     */
    private Short state;

    /** 수치값 — 수위계 등 {@link StatusPattern#WATER_LEVEL} 타입 장비의 측정값. */
    @Column(precision = 10, scale = 2)
    private BigDecimal value;

    @Column(name = "is_available", nullable = false)
    private boolean available;

    @Column(name = "is_displayed", nullable = false)
    private boolean displayed;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
