package com.eseict.dashboard.web;

import com.eseict.airquality.service.AirqualityIngestService;
import com.eseict.common.init.LocationInitializer;
import com.eseict.common.repository.LocationRepository;
import com.eseict.forecast.service.ForecastIngestService;
import com.eseict.warning.service.WarningIngestService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/weather")
@CrossOrigin // dev 중 프론트 직접 호출 대비 (Vite proxy 사용 시 불필요지만 안전)
public class WeatherController {

    private final WeatherService weatherService;
    private final AirqualityIngestService airqualityIngest;
    private final ForecastIngestService forecastIngest;
    private final WarningIngestService warningIngest;
    private final LocationRepository locationRepository;

    public WeatherController(WeatherService weatherService,
                             AirqualityIngestService airqualityIngest,
                             ForecastIngestService forecastIngest,
                             WarningIngestService warningIngest,
                             LocationRepository locationRepository) {
        this.weatherService = weatherService;
        this.airqualityIngest = airqualityIngest;
        this.forecastIngest = forecastIngest;
        this.warningIngest = warningIngest;
        this.locationRepository = locationRepository;
    }

    /** 좌측 IP wall 패널 (LeftPanel) 의 모든 weather 슬롯 데이터 한 번에 응답. */
    @GetMapping("/summary")
    public WeatherSummaryResponse summary() {
        return weatherService.summary();
    }

    /** 디버그용 — 모든 ingest 수동 트리거. 응답으로 저장 건수 반환. */
    @PostMapping("/refresh")
    public Map<String, Object> refresh() {
        return locationRepository.findByName(LocationInitializer.ULSAN_NAMGU)
                .map(loc -> Map.<String, Object>of(
                        "observation", forecastIngest.ingestObservation(loc),
                        "prediction", forecastIngest.ingestPrediction(loc),
                        "airquality", airqualityIngest.ingest(loc),
                        "warning", warningIngest.ingest(loc, 2)
                ))
                .orElse(Map.of("error", "location not found"));
    }
}
