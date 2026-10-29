package com.eseict.ulsan.server.collector;

import com.eseict.ulsan.server.config.MonitorProperties;
import com.eseict.ulsan.server.domain.Snapshot;
import com.eseict.ulsan.server.entity.Server;
import com.eseict.ulsan.server.repository.ServerRepository;
import com.eseict.ulsan.server.service.SnapshotService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * monitor.collector.interval 마다 13대를 돈다. 서버마다 supports() 가 true 인 첫 수집기 하나만 쓴다.
 * 순서: 등록된 빈 순서(@Order) — 방화벽(1) · 스위치(2) · SSH(10) · 간접(30) · 시트 파일(100).
 */
@Component
public class CollectorScheduler {

    private static final Logger log = LoggerFactory.getLogger(CollectorScheduler.class);

    private final ServerRepository servers;
    private final List<CollectorPort> collectors;
    private final SnapshotService snapshots;
    private final MonitorProperties props;
    private final List<SnapshotEnricher> enrichers;

    public CollectorScheduler(ServerRepository servers, List<CollectorPort> collectors, SnapshotService snapshots, MonitorProperties props,
                              List<SnapshotEnricher> enrichers) {
        this.servers = servers;
        this.collectors = collectors;
        this.snapshots = snapshots;
        this.props = props;
        this.enrichers = enrichers;
    }

    @Scheduled(initialDelayString = "PT10S", fixedDelayString = "${monitor.collector.interval:PT60S}")
    public void run() {
        List<Server> all = servers.findAllByOrderBySeqAsc();
        int ok = 0, same = 0, skip = 0, fail = 0;
        for (Server s : all) {
            Optional<CollectorPort> c = collectors.stream().filter(x -> x.supports(s)).findFirst();
            if (c.isEmpty()) { skip++; continue; }
            try {
                Optional<Snapshot> snap = c.get().collect(s);
                if (snap.isEmpty()) fail++;
                else if (snapshots.record(s.getHost(), enrich(s, snap.get())).isPresent()) ok++;
                else same++;   // 장비를 새로 읽지 못해 같은 측정이 다시 옴 — 오래됨 판정이 알아서 처리
            } catch (RuntimeException e) {
                fail++;
                log.warn("collect {} via {} failed: {}", s.getHost(), c.get().name(), e.toString());
            }
        }
        log.info("collect cycle [{}]: ok={} same={} fail={} skip={} of {}", props.collector().mode(), ok, same, fail, skip, all.size());
    }

    private Snapshot enrich(Server s, Snapshot snap) {
        for (SnapshotEnricher e : enrichers) snap = e.enrich(s, snap);
        return snap;
    }
}
