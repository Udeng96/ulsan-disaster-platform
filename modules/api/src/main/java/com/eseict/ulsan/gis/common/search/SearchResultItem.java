package com.eseict.ulsan.gis.common.search;

/**
 * 검색 결과 한 건 — juso 주소 + vWorld 지오코더 좌표를 합친 형태.
 *
 * @param id            {@code road:<juso 건물관리번호>}
 * @param title         표출 명 (건물명, 없으면 도로명 주소)
 * @param category      {@code PLACE}(건물명 있음) / {@code ROAD}(주소만)
 * @param roadAddress   도로명 주소 (없을 수 있음)
 * @param parcelAddress 지번 주소 (없을 수 있음)
 * @param lat           위도
 * @param lng           경도
 */
public record SearchResultItem(
        String id,
        String title,
        String category,
        String roadAddress,
        String parcelAddress,
        double lat,
        double lng
) {}
