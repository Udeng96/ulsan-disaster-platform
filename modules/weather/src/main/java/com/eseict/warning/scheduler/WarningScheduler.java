package com.eseict.warning.scheduler;

import com.eseict.common.init.LocationInitializer;
import com.eseict.common.repository.LocationRepository;
import com.eseict.warning.service.WarningIngestService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class WarningScheduler {

    private static final Logger log = LoggerFactory.getLogger(WarningScheduler.class);

    private final WarningIngestService ingest;
    private final LocationRepository locationRepo;

    public WarningScheduler(WarningIngestService ingest, LocationRepository locationRepo) {
        this.ingest = ingest;
        this.locationRepo = locationRepo;
    }

    @Scheduled(fixedDelayString = "${warning.delay-ms}", initialDelay = 25000)
    public void run() {
        try {
            locationRepo.findByName(LocationInitializer.ULSAN_NAMGU)
                    .ifPresent(loc -> ingest.ingest(loc, 2));
        } catch (Exception e) {
            log.error("Warning ingest failed", e);
        }
    }
}
