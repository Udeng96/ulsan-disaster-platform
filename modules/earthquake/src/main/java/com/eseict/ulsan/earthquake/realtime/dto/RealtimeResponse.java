package com.eseict.ulsan.earthquake.realtime.dto;

import com.eseict.ulsan.earthquake.realtime.RealtimeSample;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 화면으로 밀어주는 실시간 계측값 한 건.
 *
 * <p>업체가 준 값에 {@code stationCode} 만 더한다 — {@code earthquake.instrument} 의
 * {@code station_code} 와 같은 형태라 화면이 계측기 정보(설치위치·제품명)와 바로 이어붙일 수 있다.
 *
 * <p>차트에 그리는 값은 {@code hpga}(수평 2성분 합성 최대가속도, gal)다. {@code tpga}(3성분)는
 * 보조로 함께 내려준다.
 */
public record RealtimeResponse(
        String stationCode,
        String net,
        String obs,
        LocalDateTime time,
        BigDecimal hpga,
        BigDecimal tpga
) {
    public static RealtimeResponse from(RealtimeSample sample) {
        return new RealtimeResponse(
                sample.net() + "_" + sample.obs(),
                sample.net(),
                sample.obs(),
                sample.time(),
                sample.hpga(),
                sample.tpga()
        );
    }
}
