package com.eseict.ulsan.server.host.db;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** 60초마다 표별 넣은 행 누적을 읽어 오늘 줄(host_db_daily)을 고친다. ⑥ 처리량의 바탕. */
@Component
public class DbStatsCollector {

    private static final Logger log = LoggerFactory.getLogger(DbStatsCollector.class);
    static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final DbStatsReader reader;
    private final JdbcTemplate jdbc;
    private final DbStatsProperties props;
    private final Clock clock;

    public DbStatsCollector(DbStatsReader reader, JdbcTemplate jdbc, DbStatsProperties props, Clock clock) {
        this.reader = reader;
        this.jdbc = jdbc;
        this.props = props;
        this.clock = clock;
    }

    @Scheduled(initialDelayString = "PT15S", fixedDelayString = "${db-stats.interval:PT60S}")
    @Transactional
    public void run() {
        if (!props.enabled()) return;
        try {
            int n = collect();
            log.debug("[host:{}] db 통계 {}표", props.host(), n);
        } catch (RuntimeException e) {
            log.warn("[host:{}] db 통계 읽기 실패: {}", props.host(), e.toString());
        }
    }

    int collect() {
        Instant now = clock.instant();
        LocalDate day = LocalDate.ofInstant(now, SEOUL);
        Map<String, DailyCount> today = new HashMap<>();
        Map<String, Timestamp> changedAt = new HashMap<>();
        jdbc.query("select schema_name, table_name, base_ins, last_ins, carried, last_change_at from server.host_db_daily where day = ?",
                rs -> {
                    String k = key(rs.getString(1), rs.getString(2));
                    today.put(k, new DailyCount(rs.getLong(3), rs.getLong(4), rs.getLong(5)));
                    changedAt.put(k, rs.getTimestamp(6));
                },
                Date.valueOf(day));
        Timestamp nowTs = Timestamp.from(now);
        List<Object[]> rows = new ArrayList<>();
        for (DbStatsReader.TableIns t : reader.tables()) {
            String k = key(t.schema(), t.table());
            DailyCount prev = today.get(k);
            DailyCount c = prev == null ? DailyCount.first(t.inserted()) : prev.next(t.inserted());
            // 행이 늘었으면 지금이 마지막 저장. 그날 첫 줄은 0시 이전 것일 수 있어 비워 둔다
            Timestamp changed = prev != null && c.today() > prev.today() ? nowTs : changedAt.get(k);
            rows.add(new Object[]{Date.valueOf(day), t.schema(), t.table(), c.base(), c.last(), c.carried(), nowTs, changed});
        }
        jdbc.batchUpdate("""
                insert into server.host_db_daily (day, schema_name, table_name, base_ins, last_ins, carried, updated_at, last_change_at)
                values (?, ?, ?, ?, ?, ?, ?, ?)
                on conflict (day, schema_name, table_name) do update
                   set base_ins = excluded.base_ins, last_ins = excluded.last_ins, carried = excluded.carried,
                       updated_at = excluded.updated_at, last_change_at = excluded.last_change_at""", rows);
        return rows.size();
    }

    private static String key(String schema, String table) {
        return schema + "." + table;
    }
}
