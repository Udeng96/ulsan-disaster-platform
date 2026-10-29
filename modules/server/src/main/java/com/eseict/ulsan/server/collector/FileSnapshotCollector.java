package com.eseict.ulsan.server.collector;

import com.eseict.ulsan.server.config.MonitorProperties;
import com.eseict.ulsan.server.domain.HostMetrics;
import com.eseict.ulsan.server.domain.KeyMetricSample;
import com.eseict.ulsan.server.domain.MeasureMode;
import com.eseict.ulsan.server.domain.ResourceKind;
import com.eseict.ulsan.server.domain.ResourceReading;
import com.eseict.ulsan.server.domain.Snapshot;
import com.eseict.ulsan.server.entity.Server;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 1단계(스냅샷 모드) 수집기. 시트에 기록된 값(seed/snapshots-seed.json)을 수집 주기마다 다시 넣는다.
 * replay=true: collectedAt 을 지금으로 찍어 화면이 살아 있게 하고, measuredAt 은 원래 시각을 유지해 「언제 잰 값」인지 남긴다.
 * live 모드로 바꾸면(monitor.collector.mode=live) 이 빈은 뜨지 않는다.
 * 자원 칸: "resources": [{kind, pct, detail}] 가 있으면 그대로(방화벽·스위치), 없으면 서버 원재료(diskRootPct …)를 서버 칸 구성으로 바꾼다.
 */
@Component
@Order(100)
@ConditionalOnProperty(prefix = "monitor.collector", name = "mode", havingValue = "snapshot", matchIfMissing = true)
public class FileSnapshotCollector implements CollectorPort {

    private static final Logger log = LoggerFactory.getLogger(FileSnapshotCollector.class);

    private final Map<String, Entry> byHost = new HashMap<>();
    /** 데모 파일의 lastActivityAgoMinutes — 「N분 전」을 수집 시각 기준으로 되살린다. */
    private final Map<String, Integer> agoMinutes = new HashMap<>();
    private final boolean replay;
    private final Clock clock;

    public FileSnapshotCollector(MonitorProperties props, ObjectMapper mapper, Clock clock) throws IOException {
        this.clock = clock;
        MonitorProperties.SnapshotFile cfg = props.collector().snapshot();
        this.replay = cfg == null || cfg.replay();
        String path = cfg == null || cfg.path() == null ? "classpath:seed/snapshots-seed.json" : cfg.path();
        Resource res = new DefaultResourceLoader().getResource(path);
        try (InputStream in = res.getInputStream()) {
            JsonNode root = mapper.readTree(in);
            for (JsonNode n : root.path("snapshots")) {
                byHost.put(n.path("host").asText(), parse(n));
                if (n.hasNonNull("lastActivityAgoMinutes")) agoMinutes.put(n.path("host").asText(), n.get("lastActivityAgoMinutes").asInt());
            }
        }
        log.info("snapshot file loaded: {} hosts from {}", byHost.size(), path);
    }

    @Override
    public boolean supports(Server server) {
        return server.getMeasureMode() != MeasureMode.NONE && byHost.containsKey(server.getHost());
    }

    @Override
    public Optional<Snapshot> collect(Server server) {
        Entry e = byHost.get(server.getHost());
        if (e == null) return Optional.empty();
        Snapshot s = e.snapshot();
        Instant now = clock.instant();
        Instant collected = replay ? now : s.measuredAt();
        KeyMetricSample key = s.keyMetric();
        Integer ago = agoMinutes.get(server.getHost());
        if (ago != null && replay) {
            key = new KeyMetricSample(key.value(), key.total(), key.baseline(), key.aux(), now.minusSeconds(ago * 60L));
        }
        List<ResourceReading> res = e.resources() != null ? e.resources() : e.metrics().resources(server.getResourceLayout());
        return Optional.of(new Snapshot(s.measuredAt(), collected, "SNAPSHOT", s.uptimeDays(), s.nicLinks(), s.services(),
                res, key, s.note()));
    }

    @Override
    public String name() { return "snapshot-file"; }

    /** 파일 한 항목. resources 가 null 이면 metrics 로 서버 칸을 만든다. */
    record Entry(Snapshot snapshot, HostMetrics metrics, List<ResourceReading> resources) {}

    static Entry parse(JsonNode n) {
        Instant measured = OffsetDateTime.parse(n.path("collectedAt").asText()).toInstant();
        Instant last = n.hasNonNull("lastActivityAt") ? OffsetDateTime.parse(n.get("lastActivityAt").asText()).toInstant() : null;
        HostMetrics m = new HostMetrics(intOrNull(n, "threads"), dbl(n, "load1"), dbl(n, "load5"), dbl(n, "load15"),
                dbl(n, "cpuPct"), dbl(n, "memPct"), dbl(n, "diskRootPct"), dbl(n, "diskDataPct"), dbl(n, "networkPct"));
        List<ResourceReading> res = null;
        if (n.has("resources")) {
            res = new ArrayList<>();
            for (JsonNode r : n.get("resources")) {
                res.add(ResourceReading.of(ResourceKind.valueOf(r.path("kind").asText()), dbl(r, "pct"), text(r, "detail", null)));
            }
        }
        Snapshot s = new Snapshot(measured, measured, text(n, "source", "SNAPSHOT"), dbl(n, "uptimeDays"),
                text(n, "nicLinks", null), text(n, "services", null), List.of(),
                new KeyMetricSample(dbl(n, "keyMetricValue"), dbl(n, "keyMetricTotal"), dbl(n, "keyMetricBaseline"),
                        text(n, "keyMetricAux", null), last),
                text(n, "note", null));
        return new Entry(s, m, res);
    }

    private static Double dbl(JsonNode n, String k) { return n.hasNonNull(k) ? n.get(k).asDouble() : null; }
    private static Integer intOrNull(JsonNode n, String k) { return n.hasNonNull(k) ? (int) Math.round(n.get(k).asDouble()) : null; }
    private static String text(JsonNode n, String k, String def) { return n.hasNonNull(k) ? n.get(k).asText() : def; }
}
