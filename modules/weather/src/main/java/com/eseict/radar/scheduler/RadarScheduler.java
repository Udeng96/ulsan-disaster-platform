package com.eseict.radar.scheduler;

import com.eseict.common.api.KmaApiException;
import com.eseict.radar.service.RadarIngestService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class RadarScheduler {

    private static final Logger log = LoggerFactory.getLogger(RadarScheduler.class);

    private final RadarIngestService ingest;

    public RadarScheduler(RadarIngestService ingest) {
        this.ingest = ingest;
    }

    @Scheduled(fixedDelayString = "${radar.delay-ms}", initialDelay = 30000)
    public void run() {
        try {
            ingest.ingest();
        } catch (KmaApiException e) {
            // 활용신청 대기 / KMA 게이트웨이 5xx / 429 등 외부 요인 → 조용히 경고 후 다음 사이클 재시도
            log.warn("Radar ingest skipped: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Radar ingest failed", e);
        }
    }
}
