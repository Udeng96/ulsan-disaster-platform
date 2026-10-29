package com.eseict.forecast.api;

/**
 * KMA 단기예보 API의 단일 행 (실황 or 예보).
 * 실황은 baseDate/Time == valueDate/Time, 예보는 valueDate/Time이 미래 시각.
 */
public record ForecastItem(
        String baseDate,
        String baseTime,
        String category,    // T1H, REH, RN1, WSD, VEC, PTY, SKY, ...
        String valueDate,   // 예보 대상 일자 (실황은 baseDate와 동일)
        String valueTime,   // 예보 대상 시각
        String value        // obsrValue or fcstValue
) {}
