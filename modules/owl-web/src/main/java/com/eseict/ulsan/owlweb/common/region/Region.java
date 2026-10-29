package com.eseict.ulsan.owlweb.common.region;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 행정동 lookup ({@code common.region}) — <b>읽기 전용</b>.
 *
 * <p>gis 와 같은 DB(2026_ulsan)를 공유하므로 조회만 매핑한다.
 * 메시지 저장 시 행정동명 → id 찾기({@code RegionResolver})와 지역 필터의 id 검증에 쓴다.
 */
@Entity
@Table(name = "region", schema = "common")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Region {

    @Id
    private Long id;

    private String name;

    /** 10자리 표준 행정동 코드. */
    private String code;
}
