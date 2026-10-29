package com.eseict.ulsan.slope.facility;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * 단계 변화 이력 — 구간을 변화 한 건씩으로 푼다.
 */
class AreaEventServiceTest {

    private static final LocalDateTime T = LocalDateTime.of(2026, 10, 14, 9, 0);

    private static AreaLevelEvent period(long id, String level, String prev, LocalDateTime start, LocalDateTime end) {
        AreaLevelEvent e = new AreaLevelEvent(1L, level, prev, start, null, List.of());
        ReflectionTestUtils.setField(e, "id", id);
        if (end != null) {
            e.end(end);
        }
        return e;
    }

    @Test
    @DisplayName("이어진 끝은 한 번만, 정상으로 닫힌 끝은 「→ 정상」 한 건 더")
    void changes() {
        List<AreaEventService.Change> changes = AreaEventService.changes(List.of(
                period(1, "ATTENTION", "NORMAL", T, T.plusHours(2)),
                period(2, "WARNING", "ATTENTION", T.plusHours(2), T.plusHours(8)),
                period(3, "ATTENTION", "WARNING", T.plusHours(8), T.plusHours(12))));

        assertThat(changes).extracting(c -> c.fromLevel() + ">" + c.toLevel() + "@" + c.eventType())
                .containsExactly(
                        "ATTENTION>NORMAL@LOW",
                        "WARNING>ATTENTION@LOW",
                        "ATTENTION>WARNING@HIGH",
                        "NORMAL>ATTENTION@HIGH");
    }
}
