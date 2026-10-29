package com.eseict.ulsan.server.host.live;

import com.eseict.ulsan.server.domain.MeasureMode;
import com.eseict.ulsan.server.domain.Verdict;
import com.eseict.ulsan.server.host.db.DailyCount;
import com.eseict.ulsan.server.host.db.DbStatsProperties;
import com.eseict.ulsan.server.host.db.DbStatsService;
import com.eseict.ulsan.server.repository.ServerRepository;
import java.sql.Date;
import java.sql.Timestamp;
import java.text.NumberFormat;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * 3번 말고 다른 서버 상세의 ④ 연결 상대 · ⑤ 최근 활동 · ⑥ 처리량 (사용자 2026-10-16).
 *  - 4~10·12번 공통: SSH 로 읽은 값(SshCollector → record). ④ 붙어 있는 상대 IP 별 · ⑤ 주요 서비스 실행 중 + 언제부터 · ⑥ 오늘 받음·보냄
 *  - 5번 · 13번: ⑤ ⑥ 은 3번 DB 기록 (host-live.db-received). 13번은 행정망이라 간접
 *  - 11번: 10번 기록으로 간접 (host-live.mirror)
 * 마지막으로 읽은 값은 메모리에 두고(재시작하면 다음 수집 60초 뒤 다시 참), 하루 누적 바이트만 host_net_daily 에 적는다.
 */
@Service
public class HostLiveService {

    private static final Logger log = LoggerFactory.getLogger(HostLiveService.class);
    static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm").withZone(SEOUL);
    private static final DateTimeFormatter SINCE = DateTimeFormatter.ofPattern("MM-dd HH:mm").withZone(SEOUL);

    private final Map<String, HostLive> latest = new ConcurrentHashMap<>();
    private final JdbcTemplate jdbc;
    private final DbStatsService db;
    private final DbStatsProperties dbProps;
    private final ServerRepository servers;
    private final HostLiveProperties props;
    private final Clock clock;

    public HostLiveService(JdbcTemplate jdbc, DbStatsService db, DbStatsProperties dbProps, ServerRepository servers,
                           HostLiveProperties props, Clock clock) {
        this.jdbc = jdbc;
        this.db = db;
        this.dbProps = dbProps;
        this.servers = servers;
        this.props = props;
        this.clock = clock;
    }

    /** SSH 수집 한 번의 결과. 하루 누적 실패는 로그만 — 측정 기록은 막지 않는다. */
    public void record(String host, HostLive r) {
        latest.put(host, r);
        if (r.rxBytes() == null || r.txBytes() == null) return;
        try {
            saveNet(host, r);
        } catch (RuntimeException e) {
            log.warn("[host:{}] 오늘 받음·보냄 저장 실패: {}", host, e.toString());
        }
    }

    private void saveNet(String host, HostLive r) {
        LocalDate day = LocalDate.ofInstant(r.at(), SEOUL);
        List<DailyCount[]> prev = jdbc.query(
                "select base_rx, last_rx, carried_rx, base_tx, last_tx, carried_tx from server.host_net_daily where day = ? and host = ?",
                (rs, i) -> new DailyCount[]{new DailyCount(rs.getLong(1), rs.getLong(2), rs.getLong(3)),
                        new DailyCount(rs.getLong(4), rs.getLong(5), rs.getLong(6))},
                Date.valueOf(day), host);
        DailyCount rx = prev.isEmpty() ? DailyCount.first(r.rxBytes()) : prev.get(0)[0].next(r.rxBytes());
        DailyCount tx = prev.isEmpty() ? DailyCount.first(r.txBytes()) : prev.get(0)[1].next(r.txBytes());
        jdbc.update("""
                insert into server.host_net_daily (day, host, base_rx, last_rx, carried_rx, base_tx, last_tx, carried_tx, updated_at)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict (day, host) do update
                   set base_rx = excluded.base_rx, last_rx = excluded.last_rx, carried_rx = excluded.carried_rx,
                       base_tx = excluded.base_tx, last_tx = excluded.last_tx, carried_tx = excluded.carried_tx,
                       updated_at = excluded.updated_at""",
                Date.valueOf(day), host, rx.base(), rx.last(), rx.carried(), tx.base(), tx.last(), tx.carried(), Timestamp.from(r.at()));
    }

    /** 상세 ④ ⑤ ⑥. 3번(db-stats 가 맡음)과 규칙이 없는 서버는 비어 있음. */
    public Optional<HostDetail> detail(String host) {
        if (db.covers(host)) return Optional.empty();
        String source = props.mirror().get(host);
        if (source != null) return Optional.of(mirror(source));
        List<String> schemas = props.dbReceived().get(host);
        HostLive live = fresh(host);
        if (schemas == null && live == null) return Optional.empty();
        String conn = null;
        Verdict connV = null;
        if (live != null) {
            conn = DbStatsService.connections(live.peers(), db.names()).text();
            connV = Verdict.OK;
        }
        if (schemas != null) {
            // 13번처럼 직접 못 들어가는 서버만 「간접」. 5번은 직접 서버라 ④ 는 SSH 값(없으면 실측 대기)
            boolean indirect = servers.findByHost(host).map(s -> s.getMeasureMode() == MeasureMode.INDIRECT).orElse(false);
            String tail = indirect ? " (3번 DB 기록)" : "";
            if (indirect) conn = "간접 — 3번 DB 기록 기준";
            DbReceived r = dbReceived(schemas, tail);
            return Optional.of(new HostDetail(conn, connV, r.text(), r.verdict(), r.throughput()));
        }
        HostDetail.Service s = services(live.services());
        return Optional.of(new HostDetail(conn, connV, s.text(), s.verdict(), netText(today(host))));
    }

