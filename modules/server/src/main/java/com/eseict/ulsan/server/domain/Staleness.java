package com.eseict.ulsan.server.domain;

import java.time.Duration;
import java.time.Instant;

/**
 * 「갱신 HH:MM:SS」가 멈췄을 때. 수집 주기의 3배를 넘으면 주의, 10배를 넘으면 실측 대기로 되돌린다.
 * 값이 틀린 게 아니라 "지금 값이 아님"을 알리는 규칙이라, 자원·핵심값 판정과는 별도로 겹쳐 쓴다.
 */
public record Staleness(Duration interval) {

    public Verdict judge(Instant collectedAt, Instant now) {
        if (collectedAt == null) return Verdict.UNKNOWN;
        Duration age = Duration.between(collectedAt, now);
        if (age.compareTo(interval.multipliedBy(10)) > 0) return Verdict.UNKNOWN;
        if (age.compareTo(interval.multipliedBy(3)) > 0) return Verdict.WARN;
        return Verdict.OK;
    }
}
