package com.eseict.ulsan.server.host.db;

import com.eseict.ulsan.server.collector.SnapshotEnricher;
import com.eseict.ulsan.server.domain.KeyMetricSample;
import com.eseict.ulsan.server.domain.Snapshot;
import com.eseict.ulsan.server.domain.Verdict;
import com.eseict.ulsan.server.entity.Server;
import com.eseict.ulsan.server.host.db.dto.DbStats;
import com.eseict.ulsan.server.repository.ServerRepository;
import java.sql.Date;
import java.text.NumberFormat;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** 3번 데이터베이스 상세의 세 칸(연결 상대 · 마지막 저장 · 처리량)을 만든다. 칸마다 따로 실패해도 나머지는 보인다. */
@Service
public class DbStatsService implements SnapshotEnricher {

    private static final Logger log = LoggerFactory.getLogger(DbStatsService.class);
    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm").withZone(DbStatsCollector.SEOUL);

    private final DbStatsReader reader;
    private final JdbcTemplate jdbc;
    private final ServerRepository servers;
    private final DbStatsProperties props;
    private final Clock clock;

    public DbStatsService(DbStatsReader reader, JdbcTemplate jdbc, ServerRepository servers, DbStatsProperties props, Clock clock) {
        this.reader = reader;
        this.jdbc = jdbc;
        this.servers = servers;
        this.props = props;
        this.clock = clock;
    }

    public boolean covers(String host) {
        return props.enabled() && props.host().equals(host);
    }

    public Optional<DbStats> stats(String host) {
        if (!covers(host)) return Optional.empty();
        return Optional.of(new DbStats(host, clock.instant(), connections(), throughput(), lastSave()));
    }

    /** 측정의 「마지막 활동」을 마지막 저장 시각으로 → 메인 카드 「디스크 · 마지막 저장」도 같은 값. 저장 기록이 없으면 그대로. */
    @Override
    public Snapshot enrich(Server server, Snapshot s) {
        if (!covers(server.getHost())) return s;
        DbStats.LastSave b = lastSave();
        if (b == null || b.at() == null) return s;
        KeyMetricSample k = s.keyMetric();
        return new Snapshot(s.measuredAt(), s.collectedAt(), s.source(), s.uptimeDays(), s.nicLinks(), s.services(), s.resources(),
                new KeyMetricSample(k.value(), k.total(), k.baseline(), k.aux(), b.at()), s.note());
    }

    // ---- ④ 연결 상대 ----

    DbStats.Connections connections() {
        try {
            return connections(reader.peers(), names());
        } catch (RuntimeException e) {
            log.warn("[host:{}] 접속 목록 읽기 실패: {}", props.host(), e.toString());
            return null;
        }
    }

    /** IP(앞부분) → 자산대장 짧은 이름 「(운영) 대시보드」 → 「대시보드」. */
    public Map<String, String> names() {
        Map<String, String> m = new HashMap<>();
        for (Server s : servers.findAllByOrderBySeqAsc()) {
            if (s.getIp() == null) continue;
            m.put(s.getIp().replaceAll("/.*$", "").trim(), plainName(s.getShortName()));
        }
        return m;
    }

    public static String plainName(String shortName) {
        return shortName == null ? null : shortName.replaceFirst("^\\([^)]*\\)\\s*", "").trim();
    }

    public static DbStats.Connections connections(List<DbStatsReader.Peer> raw, Map<String, String> names) {
        List<DbStats.Peer> peers = raw.stream()
                .map(p -> new DbStats.Peer(p.ip(), names.get(p.ip()), p.count()))
                .sorted(Comparator.comparingLong(DbStats.Peer::count).reversed().thenComparing(DbStats.Peer::ip))
                .toList();
        long total = peers.stream().mapToLong(DbStats.Peer::count).sum();
        String text;
        if (peers.isEmpty()) text = "다른 서버 접속 없음";
        else {
            List<String> parts = new ArrayList<>();
            for (DbStats.Peer p : peers) parts.add(label(p) + " " + p.count());
            text = peers.size() + "대 접속 — " + String.join(" · ", parts);
        }
        return new DbStats.Connections(text, Verdict.OK, peers.size(), total, peers);
    }

    /** 「대시보드(.103)」. 모르는 IP 는 IP 그대로. */
    static String label(DbStats.Peer p) {
        if (p.name() == null) return p.ip();
        int dot = p.ip().lastIndexOf('.');
        return p.name() + "(" + (dot >= 0 ? p.ip().substring(dot) : p.ip()) + ")";
    }

    // ---- ⑥ 처리량 ----

