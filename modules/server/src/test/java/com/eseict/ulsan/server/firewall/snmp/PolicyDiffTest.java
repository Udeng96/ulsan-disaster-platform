package com.eseict.ulsan.server.firewall.snmp;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class PolicyDiffTest {

    static FwPolicy p(int idx, String name, String action) {
        return FwPolicy.builder().policyIdx(idx).name(name).action(action).collectedAt(OffsetDateTime.now()).build();
    }

    @Test
    void 추가_삭제_허용차단_바뀜을_이름으로_찾는다() {
        PolicyDiff d = PolicyDiff.of(
                List.of(p(1, "A", "ALLOW"), p(2, "B", "ALLOW"), p(3, "C", "ALLOW")),
                List.of(p(1, "A", "ALLOW"), p(2, "C", "DENY"), p(3, "D", "ALLOW")));
        assertThat(d.added()).containsExactly("D");
        assertThat(d.removed()).containsExactly("B");
        assertThat(d.actionChanged()).containsExactly("C");
    }

    @Test
    void 순서만_바뀐_것은_변경이_아니다() {
        assertThat(PolicyDiff.of(
                List.of(p(1, "A", "ALLOW"), p(2, "B", "DENY")),
                List.of(p(1, "B", "DENY"), p(2, "A", "ALLOW"))).isEmpty()).isTrue();
    }

    @Test
    void 최근_활동_한_줄() {
        FwPolicyChange c = new FwPolicyChange(OffsetDateTime.now(), 2, 1, List.of(), List.of("B"), List.of("C"));
        assertThat(c.summary()).isEqualTo("정책 변경 · 추가 0 · 삭제 「B」 · 허용/차단 바뀜 「C」");
    }
}
