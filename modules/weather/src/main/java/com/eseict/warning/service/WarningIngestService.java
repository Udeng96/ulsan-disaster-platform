package com.eseict.warning.service;

import com.eseict.common.domain.Location;
import com.eseict.warning.api.WarningClient;
import com.eseict.warning.domain.Warning;
import com.eseict.warning.repository.WarningRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class WarningIngestService {

    private static final Logger log = LoggerFactory.getLogger(WarningIngestService.class);
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    // tmFc 포맷: "202605181800" (yyyyMMddHHmm, KST)
    private static final DateTimeFormatter TMFC_FMT = DateTimeFormatter.ofPattern("yyyyMMddHHmm");

    private final WarningClient client;
    private final WarningRepository repository;

    public WarningIngestService(WarningClient client, WarningRepository repository) {
        this.client = client;
        this.repository = repository;
    }

    /** 최근 N일치 특보 폴링 (보통 N=2: 어제+오늘). */
    @Transactional
    public int ingest(Location location, int recentDays) {
        String stnId = location.getWarningStnId();
        if (stnId == null || stnId.isBlank()) {
            log.warn("Location {} has no warningStnId, skip", location.getName());
            return 0;
        }
        LocalDate today = LocalDate.now(KST);
        LocalDate from = today.minusDays(Math.max(0, recentDays - 1));

        List<JsonNode> items = client.fetchList(stnId, from, today);
        if (items.isEmpty()) {
            log.debug("No warnings stnId={} from={} to={}", stnId, from, today);
            return 0;
        }

        OffsetDateTime now = OffsetDateTime.now();
        int saved = 0;
        for (JsonNode it : items) {
            String tmFcStr = it.path("tmFc").asText("");
            String title = it.path("title").asText("");
            String stnName = it.path("stnNm").asText("");
            String content = it.has("t6") ? it.path("t6").asText("")
                          : it.has("other") ? it.path("other").asText("") : null;

            if (tmFcStr.isBlank() || title.isBlank()) continue;

            OffsetDateTime tmFc;
            try {
                LocalDateTime ldt = LocalDateTime.parse(tmFcStr.trim(), TMFC_FMT);
                tmFc = ldt.atZone(KST).toOffsetDateTime();
            } catch (Exception e) {
                log.warn("Unparseable tmFc: {}", tmFcStr);
                continue;
            }

            if (repository.existsByStnIdAndTmFcAndTitle(stnId, tmFc, title)) continue;

            repository.save(new Warning(stnId, stnName, tmFc, title, content, now));
            saved++;
        }
        log.info("Warning saved stnId={} fetched={} new={}", stnId, items.size(), saved);
        return saved;
    }
}
