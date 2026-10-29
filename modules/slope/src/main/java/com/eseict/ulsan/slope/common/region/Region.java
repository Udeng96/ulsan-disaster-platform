package com.eseict.ulsan.slope.common.region;

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
 * 행정동 lookup — **읽기 전용 복제본**.
 *
 * <p>{@code common} 스키마는 gis 모듈 소유다 (테이블 생성/시드 모두 gis V1). 이 모듈은
 * {@code slope.area.region_id} FK 를 타고 행정동 이름을 응답에 싣기 위해 매핑만 한다.
 * <b>여기서 쓰기를 하지 않는다.</b>
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
