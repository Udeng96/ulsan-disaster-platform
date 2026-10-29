package com.eseict.ulsan.gis.common.region;

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
 * 행정동 lookup.
 *
 * 시설물 검색 필터 / 응답에 region 이름을 노출하기 위한 공통 lookup 테이블.
 * 남구 행정동 14건은 V2 시드.
 */
@Entity
@Table(name = "region", schema = "common")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Region {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(length = 50)
    private String gu;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    /** 10자리 표준 행정동 코드 (시도 2 + 시군구 3 + 행정동 5). */
    @Column(nullable = false, unique = true, length = 10)
    private String code;
}
