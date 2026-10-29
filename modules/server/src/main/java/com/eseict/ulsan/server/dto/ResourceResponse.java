package com.eseict.ulsan.server.dto;

import com.eseict.ulsan.server.domain.ResourceReading;
import com.eseict.ulsan.server.domain.Verdict;

/**
 * 자원 동그라미 하나.
 * verdict: OK·WARN·FAIL = 기준 판정(노랑·빨강은 테두리) · UNKNOWN = 실측 대기(회색) · null = 기준 없음(항상 파랑).
 */
public record ResourceResponse(String kind, String label, Double pct, String detail, Double warnPct, Double failPct,
                               boolean judged, Verdict verdict, String color) {

    /** 기준 없는 칸의 색 (캔버스 강조 파랑). */
    public static final String UNJUDGED_COLOR = "#4DA3FF";

    public static ResourceResponse from(ResourceReading r) {
        Verdict v = r.verdict();
        return new ResourceResponse(r.kind().name(), r.label(), r.pct(), r.detail(), r.warnPct(), r.failPct(),
                r.judged(), v, v == null ? UNJUDGED_COLOR : v.color());
    }
}
