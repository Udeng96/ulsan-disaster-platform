package com.eseict.ulsan.server.domain;

import java.util.List;

/**
 * 한 서버의 종합 판정. 메인 카드 테두리색 · 섹션2 LED · 섹션3 1열 「가동」 배지 · 상단 집계가 전부 이 하나를 쓴다.
 * 두 화면이 다르게 보이면 안 된다(마스터 원칙) — 그래서 판정은 한 곳에서만 만든다.
 */
public record Judgement(
        Verdict overall,
        String uptimeText,
        List<ResourceReading> resources,
        KeyMetricResult keyMetric,
        Verdict staleness,
        List<String> reasons) {
}
