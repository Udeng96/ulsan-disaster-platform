package com.eseict.ulsan.slope.ingest.dto;

/**
 * 업체 {@code ews.obsv_item} 한 행.
 *
 * @param itemName 관측항목명 (경사계/토양함수비/낙석/강우량계). 종류 판정의 근거다
 * @param unit     ° / % / 회 / mm. {@code obsv_unit} 에서 가져온다
 */
public record VendorItem(
        Long obsvItemId,
        Long obsvId,
        String itemName,
        String unit,
        boolean useYn
) {
}
