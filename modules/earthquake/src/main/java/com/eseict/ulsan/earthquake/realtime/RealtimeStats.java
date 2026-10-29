package com.eseict.ulsan.earthquake.realtime;

import java.util.concurrent.atomic.AtomicLong;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 실시간 수신 이상 건수 — 관측소 간 값 중복과 형식 이상을 센다.
 *
 * <p>개별 로그가 넘치지 않도록 <b>첫 건과 이후 {@value #LOG_EVERY} 건마다만</b> 남긴다.
 * 하루 요약은 남기지 않는다 (2026-10-13 사용자 결정).
 *
 * <p>증가는 구독 스레드 한 곳이지만 다른 스레드에서 읽을 수 있어 {@link AtomicLong} 을 쓴다.
 */
@Component
@Slf4j
public class RealtimeStats {

    /** 개별 이상 로그 폭주 억제 — 첫 건과 이후 이 배수마다만 남긴다. */
    private static final long LOG_EVERY = 100;

    private final AtomicLong duplicated = new AtomicLong();
    private final AtomicLong invalid = new AtomicLong();

    void countDuplicated(String previousObs, RealtimeSample sample) {
        long count = duplicated.incrementAndGet();
        if (count == 1 || count % LOG_EVERY == 0) {
            log.warn("값 중복 — {} 에 {}/{} 가 같은 값({}/{}). 누적 {}건",
                    sample.time(), previousObs, sample.obs(),
                    sample.hpga(), sample.tpga(), count);
        }
    }

    void countInvalid(RealtimeSample sample) {
        long count = invalid.incrementAndGet();
        if (count == 1 || count % LOG_EVERY == 0) {
            log.warn("실시간 계측값 형식 이상 — 버림 (누적 {}건): {}", count, sample);
        }
    }
}
