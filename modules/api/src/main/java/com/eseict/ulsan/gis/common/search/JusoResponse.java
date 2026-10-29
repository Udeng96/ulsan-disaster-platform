package com.eseict.ulsan.gis.common.search;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * 도로명주소 API({@code addrLinkApi.do}) 의 raw 응답 매핑.
 *
 * <p>실제 응답 예:
 * <pre>{@code
 * { "results": {
 *     "common": { "errorCode":"0", "errorMessage":"정상", "totalCount":"5", "currentPage":"1" },
 *     "juso": [
 *       { "roadAddr":"가상시설0565 가상시설0411로143번길 12", "jibunAddr":"가상시설0565 가상시설0412 1493",
 *         "bdNm":"가상시설0411배수펌프장", "bdMgtSn":"3114010300..." }
 *     ]
 * }}
 * }</pre>
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record JusoResponse(Results results) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Results(Common common, List<Juso> juso) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Common(
            String errorCode,
            String errorMessage,
            String totalCount,
            String currentPage
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Juso(
            String roadAddr,    // 도로명 전체주소 (건물번호 포함) — 지오코딩 입력
            String jibunAddr,   // 지번 주소
            String bdNm,        // 건물명 (없으면 빈 문자열)
            String bdMgtSn      // 건물관리번호 (결과 식별자)
    ) {}
}
