package com.eseict.ulsan.server.collector;

import com.eseict.ulsan.server.domain.KeyMetricSample;
import com.eseict.ulsan.server.domain.MeasureMode;
import com.eseict.ulsan.server.domain.Snapshot;
import com.eseict.ulsan.server.entity.Server;
import com.eseict.ulsan.server.entity.ServerSnapshot;
import com.eseict.ulsan.server.repository.ServerRepository;
import com.eseict.ulsan.server.repository.ServerSnapshotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * 2단계(live) — 행정망이라 직접 못 재는 11·13번. 다른 곳에 남은 흔적으로 「살아 있음」을 확인한다(속 빈 점 ○).
 *   11 (연계) 외부망 ← 10번의 마지막 연계 전송 시각 (10번 스냅샷의 lastActivityAt)
 *   13 (전파) 상황전파 ← 3번 DB 에 적재된 부엉이 데이터의 마지막 수신 시각 (monitor.collector.indirect.owl-query)
 * 간접 신호는 가동일·자원이 없다. 핵심값(마지막 활동)만 채우고 판정은 LAST_ACTIVITY_AGE 규칙이 한다.
 */
@Component
@Order(30)
@ConditionalOnProperty(prefix = "monitor.collector", name = "mode", havingValue = "live")
public class IndirectCollector implements CollectorPort {

    private static final Logger log = LoggerFactory.getLogger(IndirectCollector.class);

    /** 13번용. 기본값은 자리표시 — 실제 테이블·열 이름은 3번 DB 확인 후 yml 에서 바꾼다. */
    public static final String DEFAULT_OWL_QUERY = "select max(created_at) from owl.received_messages";

    private final ServerRepository servers;
    private final ServerSnapshotRepository snapshots;
    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final String owlQuery;

    public IndirectCollector(ServerRepository servers, ServerSnapshotRepository snapshots, JdbcTemplate jdbc, Clock clock,
                             org.springframework.core.env.Environment env) {
        this.servers = servers;
        this.snapshots = snapshots;
        this.jdbc = jdbc;
        this.clock = clock;
        this.owlQuery = env.getProperty("monitor.collector.indirect.owl-query", DEFAULT_OWL_QUERY);
    }

    @Override
    public boolean supports(Server server) {
        return server.getMeasureMode() == MeasureMode.INDIRECT;
    }

    @Override
    public Optional<Snapshot> collect(Server server) {
        Instant now = clock.instant();
        Instant last = switch (server.getSeq()) {
            case 11 -> witnessFromPeer("SecureGate-XDP-IN");
            case 13 -> lastOwlReceipt();
            default -> null;
        };
        if (last == null) return Optional.empty();
        return Optional.of(new Snapshot(now, now, "INDIRECT", null, null, null, List.of(),
                new KeyMetricSample(null, null, null, null, last), "간접 — 수신 기록 기준"));
    }

    @Override
    public String name() { return "indirect"; }

    private Instant witnessFromPeer(String peerHost) {
        return servers.findByHost(peerHost)
                .flatMap(p -> snapshots.findFirstByServerIdOrderByCollectedAtDesc(p.getId()))
                .map(ServerSnapshot::toDomain)
                .map(s -> s.keyMetric().lastActivityAt())
                .orElse(null);
    }

    private Instant lastOwlReceipt() {
        try {
            Timestamp ts = jdbc.queryForObject(owlQuery, Timestamp.class);
            return ts == null ? null : ts.toInstant();
        } catch (Exception e) {
            log.warn("owl query 실패 ({}): {}", owlQuery, e.getMessage());
            return null;
        }
    }
}
