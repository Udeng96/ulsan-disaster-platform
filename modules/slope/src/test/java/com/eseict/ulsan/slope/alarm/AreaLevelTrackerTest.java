package com.eseict.ulsan.slope.alarm;

import static org.assertj.core.api.Assertions.assertThat;

import com.eseict.ulsan.slope.alarm.dto.PendingAlarm;
import com.eseict.ulsan.slope.facility.AreaLevelEvent;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 단계 이력 — 매분 단계를 보고 구간을 닫고 여는 규칙. 설계안(slope-work/history-design.md) 예시 타임라인.
 */
class AreaLevelTrackerTest {

    private static final Long AREA = 1L;
    private static final LocalDateTime T = LocalDateTime.of(2026, 10, 14, 9, 0);

    private final List<AreaLevelEvent> periods = new ArrayList<>();
    private AreaLevelEvent open;

    /** 그 분의 관측을 반영한다. */
    private void at(LocalDateTime now, String level, LocalDateTime sentAt, String... causes) {
        AreaLevelEvent fresh = AreaLevelTracker.apply(AREA, open,
                new AreaLevelTracker.Observation(level, now, sentAt, List.of(causes)));
        if (fresh != null) {
            periods.add(fresh);
            open = fresh;
        } else if (open != null && !open.isOpen()) {
            open = null;
        }
    }

    @Test
    @DisplayName("주의 → 경계 → (180분 뒤) 주의 → 정상: 격하도 정상 복귀도 남는다")
    void timeline() {
        at(T, "ATTENTION", T, "삼익_수집2_경사-1");                                 // 09:00 주의 문자
        at(T.plusHours(2), "WARNING", T.plusHours(2), "삼익_수집2_경사-1");          // 11:00 경계 문자
        at(T.plusHours(8), "ATTENTION", T.plusHours(2));                            // 17:00 패널이 주의로
        at(T.plusHours(12), "NORMAL", null);                                       // 21:00 정상

        assertThat(periods).hasSize(3);
        AreaLevelEvent attention = periods.get(0);
        AreaLevelEvent warning = periods.get(1);
        AreaLevelEvent down = periods.get(2);

        assertThat(attention.getPrevLevel()).isEqualTo("NORMAL");
        assertThat(attention.getDirection()).isEqualTo(AreaLevelEvent.UP);
        assertThat(attention.getEndedAt()).isEqualTo(T.plusHours(2));

        assertThat(warning.getPrevLevel()).isEqualTo("ATTENTION");
        assertThat(warning.getStartedAt()).isEqualTo(T.plusHours(2));
        assertThat(warning.getEndedAt()).isEqualTo(T.plusHours(8));

        assertThat(down.getPrevLevel()).isEqualTo("WARNING");
        assertThat(down.getDirection()).isEqualTo(AreaLevelEvent.DOWN);
        assertThat(down.getStartedAt()).isEqualTo(T.plusHours(8));
        assertThat(down.getSendCount()).isZero();     // 그 전 경계 문자는 이 구간 것이 아니다
        assertThat(down.getEndedAt()).isEqualTo(T.plusHours(12));
    }

    @Test
    @DisplayName("같은 단계가 이어지면 한 건이고, 재발송 문자는 횟수만 는다")
    void resendsCountOnce() {
        at(T, "ATTENTION", T, "A");
        at(T.plusMinutes(1), "ATTENTION", T);                   // 같은 문자를 다시 봄
        at(T.plusHours(24), "ATTENTION", T.plusHours(24), "B"); // 24시간 재발송
        at(T.plusHours(24).plusMinutes(1), "ATTENTION", T.plusHours(24));

        assertThat(periods).hasSize(1);
        assertThat(open.getSendCount()).isEqualTo(2);
        assertThat(open.getLastSentAt()).isEqualTo(T.plusHours(24));
        assertThat(open.getCauses()).isEqualTo("A, B");
        assertThat(open.isOpen()).isTrue();
    }

    @Test
    @DisplayName("격상 구간은 문자가 온 시각부터 시작한다")
    void upStartsAtSms() {
        at(T.plusMinutes(1), "ATTENTION", T);

        assertThat(open.getStartedAt()).isEqualTo(T);
        assertThat(open.getSendCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("재기동 뒤에도 진행 중인 구간을 이어 간다 — 같은 단계면 새 건이 없다")
    void resumesOpen() {
        at(T, "WARNING", T);
        AreaLevelEvent stored = open;

        open = stored;   // DB 에서 다시 읽은 것과 같다
        at(T.plusHours(1), "WARNING", T);

        assertThat(periods).hasSize(1);
        assertThat(stored.isOpen()).isTrue();
    }

    @Test
    @DisplayName("탭 단계 = 지구 상태와 발령 필요 중 높은 것, 해제 필요 건은 빠진다")
    void observeTakesWorse() {
        PendingAlarm needWarning = new PendingAlarm("가상시설0432", "경계", "정상", T, "A, B", null, null, null);
        AreaLevelTracker.Observation o1 = AreaLevelTracker.observe("NORMAL", needWarning, T);
        assertThat(o1.level()).isEqualTo("WARNING");
        assertThat(o1.sentAt()).isEqualTo(T);
        assertThat(o1.causes()).containsExactly("A", "B");

        // 발령으로 지구 상태가 경계, 해제 필요(경계 → 정상) 건이 패널에 있다
        PendingAlarm release = new PendingAlarm("가상시설0432", "정상", "경계", T, null, null, null, null);
        AreaLevelTracker.Observation o2 = AreaLevelTracker.observe("WARNING", release, T);
        assertThat(o2.level()).isEqualTo("WARNING");
        assertThat(o2.sentAt()).isNull();

        assertThat(AreaLevelTracker.observe(null, null, T).level()).isEqualTo("NORMAL");
        assertThat(AreaLevelTracker.observe("ERROR", null, T).level()).isEqualTo("NORMAL");
    }
}
