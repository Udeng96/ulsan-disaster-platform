package com.eseict.ulsan.gis.common.layer;

/**
 * 레이어 색 변경 요청 항목 (bulk).
 *
 * <p>{@code PUT /api/layers/colors} 바디 = 이 record 의 배열. 레이어 패널 컬러 피커에서
 * 변경된 색을 프론트가 모아뒀다가 한 번에 전송.
 *
 * @param code  레이어 code (layer.code)
 * @param color HEX 색 (#RRGGBB)
 */
public record LayerColorUpdate(String code, String color) {}
