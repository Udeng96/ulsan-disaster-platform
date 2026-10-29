package com.eseict.ulsan.slope.alarm;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 발령 필요 — 업체 문자 해석과 표시 단계. 본문은 실제 발송 문자 형식 그대로다.
 */
class PendingSmsTest {

    private static final LocalDateTime AT = LocalDateTime.of(2026, 9, 30, 12, 32, 57);
    private static final String MSG = "재난안전대책본부에서 알려드립니다. 현재 12시 32분 재해위험지구 가상시설0432에 "
            + "조기경보 관심 발령이 필요합니다. [발생원인] - 삼익_수집2_경사_함수-1 (경사계) 관심 상태";
    private static final String RELEASE_MSG = "재난안전대책본부에서 알려드립니다. 현재 16시 35분 재해위험지구 가상시설0553에 "
            + "조기경보 정상 상태 조건 해제(주의 -> 정상) 발령이 필요합니다.";

    @Test
    @DisplayName("발령 필요 문자의 지구·단계를 읽는다")
    void parses() {
        AlarmReader.Sms sms = AlarmReader.parseSms("가상시설0432", "관심", MSG, AT);

        assertThat(sms.areaName()).isEqualTo("가상시설0432");
        assertThat(sms.level()).isEqualTo("INTEREST");
        assertThat(sms.releaseFrom()).isNull();
    }

    @Test
    @DisplayName("해제 필요 문자는 해제 전 단계를 읽는다")
    void parsesRelease() {
        AlarmReader.Sms sms = AlarmReader.parseSms("가상시설0553", "정상", RELEASE_MSG, AT);

        assertThat(sms.level()).isEqualTo("NORMAL");
        assertThat(sms.releaseFrom()).isEqualTo("ATTENTION");
    }

    @Test
    @DisplayName("한 단계 낮춤 해제 필요 문자도 읽는다 (주의 → 관심)")
    void parsesPartialRelease() {
        AlarmReader.Sms sms = AlarmReader.parseSms("가상시설0553", "관심",
                RELEASE_MSG.replace("주의 -> 정상", "주의 -> 관심"), AT);

        assertThat(sms.level()).isEqualTo("INTEREST");
        assertThat(sms.releaseFrom()).isEqualTo("ATTENTION");
    }

    @Test
    @DisplayName("지구명이 빈 문자는 본문에서 지구를 읽는다")
    void zoneFromBody() {
        assertThat(AlarmReader.parseSms("", "관심", MSG, AT).areaName()).isEqualTo("가상시설0432");
    }

    @Test
    @DisplayName("대상 지구가 아니거나 단계를 모르면 버린다")
    void ignoresOthers() {
        assertThat(AlarmReader.parseSms("울산지구", "관심", MSG.replace("가상시설0432", "울산지구"), AT)).isNull();
        assertThat(AlarmReader.parseSms("가상시설0432", "시험방송", MSG, AT)).isNull();
    }

    @Test
    @DisplayName("문자 단계를 180분 동안 넘지 않았으면 넘은 단계까지 낮춘다")
    void lowersToActiveLevel() {
        assertThat(AlarmReader.effectiveLevel("ATTENTION", Set.of("ATTENTION", "INTEREST"))).isEqualTo("ATTENTION");
        assertThat(AlarmReader.effectiveLevel("ATTENTION", Set.of("INTEREST"))).isEqualTo("INTEREST");
        assertThat(AlarmReader.effectiveLevel("ATTENTION", Set.of())).isNull();
        // 문자보다 높은 단계 초과는 아직 문자가 안 온 것이라 올리지 않는다
        assertThat(AlarmReader.effectiveLevel("INTEREST", Set.of("WARNING", "INTEREST"))).isEqualTo("INTEREST");
    }

    @Test
    @DisplayName("그 단계 이상으로 발령해야 발령필요에서 빠진다")
    void coveredOnlyByEqualOrHigher() {
        assertThat(AlarmReader.coveredBy("ATTENTION", List.of("INTEREST"))).isFalse();
        assertThat(AlarmReader.coveredBy("ATTENTION", List.of("ATTENTION"))).isTrue();
        assertThat(AlarmReader.coveredBy("ATTENTION", List.of("INTEREST", "WARNING"))).isTrue();
        assertThat(AlarmReader.coveredBy("ATTENTION", List.of())).isFalse();
    }
}