    /** 11번 ← 10번: ⑤ ⑥ 은 10번 값에 (간접), ④ 는 「간접 — 10번 기록 기준」. */
    private HostDetail mirror(String source) {
        String no = servers.findByHost(source).map(s -> s.getSeq() + "번").orElse(source);
        HostDetail d = detail(source).orElse(HostDetail.EMPTY);
        return new HostDetail("간접 — " + no + " 기록 기준", null,
                d.lastText() == null ? null : d.lastText() + " (간접)", d.lastVerdict(),
                d.throughputText() == null ? null : d.throughputText() + " (간접)");
    }

    /** 마지막으로 SSH 로 읽은 값 (staleAfter 안). 전면·후면 표가 디스크·랜카드 줄에 쓴다. */
    public Optional<HostLive> latest(String host) {
        return Optional.ofNullable(fresh(host));
    }

    private HostLive fresh(String host) {
        HostLive r = latest.get(host);
        if (r == null || Duration.between(r.at(), clock.instant()).compareTo(props.staleAfter()) > 0) return null;
        return r;
    }

    // ---- ⑤ 주요 서비스 ----

    /** 「nginx 실행 중 · 10-02 09:13부터」. 여러 개면 「 / 」로. 하나라도 멈추면 장애. 설정이 없으면 「주요 서비스 미지정」. */
    static HostDetail.Service services(List<HostLive.ServiceState> list) {
        if (list.isEmpty()) return new HostDetail.Service("주요 서비스 미지정", null);
        List<String> parts = new ArrayList<>();
        Verdict v = Verdict.OK;
        for (HostLive.ServiceState s : list) {
            if (s.running()) parts.add(s.name() + " 실행 중 · " + SINCE.format(s.since()) + "부터");
            else { parts.add(s.name() + " 멈춤"); v = Verdict.FAIL; }
        }
        return new HostDetail.Service(String.join(" / ", parts), v);
    }

    // ---- ⑥ 오늘 받음 · 보냄 ----

    /** {받음, 보냄} 오늘 바이트. 아직 줄이 없으면 null. */
    long[] today(String host) {
        try {
            List<long[]> rows = jdbc.query(
                    "select base_rx, last_rx, carried_rx, base_tx, last_tx, carried_tx from server.host_net_daily where day = ? and host = ?",
                    (rs, i) -> new long[]{new DailyCount(rs.getLong(1), rs.getLong(2), rs.getLong(3)).today(),
                            new DailyCount(rs.getLong(4), rs.getLong(5), rs.getLong(6)).today()},
                    Date.valueOf(LocalDate.ofInstant(clock.instant(), SEOUL)), host);
            return rows.isEmpty() ? null : rows.get(0);
        } catch (RuntimeException e) {
            log.warn("[host:{}] 오늘 받음·보냄 읽기 실패: {}", host, e.toString());
            return null;
        }
    }

    static String netText(long[] today) {
        if (today == null) return null;
        return "오늘 받음 " + bytes(today[0]) + " · 보냄 " + bytes(today[1]);
    }

    /** 1024 단위, 소수 한 자리 (B 는 정수). */
    static String bytes(long b) {
        String[] unit = {"B", "KB", "MB", "GB", "TB"};
        double v = b;
        int u = 0;
        while (v >= 1024 && u < unit.length - 1) { v /= 1024; u++; }
        return u == 0 ? b + "B" : String.format(Locale.ROOT, "%.1f%s", v, unit[u]);
    }

    // ---- 5번 · 13번: 3번 DB 기록 ----

    record DbReceived(String text, Verdict verdict, String throughput) {}

    private DbReceived dbReceived(List<String> schemas, String tail) {
        try {
            return dbReceived(db.lastChangeBySchema(), db.todayRowsBySchema(), schemas, dbProps, clock.instant(), tail);
        } catch (RuntimeException e) {
            log.warn("3번 DB 수신 기록 읽기 실패 {}: {}", schemas, e.toString());
            return new DbReceived(null, null, null);
        }
    }

    /** 「마지막 수신 09:05 — GIS · 급경사지」 · 「오늘 수신 1,234건」. 해당 스키마의 기록만. */
    static DbReceived dbReceived(Map<String, Instant> lastBySchema, Map<String, Long> rowsBySchema, List<String> schemas,
                                 DbStatsProperties labels, Instant now, String tail) {
        List<Map.Entry<String, Instant>> recent = lastBySchema.entrySet().stream()
                .filter(e -> schemas.contains(e.getKey()))
                .sorted(Map.Entry.<String, Instant>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                .limit(3).toList();
        String text;
        Verdict v = null;
        if (recent.isEmpty()) text = "수신 기록 대기" + tail;
        else {
            Instant at = recent.get(0).getValue();
            text = "마지막 수신 " + HHMM.format(at) + " — "
                    + String.join(" · ", recent.stream().map(e -> labels.label(e.getKey())).toList()) + tail;
            v = DbStatsService.ageVerdict(at, now);
        }
        long rows = schemas.stream().mapToLong(s -> rowsBySchema.getOrDefault(s, 0L)).sum();
        String thru = rowsBySchema.isEmpty() ? null : "오늘 수신 " + NumberFormat.getIntegerInstance(Locale.KOREA).format(rows) + "건" + tail;
        return new DbReceived(text, v, thru);
    }
}