    DbStats.Throughput throughput() {
        try {
            LocalDate day = LocalDate.ofInstant(clock.instant(), DbStatsCollector.SEOUL);
            List<Object[]> rows = jdbc.query(
                    "select schema_name, table_name, base_ins, last_ins, carried from server.host_db_daily where day = ?",
                    (rs, i) -> new Object[]{rs.getString(1), rs.getString(2),
                            new DailyCount(rs.getLong(3), rs.getLong(4), rs.getLong(5)).today()},
                    Date.valueOf(day));
            if (rows.isEmpty()) return null;   // 수집 전 — 실측 대기
            return throughput(rows, props);
        } catch (RuntimeException e) {
            log.warn("[host:{}] 처리량 읽기 실패: {}", props.host(), e.toString());
            return null;
        }
    }

    /** rows = {스키마, 표, 오늘 행}. */
    static DbStats.Throughput throughput(List<Object[]> rows, DbStatsProperties props) {
        Map<String, List<DbStats.Table>> bySchema = new LinkedHashMap<>();
        long all = 0;
        for (Object[] r : rows) {
            long n = (Long) r[2];
            all += n;
            if (n > 0) bySchema.computeIfAbsent((String) r[0], k -> new ArrayList<>()).add(new DbStats.Table((String) r[1], n));
        }
        List<DbStats.Module> modules = bySchema.entrySet().stream()
                .map(e -> {
                    List<DbStats.Table> t = e.getValue().stream()
                            .sorted(Comparator.comparingLong(DbStats.Table::rows).reversed().thenComparing(DbStats.Table::table)).toList();
                    return new DbStats.Module(e.getKey(), props.label(e.getKey()), t.stream().mapToLong(DbStats.Table::rows).sum(), t);
                })
                .sorted(Comparator.comparingLong(DbStats.Module::rows).reversed().thenComparing(DbStats.Module::schema))
                .toList();
        String text = rows.size() + "테이블 · 오늘 증가 " + NumberFormat.getIntegerInstance(Locale.KOREA).format(all) + "행";
        return new DbStats.Throughput(text, rows.size(), all, modules);
    }

    // ---- ⑤ 마지막 저장 ----

    /** 스키마 → 그 스키마 표에 마지막으로 행이 들어온 시각 (오늘·어제 줄). 5번 「마지막 수신」도 이걸 쓴다. */
    public Map<String, Instant> lastChangeBySchema() {
        LocalDate today = LocalDate.ofInstant(clock.instant(), DbStatsCollector.SEOUL);
        Map<String, Instant> m = new LinkedHashMap<>();
        jdbc.query("""
                select schema_name, max(last_change_at) from server.host_db_daily
                 where day >= ? and last_change_at is not null
                   and schema_name <> 'server'   -- 이 모듈 자기 기록(판정 60초마다)은 빼야 다른 모듈이 멈춘 걸 알 수 있다
                 group by schema_name""",
                rs -> { m.put(rs.getString(1), rs.getTimestamp(2).toInstant()); },
                Date.valueOf(today.minusDays(1)));
        return m;
    }

    /** 오늘(서울 0시부터) 들어온 행 — 스키마별 합계. 5번·13번 「오늘 수신 N건」. */
    public Map<String, Long> todayRowsBySchema() {
        LocalDate day = LocalDate.ofInstant(clock.instant(), DbStatsCollector.SEOUL);
        Map<String, Long> m = new HashMap<>();
        jdbc.query("select schema_name, base_ins, last_ins, carried from server.host_db_daily where day = ?",
                rs -> { m.merge(rs.getString(1), new DailyCount(rs.getLong(2), rs.getLong(3), rs.getLong(4)).today(), Long::sum); },
                Date.valueOf(day));
        return m;
    }

    DbStats.LastSave lastSave() {
        try {
            return lastSave(lastChangeBySchema(), props, clock.instant());
        } catch (RuntimeException e) {
            log.warn("[host:{}] 마지막 저장 읽기 실패: {}", props.host(), e.toString());
            return null;
        }
    }

    static DbStats.LastSave lastSave(Map<String, Instant> bySchema, DbStatsProperties props, Instant now) {
        if (bySchema.isEmpty()) return new DbStats.LastSave("저장 기록 대기", null, null, List.of());
        List<Map.Entry<String, Instant>> recent = bySchema.entrySet().stream()
                .sorted(Map.Entry.<String, Instant>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                .limit(3).toList();
        Instant at = recent.get(0).getValue();
        List<String> modules = recent.stream().map(e -> props.label(e.getKey())).toList();
        String text = "마지막 저장 " + HHMM.format(at) + " — " + String.join(" · ", modules);
        return new DbStats.LastSave(text, ageVerdict(at, now), at, modules);
    }

    /** 다른 「마지막 활동」 규칙과 같은 기준: 30분 넘으면 주의 · 2시간 넘으면 장애. */
    public static Verdict ageVerdict(Instant at, Instant now) {
        long min = Duration.between(at, now).toMinutes();
        return min > 120 ? Verdict.FAIL : min > 30 ? Verdict.WARN : Verdict.OK;
    }
}
