package com.eseict.ulsan.server.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * 스냅샷 하나 → Judgement 하나. 순수 함수. 입력이 같으면 출력이 같다 — 그래서 테스트가 쉽다.
 * 종합 색 = 자원 칸(기준 있는 칸만) · 핵심값 · 오래됨 중 가장 나쁜 것.
 */
public final class ServerJudge {

    private final Staleness staleness;

    public ServerJudge(Staleness staleness) {
        this.staleness = staleness;
    }

    /**
     * @param mode   측정 방식 (NONE 이면 무조건 실측 대기)
     * @param rule   이 장비의 핵심 항목 규칙 (null 이면 핵심 항목 없음)
     * @param layout 자원 4칸 구성
     * @param snap   최신 스냅샷 (없으면 null)
     * @param now    판정 시각
     */
    public Judgement judge(MeasureMode mode, KeyMetricRule rule, ResourceLayout layout, Snapshot snap, Instant now) {
        List<String> reasons = new ArrayList<>();

        if (mode == MeasureMode.NONE || snap == null) {
            return new Judgement(Verdict.UNKNOWN, "실측 대기", layout.pending(), KeyMetricResult.PENDING,
                    Verdict.UNKNOWN, List.of(mode == MeasureMode.NONE ? "수집 대상 아님" : "스냅샷 없음"));
        }

        Verdict stale = staleness.judge(snap.collectedAt(), now);
        if (stale == Verdict.UNKNOWN) {
            reasons.add("마지막 수집이 너무 오래됨");
            return new Judgement(Verdict.UNKNOWN, "실측 대기", layout.pending(), KeyMetricResult.PENDING, stale, reasons);
        }
        if (stale == Verdict.WARN) reasons.add("갱신 지연");

        List<ResourceReading> res = snap.resources().isEmpty() ? layout.pending() : snap.resources();
        Verdict worst = Verdict.OK.worse(stale);
        for (ResourceReading r : res) {
            Verdict v = r.verdict();
            if (v == Verdict.WARN || v == Verdict.FAIL) {
                reasons.add(r.label() + " " + Math.round(r.pct()) + "%");
                worst = worst.worse(v);
            }
        }

        KeyMetricResult key = rule == null ? KeyMetricResult.PENDING : rule.apply(snap.keyMetric(), now);
        if (key.verdict() == Verdict.WARN || key.verdict() == Verdict.FAIL) {
            reasons.add(key.aux());
            worst = worst.worse(key.verdict());
        }

        return new Judgement(worst, UptimeText.of(snap.uptimeDays()), res, key, stale, reasons);
    }
}
