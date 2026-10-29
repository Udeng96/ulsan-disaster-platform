package com.eseict.ulsan.server.service;

import com.eseict.ulsan.server.config.MonitorProperties;
import com.eseict.ulsan.server.repository.ServerSnapshotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * 오래된 기록 정리. 매일 03:10 (서울). 기간은 monitor.retention (기본 raw 30일 · fw-log 30일 · snapshots 90일).
 * 자산대장·사양·포트 표처럼 사람이 넣은 값은 지우지 않는다.
 */
@Service
public class RetentionService {

    private static final Logger log = LoggerFactory.getLogger(RetentionService.class);

    /** 표 이름 → 시각 열. 이름은 코드에 고정 (설정값으로 SQL 을 만들지 않는다). */
    private static final String[][] RAW_TABLES = {
            {"server.fw_status", "collected_at"},
            {"server.fw_interface", "collected_at"},
            {"server.sw_status", "collected_at"},
            {"server.sw_interface", "collected_at"},
            {"server.sw_event", "at"},
            {"server.host_db_daily", "updated_at"},
            {"server.host_net_daily", "updated_at"},
    };

    private final JdbcTemplate jdbc;
    private final ServerSnapshotRepository snapshots;
    private final MonitorProperties props;
    private final Clock clock;

    public RetentionService(JdbcTemplate jdbc, ServerSnapshotRepository snapshots, MonitorProperties props, Clock clock) {
        this.jdbc = jdbc;
        this.snapshots = snapshots;
        this.props = props;
        this.clock = clock;
    }

    @Scheduled(cron = "0 10 3 * * *", zone = "Asia/Seoul")
    @Transactional
    public void purge() {
        MonitorProperties.Retention r = props.retention();
        Instant now = clock.instant();
        for (String[] t : RAW_TABLES) delete(t[0], t[1], now, r.raw());
        delete("server.fw_log", "received_at", now, r.fwLog());
        Instant before = now.minus(r.snapshots());
        int n = snapshots.deleteOlderThan(before);
        if (n > 0) log.info("정리 server.server_snapshots: {}행 ({} 이전)", n, before);
    }

    private void delete(String table, String column, Instant now, Duration keep) {
        Instant before = now.minus(keep);
        int n = jdbc.update("delete from " + table + " where " + column + " < ?", Timestamp.from(before));
        if (n > 0) log.info("정리 {}: {}행 ({} 이전)", table, n, before);
    }
}
