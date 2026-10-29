package com.eseict.forecast.api;

import java.time.LocalDateTime;

/**
 * 단기예보 API의 base_date / base_time 계산 유틸.
 *
 * - 초단기실황 (UltraSrtNcst): 매 정시 발표, 10분 후 사용 가능
 * - 초단기예보 (UltraSrtFcst): 매 30분 발표, 45분 후 사용 가능
 */
public final class ForecastBaseTime {

    private ForecastBaseTime() {
    }

    /** 현재 시각 기준 사용 가능한 최신 실황 base 시각 (KST). */
    public static LocalDateTime currentObservationBase(LocalDateTime nowKst) {
        // HH:10 이전이면 (HH-1):00 발표분 사용
        if (nowKst.getMinute() < 10) {
            return nowKst.minusHours(1).withMinute(0).withSecond(0).withNano(0);
        }
        return nowKst.withMinute(0).withSecond(0).withNano(0);
    }

    /** 현재 시각 기준 사용 가능한 최신 초단기예보 base 시각 (KST). */
    public static LocalDateTime currentPredictionBase(LocalDateTime nowKst) {
        // HH:00 발표 → HH:45 사용 가능
        // HH:30 발표 → (HH+1):15 사용 가능
        int minute = nowKst.getMinute();
        if (minute >= 45) {
            return nowKst.withMinute(30).withSecond(0).withNano(0);
        } else if (minute >= 15) {
            return nowKst.withMinute(0).withSecond(0).withNano(0);
        } else {
            return nowKst.minusHours(1).withMinute(30).withSecond(0).withNano(0);
        }
    }
}
