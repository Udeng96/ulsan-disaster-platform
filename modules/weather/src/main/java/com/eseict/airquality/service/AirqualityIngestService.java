package com.eseict.airquality.service;

import com.eseict.airquality.api.AirqualityClient;
import com.eseict.airquality.domain.AirQuality;
import com.eseict.airquality.repository.AirQualityRepository;
import com.eseict.common.domain.Location;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class AirqualityIngestService {

    private static final Logger log = LoggerFactory.getLogger(AirqualityIngestService.class);
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final AirqualityClient client;
    private final AirQualityRepository repository;

    public AirqualityIngestService(AirqualityClient client, AirQualityRepository repository) {
        this.client = client;
        this.repository = repository;
    }

    @Transactional
    public int ingest(Location location) {
        String station = location.getAirStationName();
        List<JsonNode> rows = client.fetchByStation(station);
        if (rows.isEmpty()) {
            log.info("Airquality NODATA station={}", station);
            return 0;
        }

        OffsetDateTime now = OffsetDateTime.now();
        int saved = 0;
        for (JsonNode r : rows) {
            String dataTime = r.path("dataTime").asText("");
            if (dataTime.isBlank()) continue;
            // "2026-05-19 16:00" → KST OffsetDateTime
            LocalDateTime ldt;
            try {
                ldt = LocalDateTime.parse(dataTime.trim(), DT_FMT);
            } catch (Exception e) {
                log.warn("Unparseable dataTime: {}", dataTime);
                continue;
            }
            OffsetDateTime measuredAt = ldt.atZone(KST).toOffsetDateTime();
            if (repository.existsByStationNameAndMeasuredAt(station, measuredAt)) continue;

            AirQuality aq = new AirQuality(
                    location.getId(), station, measuredAt,
                    decimal(r, "pm10Value"), integer(r, "pm10Grade"),
                    decimal(r, "pm25Value"), integer(r, "pm25Grade"),
                    decimal(r, "o3Value"),   integer(r, "o3Grade"),
                    decimal(r, "no2Value"),  integer(r, "no2Grade"),
                    decimal(r, "so2Value"),  integer(r, "so2Grade"),
                    decimal(r, "coValue"),   integer(r, "coGrade"),
                    decimal(r, "khaiValue"), integer(r, "khaiGrade"),
                    now
            );
            repository.save(aq);
            saved++;
        }
        log.info("Airquality saved station={} fetched={} new={}", station, rows.size(), saved);
        return saved;
    }

    private static BigDecimal decimal(JsonNode n, String key) {
        String v = n.path(key).asText("");
        if (v.isBlank() || "-".equals(v)) return null;
        try {
            return new BigDecimal(v);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Integer integer(JsonNode n, String key) {
        String v = n.path(key).asText("");
        if (v.isBlank() || "-".equals(v)) return null;
        try {
            return Integer.parseInt(v);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
