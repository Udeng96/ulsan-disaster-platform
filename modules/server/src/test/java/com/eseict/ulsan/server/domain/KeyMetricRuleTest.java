package com.eseict.ulsan.server.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/** v2.7 §1-3 표의 「주의 / 장애 기준」을 그대로 검증한다. 표가 바뀌면 이 테스트가 먼저 깨져야 한다. */
class KeyMetricRuleTest {

    static final Instant NOW = Instant.parse("2026-10-06T05:02:00Z"); // KST 14:02

    @Test void 방화벽_차단_평소대비() {
        var r = KeyMetricRule.BLOCKED_VS_BASELINE;
        assertThat(r.apply(new KeyMetricSample(347.0, null, 248.0, null, null), NOW))
                .isEqualTo(new KeyMetricResult("347건", "평소의 1.4배", Verdict.OK));
        assertThat(r.apply(new KeyMetricSample(500.0, null, 248.0, null, null), NOW).verdict()).isEqualTo(Verdict.WARN);
        assertThat(r.apply(new KeyMetricSample(800.0, null, 248.0, null, null), NOW).verdict()).isEqualTo(Verdict.FAIL);
        assertThat(r.apply(KeyMetricSample.EMPTY, NOW)).isEqualTo(KeyMetricResult.PENDING);
    }

    @Test void 스위치_에러포트() {
        var r = KeyMetricRule.TRAFFIC_ERROR_PORTS;
        assertThat(r.apply(new KeyMetricSample(1.2, 1.0, null, null, null), NOW))
                .isEqualTo(new KeyMetricResult("1.2Gbps", "에러 포트 1", Verdict.WARN));
        assertThat(r.apply(new KeyMetricSample(0.8, 0.0, null, null, null), NOW).verdict()).isEqualTo(Verdict.OK);
    }

    @Test void DB_디스크와_마지막_저장() {
        var r = KeyMetricRule.DISK_AND_LAST_SAVE;
        assertThat(r.apply(new KeyMetricSample(2.0, null, null, null, null), NOW))
                .isEqualTo(new KeyMetricResult("2%", "저장 기록 대기", Verdict.OK));
        assertThat(r.apply(new KeyMetricSample(2.0, null, null, null, NOW.minusSeconds(60)), NOW))
                .isEqualTo(new KeyMetricResult("2%", "마지막 저장 14:01", Verdict.OK));
        assertThat(r.apply(new KeyMetricSample(2.0, null, null, null, NOW.minusSeconds(31 * 60)), NOW).verdict()).isEqualTo(Verdict.WARN);
        assertThat(r.apply(new KeyMetricSample(96.0, null, null, null, NOW), NOW).verdict()).isEqualTo(Verdict.FAIL);
    }

    @Test void 서비스_응답() {
        var r = KeyMetricRule.SERVICE_RESPONSE;
        assertThat(r.apply(new KeyMetricSample(null, null, null, "OK", NOW), NOW))
                .isEqualTo(new KeyMetricResult("정상", "마지막 처리 14:02", Verdict.OK));
        assertThat(r.apply(new KeyMetricSample(null, null, null, "slow", null), NOW).verdict()).isEqualTo(Verdict.WARN);
        assertThat(r.apply(new KeyMetricSample(null, null, null, "DOWN", null), NOW).verdict()).isEqualTo(Verdict.FAIL);
    }

    @Test void 재난서비스_6종() {
        var r = KeyMetricRule.RUNNING_OF_TOTAL;
        assertThat(r.apply(new KeyMetricSample(6.0, 6.0, null, null, null), NOW)).isEqualTo(new KeyMetricResult("6 / 6", "정상 구동", Verdict.OK));
        assertThat(r.apply(new KeyMetricSample(5.0, 6.0, null, null, null), NOW).verdict()).isEqualTo(Verdict.WARN);
        assertThat(r.apply(new KeyMetricSample(3.0, 6.0, null, null, null), NOW).verdict()).isEqualTo(Verdict.FAIL);
    }

    @Test void 마지막활동_30분_2시간() {
        var r = KeyMetricRule.LAST_ACTIVITY_AGE;
        assertThat(r.apply(new KeyMetricSample(null, null, null, null, NOW.minusSeconds(60)), NOW))
                .isEqualTo(new KeyMetricResult("14:01", "1분 전", Verdict.OK));
        assertThat(r.apply(new KeyMetricSample(null, null, null, null, NOW.minusSeconds(31 * 60)), NOW).verdict()).isEqualTo(Verdict.WARN);
        assertThat(r.apply(new KeyMetricSample(null, null, null, null, NOW.minusSeconds(121 * 60)), NOW))
                .isEqualTo(new KeyMetricResult("12:01", "2시간 1분 전", Verdict.FAIL));
    }

    @Test void CCTV_채널_0은_장애() {
        var r = KeyMetricRule.CHANNELS_NONZERO;
        assertThat(r.apply(new KeyMetricSample(12.0, null, null, null, null), NOW)).isEqualTo(new KeyMetricResult("12", "채널", Verdict.OK));
        assertThat(r.apply(new KeyMetricSample(0.0, null, null, null, null), NOW).verdict()).isEqualTo(Verdict.FAIL);
    }

    @Test void 내부연계_기관_끊김() {
        var r = KeyMetricRule.RELAY_AGE_AND_PEERS;
        assertThat(r.apply(new KeyMetricSample(4.0, 4.0, null, null, NOW.minusSeconds(60)), NOW))
                .isEqualTo(new KeyMetricResult("14:01", "4곳 정상", Verdict.OK));
        assertThat(r.apply(new KeyMetricSample(3.0, 4.0, null, "보건소", NOW.minusSeconds(60)), NOW))
                .isEqualTo(new KeyMetricResult("14:01", "1곳 끊김 · 보건소", Verdict.WARN));
    }

    @Test void 외부기관_수신() {
        var r = KeyMetricRule.RECEIVED_OF_TOTAL;
        assertThat(r.apply(new KeyMetricSample(4.0, 5.0, null, "산림청 42분 전", null), NOW))
                .isEqualTo(new KeyMetricResult("4 / 5", "산림청 42분 전", Verdict.WARN));
        assertThat(r.apply(new KeyMetricSample(2.0, 5.0, null, null, null), NOW).verdict()).isEqualTo(Verdict.FAIL);
        assertThat(r.apply(new KeyMetricSample(5.0, 5.0, null, null, null), NOW).aux()).isEqualTo("전부 수신 중");
    }
}
