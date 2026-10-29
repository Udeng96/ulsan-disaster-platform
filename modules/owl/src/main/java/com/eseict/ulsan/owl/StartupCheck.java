package com.eseict.ulsan.owl;

import com.eseict.ulsan.owl.ingest.RegionFilter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * 기동 직후 설정값을 한 번에 찍는다 — 배포 직후 포트·접속정보·조회 주기를 바로 확인하기 위해.
 *
 * <p>첫 부엉이 조회({@code OwlRefreshScheduler})보다 먼저 찍히도록 가장 앞 순서로 둔다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StartupCheck {

    private final Environment env;
    private final RegionFilter regionFilter;

    @Order(Ordered.HIGHEST_PRECEDENCE)
    @EventListener(ApplicationReadyEvent.class)
    public void report() {
        String port = env.getProperty("local.server.port", env.getProperty("server.port", "8080"));
        String contextPath = env.getProperty("server.servlet.context-path", "/");
        log.info("===== 기동 점검 =====");
        log.info("[PORT] {}", port);
        log.info("[END-POINT] http://<서버>:{}{}", port, contextPath);
        log.info("[OWL-API] {} / 기관 {} / 계정 {}",
                env.getProperty("owl.ingest.msgapi.domain"),
                env.getProperty("owl.ingest.msgapi.org-cd"),
                env.getProperty("owl.ingest.msgapi.usr-id"));
        log.info("[REGION] {} {}", regionFilter.sido(), regionFilter.sigungu());
        log.info("[SCHEDULE] 부엉이 이벤트를 {}마다 조회합니다",
                toText(env.getProperty("owl.ingest.refresh-interval-ms", Long.class, 300000L)));
        log.info("=====================");
    }

    /** 300000 → "5분", 30000 → "30초". */
    private static String toText(long ms) {
        if (ms % 60000 == 0) {
            return (ms / 60000) + "분";
        }
        return (ms / 1000) + "초";
    }
}
