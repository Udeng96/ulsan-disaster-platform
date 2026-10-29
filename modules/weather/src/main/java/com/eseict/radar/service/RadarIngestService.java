package com.eseict.radar.service;

import com.eseict.radar.api.RadarClient;
import com.eseict.radar.config.RadarProperties;
import com.eseict.radar.domain.RadarImage;
import com.eseict.radar.repository.RadarImageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Service
public class RadarIngestService {

    private static final Logger log = LoggerFactory.getLogger(RadarIngestService.class);
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final RadarClient client;
    private final RadarProperties properties;
    private final RadarImageRepository repository;

    public RadarIngestService(RadarClient client,
                              RadarProperties properties,
                              RadarImageRepository repository) {
        this.client = client;
        this.properties = properties;
        this.repository = repository;
    }

    @Transactional
    public int ingest() {
        LocalDate today = LocalDate.now(KST);
        List<String> urls = client.fetchImageUrls(today);

        int saved = 0;
        int skipped = 0;
        OffsetDateTime now = OffsetDateTime.now();
        for (String url : urls) {
            if (repository.existsBySourceUrl(url)) {
                skipped++;
                continue;
            }
            Optional<OffsetDateTime> kstOpt = RadarFileNameParser.parseObservedKst(url);
            if (kstOpt.isEmpty()) {
                log.warn("Failed to parse radar timestamp from URL: {}", url);
                continue;
            }
            OffsetDateTime kst = kstOpt.get();
            OffsetDateTime utc = kst.atZoneSameInstant(ZoneOffset.UTC).toOffsetDateTime();

            repository.save(new RadarImage(
                    properties.dataType(), utc, kst, url, now
            ));
            saved++;
        }
        log.info("Radar ingest done type={} fetched={} new={} skipped={}",
                properties.dataType(), urls.size(), saved, skipped);
        return saved;
    }
}
