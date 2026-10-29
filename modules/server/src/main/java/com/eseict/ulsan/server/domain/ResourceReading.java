package com.eseict.ulsan.server.domain;

/**
 * 동그라미 하나. DB 의 snapshot_resources 한 줄과 같다.
 * pct 가 null 이고 detail 도 없으면 속 빈 회색(실측 대기). 기준(warnPct·failPct)이 없으면 판정하지 않고 파랑.
 * 기준은 잰 그때의 값을 함께 저장한다 — 나중에 기준을 바꿔도 지난 기록의 색은 그대로.
 */
public record ResourceReading(ResourceKind kind, String label, Double pct, String detail, Double warnPct, Double failPct) {

    public static ResourceReading of(ResourceKind kind, Double pct, String detail) {
        return new ResourceReading(kind, kind.label(), pct, detail, kind.warnPct(), kind.failPct());
    }

    public static ResourceReading pending(ResourceKind kind) {
        return of(kind, null, null);
    }

    /** 기준이 있는 칸인가. false 면 항상 파랑. */
    public boolean judged() {
        return warnPct != null && failPct != null;
    }

    /** 값이 하나라도 있는가. */
    public boolean measured() {
        return pct != null || detail != null;
    }

    /** UNKNOWN = 실측 대기(회색) · null = 기준 없음(파랑) · 그 밖은 기준 판정. */
    public Verdict verdict() {
        if (!measured()) return Verdict.UNKNOWN;
        if (!judged()) return null;
        return judge(pct, warnPct, failPct);
    }

    static Verdict judge(Double pct, Double warn, Double fail) {
        if (warn == null || fail == null) return null;
        if (pct == null) return Verdict.UNKNOWN;
        if (pct >= fail) return Verdict.FAIL;
        if (pct >= warn) return Verdict.WARN;
        return Verdict.OK;
    }
}
