package com.eseict.forecast.service;

import com.eseict.common.domain.Location;
import com.eseict.forecast.api.ForecastBaseTime;
import com.eseict.forecast.api.ForecastClient;
import com.eseict.forecast.api.ForecastItem;
import com.eseict.forecast.domain.Observation;
import com.eseict.forecast.domain.Prediction;
import com.eseict.forecast.repository.ObservationRepository;
import com.eseict.forecast.repository.PredictionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ForecastIngestService {

    private static final Logger log = LoggerFactory.getLogger(ForecastIngestService.class);
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyyMMddHHmm");

    private final ForecastClient client;
    private final ObservationRepository observationRepo;
    private final PredictionRepository predictionRepo;

    public ForecastIngestService(ForecastClient client,
                                 ObservationRepository observationRepo,
                                 PredictionRepository predictionRepo) {
        this.client = client;
        this.observationRepo = observationRepo;
        this.predictionRepo = predictionRepo;
    }

    /** 초단기실황 1회 호출 → 1행 upsert. */
    @Transactional
    public int ingestObservation(Location location) {
        LocalDateTime baseKst = ForecastBaseTime.currentObservationBase(LocalDateTime.now(KST));
        List<ForecastItem> items = client.fetchObservation(location.getGridNx(), location.getGridNy(), baseKst);
        if (items.isEmpty()) {
            log.info("Observation NODATA location={} base={}", location.getName(), baseKst);
            return 0;
        }

        OffsetDateTime observedAt = baseKst.atZone(KST).toOffsetDateTime();
        if (observationRepo.existsByLocationIdAndObservedAt(location.getId(), observedAt)) {
            log.debug("Observation already exists location={} at={}", location.getName(), observedAt);
            return 0;
        }

        Map<String, String> byCategory = new HashMap<>();
        for (ForecastItem it : items) byCategory.put(it.category(), it.value());

        Observation obs = new Observation(
                location.getId(),
                observedAt,
                ValueParser.parseDecimal(byCategory.get("T1H")),
                ValueParser.parseDecimal(byCategory.get("REH")),
                ValueParser.parseRainfall(byCategory.get("RN1")),
                ValueParser.parseDecimal(byCategory.get("WSD")),
                ValueParser.parseDecimal(byCategory.get("VEC")),
                ValueParser.parseInt(byCategory.get("PTY")),
                OffsetDateTime.now()
        );
        observationRepo.save(obs);
        log.info("Observation saved location={} at={} T1H={} REH={}",
                location.getName(), observedAt, obs.getTemperatureC(), obs.getHumidityPct());
        return 1;
    }

    /** 초단기예보 1회 호출 → N개 미래시각 × 카테고리 → N행 upsert. */
    @Transactional
    public int ingestPrediction(Location location) {
        LocalDateTime baseKst = ForecastBaseTime.currentPredictionBase(LocalDateTime.now(KST));
        List<ForecastItem> items = client.fetchPrediction(location.getGridNx(), location.getGridNy(), baseKst);
        if (items.isEmpty()) {
            log.info("Prediction NODATA location={} base={}", location.getName(), baseKst);
            return 0;
        }

        OffsetDateTime baseAt = baseKst.atZone(KST).toOffsetDateTime();

        // (valueDate+valueTime) → category → value 로 그룹핑
        Map<String, Map<String, String>> groupedByForecastTime = new LinkedHashMap<>();
        for (ForecastItem it : items) {
            String key = it.valueDate() + it.valueTime();
            groupedByForecastTime
                    .computeIfAbsent(key, k -> new HashMap<>())
                    .put(it.category(), it.value());
        }

        OffsetDateTime now = OffsetDateTime.now();
        int saved = 0;
        for (Map.Entry<String, Map<String, String>> entry : groupedByForecastTime.entrySet()) {
            LocalDateTime fcstLdt = LocalDateTime.parse(entry.getKey(), DT_FMT);
            OffsetDateTime forecastAt = fcstLdt.atZone(KST).toOffsetDateTime();

            if (predictionRepo.existsByLocationIdAndBaseAtAndForecastAt(
                    location.getId(), baseAt, forecastAt)) {
                continue;
            }

            Map<String, String> cats = entry.getValue();
            BigDecimal rainfall = ValueParser.parseRainfall(cats.get("RN1"));

            Prediction p = new Prediction(
                    location.getId(),
                    baseAt, forecastAt,
                    ValueParser.parseInt(cats.get("SKY")),
                    ValueParser.parseInt(cats.get("PTY")),
                    ValueParser.parseDecimal(cats.get("T1H")),
                    ValueParser.parseDecimal(cats.get("REH")),
                    rainfall,
                    cats.get("RN1"),
                    ValueParser.parseDecimal(cats.get("WSD")),
                    ValueParser.parseDecimal(cats.get("VEC")),
                    now
            );
            predictionRepo.save(p);
            saved++;
        }
        log.info("Prediction saved location={} base={} new={} (총 {} 시각)",
                location.getName(), baseAt, saved, groupedByForecastTime.size());
        return saved;
    }
}
