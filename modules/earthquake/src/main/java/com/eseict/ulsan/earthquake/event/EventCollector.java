package com.eseict.ulsan.earthquake.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 업체 DB 이벤트 수집 스케줄러.
 *
 * <p>{@code earthquake.event.polling=false} 면 이 빈이 만들어지지 않아 업체 DB 를 건드리지 않는다.
 *
 * <p>업체 DB 장애로 예외가 나가면 다음 주기가 아예 안 도므로 여기서 삼키고 로그만 남긴다.
 */
@Component
@ConditionalOnProperty(prefix = "earthquake.event", name = "polling", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class EventCollector {

    private final EventIngestService ingestService;

    private boolean failing;

    @Scheduled(fixedDelayString = "${earthquake.event.interval}")
    public void collect() {
        try {
            EventIngestService.Result result = ingestService.ingest();
            // 새 이벤트가 있을 때만 찍는다. 수집이 멈췄는지는 실패/복구 로그로 본다.
            if (result.total() > 0) {
                log.info("[EVENT] 이벤트를 조회했습니다 - 총 {}건( 기상청 {}건 / 현장 {}건 )",
                        result.total(), result.kma(), result.local());
            }
            if (failing) {
                log.info("[EVENT] 이벤트 수집이 복구되었습니다.");
                failing = false;
            }
        } catch (Exception e) {
            if (!failing) {
                log.warn("[EVENT] 이벤트 수집에 실패했습니다.", e);   // 복구까지 반복하지 않는다
                failing = true;
            }
        }
    }
}
