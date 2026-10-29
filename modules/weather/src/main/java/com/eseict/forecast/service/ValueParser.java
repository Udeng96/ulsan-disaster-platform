package com.eseict.forecast.service;

import java.math.BigDecimal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * KMA API value 파싱 유틸.
 * 예보의 RN1/SNO 등은 "강수없음", "1mm 미만", "30~50mm" 같은 비숫자 문자열로도 옴.
 */
public final class ValueParser {

    private static final Pattern FIRST_NUMBER = Pattern.compile("(\\d+(?:\\.\\d+)?)");

    private ValueParser() {
    }

    /** 정확한 BigDecimal 변환. 실패 시 null. */
    public static BigDecimal parseDecimal(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** 정수 변환. 실패 시 null. */
    public static Integer parseInt(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * 강수량/적설량 등 텍스트 혼합 값을 BigDecimal로 (가능하면).
     *  - "강수없음"     → 0
     *  - "1mm 미만"     → 0.5 (관례)
     *  - "1.0"          → 1.0
     *  - "30~50mm"      → 30 (하한)
     *  - 파싱 불가      → null
     */
    public static BigDecimal parseRainfall(String value) {
        if (value == null) return null;
        String v = value.trim();
        if (v.isEmpty() || "강수없음".equals(v) || "적설없음".equals(v)) {
            return BigDecimal.ZERO;
        }
        if (v.contains("미만")) {
            // "1mm 미만" → 0.5
            Matcher m = FIRST_NUMBER.matcher(v);
            if (m.find()) {
                BigDecimal upper = new BigDecimal(m.group(1));
                return upper.divide(BigDecimal.valueOf(2));
            }
            return new BigDecimal("0.5");
        }
        // 일반 숫자 또는 "30~50mm" 같은 범위 — 첫 숫자 추출
        Matcher m = FIRST_NUMBER.matcher(v);
        if (m.find()) {
            return new BigDecimal(m.group(1));
        }
        return null;
    }
}
