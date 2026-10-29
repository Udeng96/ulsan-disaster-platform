package com.eseict.ulsan.gis.common.region.dto;

import com.eseict.ulsan.gis.common.region.Region;

/**
 * 행정동 응답 (남구 14개).
 *
 * @param code 10자리 표준 행정동 코드
 */
public record RegionResponse(Long id, String code, String name) {

    public static RegionResponse from(Region r) {
        return new RegionResponse(r.getId(), r.getCode(), r.getName());
    }
}
