package com.eseict.ulsan.gis.common.search;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * vWorld 지오코더({@code /req/address}, {@code request=getcoord}) 의 raw 응답 매핑.
 *
 * <p>도로명주소 한 건 → 좌표 한 점. 검색 API 와 달리 {@code result.point} 단일.
 *
 * <pre>{@code
 * { "response": { "status":"OK", "result": { "point": { "x":"129.34", "y":"35.53" } } } }
 * }</pre>
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record VWorldGeocodeResponse(Response response) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Response(String status, Result result) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Result(Point point) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Point(String x, String y) {}
}
