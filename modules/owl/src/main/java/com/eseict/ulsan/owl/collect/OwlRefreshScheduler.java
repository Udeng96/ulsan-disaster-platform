package com.eseict.ulsan.owl.collect;

import java.time.Duration;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;

/**
 * 부엉이 주기 조회 — 기동 직후 1번, 이후 {@code owl.ingest.refresh-interval-ms} 마다.
 *
 * <p>기동 점검 로그(StartupCheck) 뒤에 찍히도록 기동 완료 이벤트에서 가장 늦게 시작한다.
 * 이전 조회가 끝난 뒤부터 주기를 센다(fixed delay) — 조회가 길어져도 겹치지 않는다.
 */
@Component
@RequiredArgsConstructor
public class OwlRefreshScheduler {

    private final TaskScheduler taskScheduler;
    private final CollectService collectService;

    @Value("${owl.ingest.refresh-interval-ms}")
    private long intervalMs;

    @Order(Ordered.LOWEST_PRECEDENCE)
    @EventListener(ApplicationReadyEvent.class)
    public void start() {
        taskScheduler.scheduleWithFixedDelay(collectService::refresh, Instant.now(),
                Duration.ofMillis(intervalMs));
    }
}
