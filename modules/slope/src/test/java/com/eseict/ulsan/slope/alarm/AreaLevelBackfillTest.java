package com.eseict.ulsan.slope.alarm;

import static org.assertj.core.api.Assertions.assertThat;

import com.eseict.ulsan.slope.facility.AreaLevelEvent;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 단계 이력 다시 채우기 — 지난 문자·업체 판정을 1분씩 돌려 실시간과 같은 구간이 나오는지.
 */
class AreaLevelBackfillTest {

    private static final LocalDateTime T = LocalDateTime.of(2026, 9, 20, 9, 0);

    private static AlarmReader.Sms sms(String level, LocalDateTime at) {
        return new AlarmReader.Sms("가상시설0680", level, at, null, List.of());
    }

    @Test
    @DisplayName("주의 → 경계 → 초과 멈춤 180분 뒤 주의 → 다시 180분 뒤 정상")
    void replaysTimeline() {
        // 주의 초과 08:50~15:59, 경계 초과 11:00~13:59
        java.util.List<AlarmReader.Exceed> exceeds = new java.util.ArrayList<>();
        for (LocalDateTime t = T.minusMinutes(10); t.isBefore(T.plusHours(7)); t = t.plusMinutes(1)) {
            exceeds.add(new AlarmReader.Exceed(1L, "ATTENTION", 10L, t));
            if (!t.isBefore(T.plusHours(2)) && t.isBefore(T.plusHours(5))) {
                exceeds.add(new AlarmReader.Exceed(1L, "WARNING", 11L, t));
            }
        }
        List<AlarmReader.Sms> texts = List.of(sms("ATTENTION", T), sms("WARNING", T.plusHours(2)));

        List<AreaLevelEvent> periods = AreaLevelBackfill.replayArea(1L, texts, exceeds, List.of(),
                Map.of(10L, "가상시설0680_경사-1", 11L, "가상시설0680_경사-2"), T.minusMinutes(5), T.plusHours(12));

        assertThat(periods).extracting(AreaLevelEvent::getLevel)
                .containsExactly("ATTENTION", "WARNING", "ATTENTION");
        assertThat(periods.get(0).getStartedAt()).isEqualTo(T);
        assertThat(periods.get(1).getStartedAt()).isEqualTo(T.plusHours(2));
        // 경계 마지막 초과 13:59 → 180분이 지난 17:00 에 주의로, 주의 마지막 초과 15:59 → 19:00 에 정상
        assertThat(periods.get(1).getEndedAt()).isEqualTo(T.plusHours(8));
        assertThat(periods.get(2).getStartedAt()).isEqualTo(T.plusHours(8));
        assertThat(periods.get(2).getDirection()).isEqualTo(AreaLevelEvent.DOWN);
        assertThat(periods.get(2).getEndedAt()).isEqualTo(T.plusHours(10));
        assertThat(periods.get(0).getCauses()).isEqualTo("가상시설0680_경사-1");
    }
}
