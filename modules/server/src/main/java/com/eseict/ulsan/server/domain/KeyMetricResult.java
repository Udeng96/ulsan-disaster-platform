package com.eseict.ulsan.server.domain;

/** 카드 ④줄: 큰 값 · 보조 설명 · 색. value 가 "실측 대기"면 회색. */
public record KeyMetricResult(String value, String aux, Verdict verdict) {

    public static final KeyMetricResult PENDING = new KeyMetricResult("실측 대기", "", Verdict.UNKNOWN);
}
