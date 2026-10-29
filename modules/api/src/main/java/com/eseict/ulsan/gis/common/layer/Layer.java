package com.eseict.ulsan.gis.common.layer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 지도 레이어 메뉴 메타.
 *
 * <p>화면 좌측 레이어 목록의 구성 정보 (이름/색/순서/사용여부). 마커 데이터는
 * 담지 않는다 — 각 시설물 API 가 제공하며, 시설물 응답의 {@code layerCode} 가
 * 이 테이블의 {@code code} 와 매칭된다.
 */
@Entity
@Table(name = "layer", schema = "common")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Layer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 7)
    private String color;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    /** 색 변경 (레이어 패널 컬러 피커 → PUT /api/layers/colors). */
    public void changeColor(String color) {
        this.color = color;
    }
}
