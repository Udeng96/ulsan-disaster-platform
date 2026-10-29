package com.eseict.ulsan.server.host.db;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * PostgreSQL 이 원래 가지고 있는 통계 표를 읽는다. 쓰기 없음.
 * pg_stat_activity  : 지금 붙어 있는 접속 (어느 IP 에서). 다른 DB 계정의 접속은 pg_read_all_stats 권한이 있어야 IP 가 보인다.
 * pg_stat_user_tables : 지금 붙은 DB(2026_ulsan) 의 표마다 넣은 행 누적.
 */
@Component
public class DbStatsReader {

    public record Peer(String ip, long count) {}
    public record TableIns(String schema, String table, long inserted) {}

    private final JdbcTemplate jdbc;

    public DbStatsReader(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 일반 접속만, 출발 IP 별 개수. 같은 서버 안(소켓·127.0.0.1)은 뺀다. */
    public List<Peer> peers() {
        return jdbc.query("""
                select host(client_addr) as ip, count(*) as n
                  from pg_stat_activity
                 where backend_type = 'client backend' and client_addr is not null
                   and host(client_addr) not in ('127.0.0.1', '::1')
                 group by 1""",
                (rs, i) -> new Peer(rs.getString("ip"), rs.getLong("n")));
    }

    /** 이 모듈이 세려고 쓰는 하루 누적 표(host_db_daily · host_net_daily)는 뺀다. */
    public List<TableIns> tables() {
        return jdbc.query("""
                select schemaname, relname, n_tup_ins from pg_stat_user_tables
                 where not (schemaname = 'server' and relname in ('host_db_daily', 'host_net_daily'))""",
                (rs, i) -> new TableIns(rs.getString(1), rs.getString(2), rs.getLong(3)));
    }
}
