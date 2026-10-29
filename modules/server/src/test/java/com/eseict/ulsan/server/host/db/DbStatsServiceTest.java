package com.eseict.ulsan.server.host.db;

import static org.assertj.core.api.Assertions.assertThat;

import com.eseict.ulsan.server.domain.Verdict;
import com.eseict.ulsan.server.host.db.dto.DbStats;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DbStatsServiceTest {

    private final DbStatsProperties props = new DbStatsProperties(null, null, Map.of("owl", "부엉이 수신"));

    @Test
    void 연결_상대는_많은_순_자산대장_짧은_이름과_IP_끝자리() {
        var c = DbStatsService.connections(List.of(
                new DbStatsReader.Peer("192.0.2.152", 5), new DbStatsReader.Peer("192.0.2.124", 12),
                new DbStatsReader.Peer("192.0.2.2", 1)),
                Map.of("192.0.2.124", "대시보드", "192.0.2.152", "IoT"));
        assertThat(c.text()).isEqualTo("3대 접속 — 대시보드(.103) 12 · IoT(.104) 5 · 192.0.2.2 1");
        assertThat(c.total()).isEqualTo(18);
        assertThat(c.verdict()).isEqualTo(Verdict.OK);
    }

    @Test
    void 접속이_없으면_한_줄로() {
        assertThat(DbStatsService.connections(List.of(), Map.of()).text()).isEqualTo("다른 서버 접속 없음");
    }

    @Test
    void 짧은_이름의_괄호_머리는_뺀다() {
        assertThat(DbStatsService.plainName("(운영) 대시보드")).isEqualTo("대시보드");
        assertThat(DbStatsService.plainName("IoT")).isEqualTo("IoT");
    }

    @Test
    void 처리량은_표_수와_오늘_들어온_행_모듈별_정리() {
        List<Object[]> rows = List.of(
                new Object[]{"cctv", "cctv_info", 200L}, new Object[]{"earthquake", "sensor_raw", 12_000L},
                new Object[]{"earthquake", "event", 3L}, new Object[]{"owl", "msg", 0L}, new Object[]{"zz", "t", 5L});
        DbStats.Throughput t = DbStatsService.throughput(rows, props);
        assertThat(t.text()).isEqualTo("5테이블 · 오늘 증가 12,208행");
        assertThat(t.modules()).extracting(DbStats.Module::label).containsExactly("지진", "CCTV", "zz");
        assertThat(t.modules().get(0).tables()).extracting(DbStats.Table::table).containsExactly("sensor_raw", "event");
        assertThat(t.modules().get(0).rows()).isEqualTo(12_003);
    }

    @Test
    void 저장_기록이_없으면_대기() {
        var s = DbStatsService.lastSave(Map.of(), props, Instant.now());
        assertThat(s.text()).isEqualTo("저장 기록 대기");
        assertThat(s.verdict()).isNull();
    }

    @Test
    void 마지막_저장은_최근_모듈_세_개까지() {
        Instant now = Instant.parse("2026-10-15T05:10:00Z");   // 서울 14:10
        var s = DbStatsService.lastSave(Map.of(
                "earthquake", now.minusSeconds(60), "cctv", now.minusSeconds(300),
                "owl", now.minusSeconds(600), "slope", now.minusSeconds(3600)), props, now);
        assertThat(s.text()).isEqualTo("마지막 저장 14:09 — 지진 · CCTV · 부엉이 수신");
        assertThat(s.verdict()).isEqualTo(Verdict.OK);
        assertThat(s.modules()).containsExactly("지진", "CCTV", "부엉이 수신");
    }

    @Test
    void 마지막_저장이_30분_넘으면_확인_필요_2시간_넘으면_이상() {
        Instant now = Instant.parse("2026-10-15T05:10:00Z");
        assertThat(DbStatsService.ageVerdict(now.minusSeconds(31 * 60), now)).isEqualTo(Verdict.WARN);
        assertThat(DbStatsService.ageVerdict(now.minusSeconds(121 * 60), now)).isEqualTo(Verdict.FAIL);
    }
}
