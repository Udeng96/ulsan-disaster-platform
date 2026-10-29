package com.eseict.ulsan.server.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class VerdictTest {

    @Test void 나쁜쪽이_이긴다_UNKNOWN은_양보한다() {
        assertThat(Verdict.OK.worse(Verdict.WARN)).isEqualTo(Verdict.WARN);
        assertThat(Verdict.FAIL.worse(Verdict.WARN)).isEqualTo(Verdict.FAIL);
        assertThat(Verdict.UNKNOWN.worse(Verdict.OK)).isEqualTo(Verdict.OK);
        assertThat(Verdict.WARN.worse(Verdict.UNKNOWN)).isEqualTo(Verdict.WARN);
        assertThat(Verdict.UNKNOWN.worse(null)).isEqualTo(Verdict.UNKNOWN);
    }

    @Test void 자원_임계() {
        assertThat(ResourceKind.SYSTEM_DISK.judge(84.9)).isEqualTo(Verdict.OK);
        assertThat(ResourceKind.SYSTEM_DISK.judge(85.0)).isEqualTo(Verdict.WARN);
        assertThat(ResourceKind.SYSTEM_DISK.judge(95.0)).isEqualTo(Verdict.FAIL);
        assertThat(ResourceKind.CPU.judge(null)).isEqualTo(Verdict.UNKNOWN);
    }

    @Test void 가동일_표기() {
        assertThat(UptimeText.of(214.7)).isEqualTo("가동 214일");
        assertThat(UptimeText.of(0.5)).isEqualTo("가동 12시간");
        assertThat(UptimeText.of(null)).isEqualTo("실측 대기");
    }
}
