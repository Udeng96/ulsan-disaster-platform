package com.eseict.airquality.scheduler;

import com.eseict.airquality.service.AirqualityIngestService;
import com.eseict.common.init.LocationInitializer;
import com.eseict.common.repository.LocationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AirqualityScheduler {

    private static final Logger log = LoggerFactory.getLogger(AirqualityScheduler.class);

    private final AirqualityIngestService ingest;
    private final LocationRepository locationRepo;

    public AirqualityScheduler(AirqualityIngestService ingest, LocationRepository locationRepo) {
        this.ingest = ingest;
        this.locationRepo = locationRepo;
    }

    @Scheduled(fixedDelayString = "${airquality.delay-ms}", initialDelay = 20000)
    public void run() {
        try {
            locationRepo.findByName(LocationInitializer.ULSAN_NAMGU)
                    .ifPresent(ingest::ingest);
        } catch (Exception e) {
            log.error("Airquality ingest failed", e);
        }
    }
}
