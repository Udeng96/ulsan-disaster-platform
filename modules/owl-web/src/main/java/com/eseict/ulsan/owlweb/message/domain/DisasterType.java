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
 * 재난종류 카테고리 마스터 (이름 기준 lookup).
 *
 * <p>필터 드롭다운/표출용. 기타는 catch-all 한 줄(위 목록에 없으면 전부 기타).
 * {@code message} 는 재난유형을 문자열로 비정규화 저장하므로 FK 로 묶지 않는다.
 * {@code code} 는 대표 코드(참고용, 기타는 null).
 */
@Entity
@Table(name = "disaster_type", schema = "owl")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DisasterType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 200)
    private String name;

    @Column(length = 15)
    private String code;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;
}
