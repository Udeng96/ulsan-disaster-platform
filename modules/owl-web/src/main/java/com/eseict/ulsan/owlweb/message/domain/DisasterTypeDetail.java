package com.eseict.ulsan.owlweb.message.domain;

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
 * 재난유형 소분류 마스터 (조회 전용) — 2단계 드롭다운의 하위 목록.
 *
 * <p>{@code message} 는 재난유형을 문자열로 비정규화 저장하므로 FK 로 묶지 않는다.
 * 부엉이가 아직 안 보낸 종류도 드롭다운에 띄우기 위한 목록일 뿐이다.
 */
@Entity
@Table(name = "disaster_type_detail", schema = "owl")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DisasterTypeDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 15)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    /** 대분류 코드 — {@code disaster_type.code} 와 매칭. */
    @Column(name = "group_code", nullable = false, length = 1)
    private String groupCode;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;
}
