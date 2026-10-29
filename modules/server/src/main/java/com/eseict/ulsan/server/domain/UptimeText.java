package com.eseict.ulsan.server.domain;

/** 섹션3 1열 · 메인 카드 ②줄의 「가동 N일」. 마스터: N일 연속이 가장 중요. 소수는 버린다. */
public final class UptimeText {

    private UptimeText() {}

    public static String of(Double uptimeDays) {
        if (uptimeDays == null) return "실측 대기";
        long days = (long) Math.floor(uptimeDays);
        if (days < 1) {
            long hours = Math.round(uptimeDays * 24);
            return "가동 " + hours + "시간";
        }
        return "가동 " + days + "일";
    }
}
