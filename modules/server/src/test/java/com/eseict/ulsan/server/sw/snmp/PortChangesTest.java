package com.eseict.ulsan.server.sw.snmp;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class PortChangesTest {

    final OffsetDateTime now = OffsetDateTime.parse("2026-10-15T14:02:00+09:00");

    static SwInterface port(int idx, String name, boolean up, Long inErr) {
        return SwInterface.builder().collectedAt(OffsetDateTime.now()).ifIndex(idx).ifName(name).linkUp(up)
                .speedMbps(1000).inErrors(inErr).outErrors(0L).build();
    }

    @Test
    void 앞면_라벨() {
        assertThat(PortChanges.label("ge6")).isEqualTo("P6");
        assertThat(PortChanges.label("xe2")).isEqualTo("SFP2");
    }

    @Test
    void 연결_끊김_에러_늘어남을_남긴다() {
        var before = Map.of(5006, port(5006, "ge6", true, 10L), 5011, port(5011, "ge11", false, 0L), 5007, port(5007, "ge7", true, 0L));
        var after = List.of(port(5006, "ge6", true, 13L), port(5011, "ge11", true, 0L), port(5007, "ge7", false, 0L));
        assertThat(PortChanges.ports(before, after, now)).extracting(SwEvent::getDetail)
                .containsExactly("P6 에러 늘어남 (+3)", "P11 연결됨 1G", "P7 끊김");
    }

    @Test
    void 직전_샘플이_없거나_에러가_줄면_남기지_않는다() {
        assertThat(PortChanges.ports(Map.of(), List.of(port(5006, "ge6", true, 13L)), now)).isEmpty();
        assertThat(PortChanges.ports(Map.of(5006, port(5006, "ge6", true, 50L)), List.of(port(5006, "ge6", true, 2L)), now)).isEmpty();
    }

    @Test
    void 처음_보는_장비는_아는_장비도_직전_MAC도_아닐_때_한_번만() {
        var cur = Map.of("02:00:00:00:00:01", "ge12", "02:00:00:00:00:01", "ge1");
        assertThat(PortChanges.newMacs(cur, Set.of(), Set.of("02:00:00:00:00:01"), now)).extracting(SwEvent::getDetail)
                .containsExactly("P12 처음 보는 장비 (MAC 02:00:00:00:00:01)");
        // 다음 회차: 직전 MAC 표에 이미 있으므로 다시 남기지 않는다
        assertThat(PortChanges.newMacs(cur, Set.of("02:00:00:00:00:01", "02:00:00:00:00:01"), Set.of("02:00:00:00:00:01"), now)).isEmpty();
    }
}
