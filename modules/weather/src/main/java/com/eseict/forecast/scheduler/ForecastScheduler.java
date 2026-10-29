package com.eseict.forecast.scheduler;

import com.eseict.common.init.LocationInitializer;
import com.eseict.common.repository.LocationRepository;
import com.eseict.forecast.service.ForecastIngestService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ForecastScheduler {

    private static final Logger log = LoggerFactory.getLogger(ForecastScheduler.class);

    private final ForecastIngestService ingest;
    private final LocationRepository locationRepo;

    public ForecastScheduler(ForecastIngestService ingest, LocationRepository locationRepo) {
        this.ingest = ingest;
        this.locationRepo = locationRepo;
    }

    /** 초단기실황 (매 정시 발표, 10분 후 사용 가능 → 10분 주기 폴링). */
    @Scheduled(fixedDelayString = "${forecast.observation-delay-ms}", initialDelay = 10000)
    public void runObservation() {
        try {
            locationRepo.findByName(LocationInitializer.ULSAN_NAMGU)
                    .ifPresent(ingest::ingestObservation);
        } catch (Exception e) {
            log.error("Observation ingest failed", e);
        }
    }

    /** 초단기예보 (매 30분 발표, 45분 후 사용 가능 → 30분 주기 폴링). */
    @Scheduled(fixedDelayString = "${forecast.prediction-delay-ms}", initialDelay = 15000)
    public void runPrediction() {
        try {
            locationRepo.findByName(LocationInitializer.ULSAN_NAMGU)
                    .ifPresent(ingest::ingestPrediction);
        } catch (Exception e) {
            log.error("Prediction ingest failed", e);
        }
    }
}
