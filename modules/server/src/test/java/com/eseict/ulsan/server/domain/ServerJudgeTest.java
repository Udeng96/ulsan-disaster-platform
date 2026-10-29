package com.eseict.ulsan.server.domain;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ServerJudgeTest {

    static final Instant NOW = Instant.parse("2026-10-06T05:02:00Z");
    final ServerJudge judge = new ServerJudge(new Staleness(Duration.ofSeconds(60)));

    static Snapshot snap(Instant collected, ResourceLayout layout, Double root, Double mem, Double load5, Integer threads, Double data,
                         KeyMetricSample key) {
        HostMetrics m = new HostMetrics(threads, null, load5, null, null, mem, root, data, null);
        return new Snapshot(collected, collected, "SSH", 50.0, null, null, m.resources(layout), key, null);
    }

    @Test void 스냅샷_없으면_실측대기() {
        Judgement j = judge.judge(MeasureMode.DIRECT, KeyMetricRule.LAST_ACTIVITY_AGE, ResourceLayout.SERVER_NET, null, NOW);
        assertThat(j.overall()).isEqualTo(Verdict.UNKNOWN);
        assertThat(j.uptimeText()).isEqualTo("실측 대기");
        assertThat(j.resources()).hasSize(4);
        assertThat(j.resources().get(3).kind()).isEqualTo(ResourceKind.NETWORK);
    }

    @Test void 정상_서버_자원4개_순서() {
        Snapshot s = snap(NOW.minusSeconds(10), ResourceLayout.SERVER_DATA, 1.8, 3.0, 0.06, 48, 0.0,
                new KeyMetricSample(2.0, null, null, null, NOW));
        Judgement j = judge.judge(MeasureMode.DIRECT, KeyMetricRule.DISK_AND_LAST_SAVE, ResourceLayout.SERVER_DATA, s, NOW);
        assertThat(j.overall()).isEqualTo(Verdict.OK);
        assertThat(j.uptimeText()).isEqualTo("가동 50일");
        assertThat(j.resources()).extracting(ResourceReading::kind)
                .containsExactly(ResourceKind.SYSTEM_DISK, ResourceKind.MEMORY, ResourceKind.CPU, ResourceKind.DATA_DISK);
        assertThat(j.resources().get(2).pct()).isEqualTo(0.1);          // 0.06 / 48 → 0.1%
        assertThat(j.resources().get(2).detail()).isEqualTo("0.1/48코어");
        assertThat(j.reasons()).isEmpty();
    }

    @Test void 자원_임계_초과는_종합판정을_끌어올린다() {
        Snapshot s = snap(NOW, ResourceLayout.SERVER_NET, 88.0, 50.0, 1.0, 16, null, KeyMetricSample.EMPTY);
        Judgement j = judge.judge(MeasureMode.DIRECT, null, ResourceLayout.SERVER_NET, s, NOW);
        assertThat(j.overall()).isEqualTo(Verdict.WARN);
        assertThat(j.reasons()).containsExactly("시스템디스크 88%");
        Snapshot bad = snap(NOW, ResourceLayout.SERVER_NET, 10.0, 96.0, 1.0, 16, null, KeyMetricSample.EMPTY);
        assertThat(judge.judge(MeasureMode.DIRECT, null, ResourceLayout.SERVER_NET, bad, NOW).overall()).isEqualTo(Verdict.FAIL);
    }

    @Test void 방화벽_세션은_기준이_없어_색에_안_들어간다() {
        List<ResourceReading> res = List.of(
                ResourceReading.of(ResourceKind.LOG_SSD, 12.0, "120G/1000G"),
                ResourceReading.of(ResourceKind.MEMORY, 41.0, "6.6G/16G"),
                ResourceReading.of(ResourceKind.CPU, 22.0, "10코어"),
                ResourceReading.of(ResourceKind.SESSION, 99.0, "792만/800만"));
        Snapshot s = new Snapshot(NOW, NOW, "SNMP", 214.0, null, null, res, KeyMetricSample.EMPTY, null);
        Judgement j = judge.judge(MeasureMode.SNMP, null, ResourceLayout.FIREWALL, s, NOW);
        assertThat(j.overall()).isEqualTo(Verdict.OK);
        assertThat(j.resources().get(3).judged()).isFalse();
        assertThat(j.resources().get(3).verdict()).isNull();            // 파랑
        assertThat(j.resources().get(0).verdict()).isEqualTo(Verdict.OK);
    }

    @Test void 스위치_부하는_숫자만_있어도_실측대기가_아니다() {
        ResourceReading load = ResourceReading.of(ResourceKind.LOAD, null, "부하 11.9");
        assertThat(load.measured()).isTrue();
        assertThat(load.verdict()).isNull();
        assertThat(ResourceReading.pending(ResourceKind.LOAD).verdict()).isEqualTo(Verdict.UNKNOWN);
    }

    @Test void 핵심값_주의는_종합_주의() {
        Snapshot s = snap(NOW, ResourceLayout.SERVER_NET, 1.0, 3.0, 0.0, 8, null,
                new KeyMetricSample(4.0, 5.0, null, "산림청 42분 전", null));
        Judgement j = judge.judge(MeasureMode.DIRECT, KeyMetricRule.RECEIVED_OF_TOTAL, ResourceLayout.SERVER_NET, s, NOW);
        assertThat(j.overall()).isEqualTo(Verdict.WARN);
        assertThat(j.keyMetric().value()).isEqualTo("4 / 5");
        assertThat(j.reasons()).containsExactly("산림청 42분 전");
    }

    @Test void 오래된_스냅샷_3배_주의_10배_실측대기() {
        Snapshot warn = snap(NOW.minusSeconds(200), ResourceLayout.SERVER_NET, 1.0, 1.0, 0.0, 8, null, KeyMetricSample.EMPTY);
        assertThat(judge.judge(MeasureMode.DIRECT, null, ResourceLayout.SERVER_NET, warn, NOW).staleness()).isEqualTo(Verdict.WARN);
        assertThat(judge.judge(MeasureMode.DIRECT, null, ResourceLayout.SERVER_NET, warn, NOW).reasons()).contains("갱신 지연");
        Snapshot dead = snap(NOW.minusSeconds(700), ResourceLayout.SERVER_NET, 1.0, 1.0, 0.0, 8, null, KeyMetricSample.EMPTY);
        assertThat(judge.judge(MeasureMode.DIRECT, null, ResourceLayout.SERVER_NET, dead, NOW).overall()).isEqualTo(Verdict.UNKNOWN);
    }

    @Test void 간접_서버는_핵심값만으로_판정() {
        Snapshot s = new Snapshot(NOW, NOW, "INDIRECT", null, null, null, List.of(),
                new KeyMetricSample(null, null, null, null, NOW.minusSeconds(60)), null);
        Judgement j = judge.judge(MeasureMode.INDIRECT, KeyMetricRule.LAST_ACTIVITY_AGE, ResourceLayout.SERVER_NET, s, NOW);
        assertThat(j.overall()).isEqualTo(Verdict.OK);
        assertThat(j.uptimeText()).isEqualTo("실측 대기");
        assertThat(j.resources()).extracting(ResourceReading::verdict).containsOnly(Verdict.UNKNOWN);
        assertThat(j.keyMetric().value()).isEqualTo("14:01");
    }

    @Test void NONE은_무조건_실측대기() {
        Snapshot s = snap(NOW, ResourceLayout.SERVER_NET, 1.0, 1.0, 0.0, 8, null, KeyMetricSample.EMPTY);
        assertThat(judge.judge(MeasureMode.NONE, null, ResourceLayout.SERVER_NET, s, NOW).overall()).isEqualTo(Verdict.UNKNOWN);
        assertThat(judge.judge(MeasureMode.NONE, null, ResourceLayout.SERVER_NET, s, NOW).reasons()).isEqualTo(List.of("수집 대상 아님"));
    }
}
