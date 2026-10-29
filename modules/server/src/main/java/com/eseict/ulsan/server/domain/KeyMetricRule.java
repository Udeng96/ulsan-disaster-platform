package com.eseict.ulsan.server.domain;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * 메인 카드 ③④줄 규칙 — v2.7 §1-3 표를 그대로 코드로 옮긴 것. 서버 하나 = 규칙 하나.
 * 새 서버(14번~)가 오면 enum 상수 하나를 더하고 servers.key_rule 에 이름을 적는다. 화면 코드는 안 바뀐다.
 */
public enum KeyMetricRule {

    /** 1 방화벽 — 차단 24시간. 평소 대비 2배 주의 · 3배 장애. */
    BLOCKED_VS_BASELINE {
        @Override public KeyMetricResult apply(KeyMetricSample s, Instant now) {
            if (s.value() == null) return KeyMetricResult.PENDING;
            long n = Math.round(s.value());
            if (s.baseline() == null || s.baseline() <= 0) return new KeyMetricResult(n + "건", "평소값 없음", Verdict.OK);
            double ratio = s.value() / s.baseline();
            Verdict v = ratio >= 3 ? Verdict.FAIL : ratio >= 2 ? Verdict.WARN : Verdict.OK;
            return new KeyMetricResult(n + "건", "평소의 " + fmt1(ratio) + "배", v);
        }
    },

    /** 2 스위칭 허브 — 트래픽 · 에러 포트. 에러 포트 1개 이상 주의. value=Gbps, total=에러 포트 수. */
    TRAFFIC_ERROR_PORTS {
        @Override public KeyMetricResult apply(KeyMetricSample s, Instant now) {
            if (s.value() == null) return KeyMetricResult.PENDING;
            long errors = s.total() == null ? 0 : Math.round(s.total());
            Verdict v = errors >= 1 ? Verdict.WARN : Verdict.OK;
            return new KeyMetricResult(fmt1(s.value()) + "Gbps", errors >= 1 ? "에러 포트 " + errors : "에러 포트 없음", v);
        }
    },

    /**
     * 3 데이터베이스 — 데이터디스크 % · 마지막 저장(DB 에 데이터가 마지막으로 들어온 시각).
     * 디스크 85% 주의 · 95% 장애, 저장이 30분 넘게 없으면 주의 · 2시간 장애(다른 「마지막 활동」 규칙과 같음).
     * 2026-10-16 사용자: 3번은 따로 백업이 없어 「마지막 백업」 대신.
     */
    DISK_AND_LAST_SAVE {
        @Override public KeyMetricResult apply(KeyMetricSample s, Instant now) {
            if (s.value() == null) return KeyMetricResult.PENDING;
            Verdict disk = ResourceKind.DATA_DISK.judge(s.value());
            String pct = Math.round(s.value()) + "%";
            if (s.lastActivityAt() == null) return new KeyMetricResult(pct, "저장 기록 대기", disk);
            KeyMetricResult age = ageResult(s.lastActivityAt(), now, "");
            return new KeyMetricResult(pct, "마지막 저장 " + age.value(), disk.worse(age.verdict()));
        }
    },

    /** 4 솔루션 · 7 GIS — 서비스 응답. aux = OK | SLOW | DOWN. 지연 주의 · 무응답 장애. */
    SERVICE_RESPONSE {
        @Override public KeyMetricResult apply(KeyMetricSample s, Instant now) {
            if (s.aux() == null) return KeyMetricResult.PENDING;
            String last = s.lastActivityAt() == null ? "" : "마지막 처리 " + hhmm(s.lastActivityAt());
            return switch (s.aux().toUpperCase()) {
                case "OK" -> new KeyMetricResult("정상", last, Verdict.OK);
                case "SLOW" -> new KeyMetricResult("지연", last, Verdict.WARN);
                default -> new KeyMetricResult("무응답", last, Verdict.FAIL);
            };
        }
    },

    /** 5 대시보드 — 재난 서비스 N종 중 가동 수. 1종 멈춤 주의 · 3종 이상 장애. value=가동, total=전체. */
    RUNNING_OF_TOTAL {
        @Override public KeyMetricResult apply(KeyMetricSample s, Instant now) {
            if (s.value() == null || s.total() == null) return KeyMetricResult.PENDING;
            long run = Math.round(s.value()), all = Math.round(s.total()), down = all - run;
            Verdict v = down >= 3 ? Verdict.FAIL : down >= 1 ? Verdict.WARN : Verdict.OK;
            return new KeyMetricResult(run + " / " + all, down == 0 ? "정상 구동" : down + "종 멈춤", v);
        }
    },

    /** 6 IoT · 10 · 11 · 13 — 마지막 활동 시각. 30분 주의 · 2시간 장애. */
    LAST_ACTIVITY_AGE {
        @Override public KeyMetricResult apply(KeyMetricSample s, Instant now) {
            if (s.lastActivityAt() == null) return KeyMetricResult.PENDING;
            return ageResult(s.lastActivityAt(), now, "");
        }
    },

    /** 8 CCTV — 현재 송출 채널. 0채널 장애. */
    CHANNELS_NONZERO {
        @Override public KeyMetricResult apply(KeyMetricSample s, Instant now) {
            if (s.value() == null) return KeyMetricResult.PENDING;
            long ch = Math.round(s.value());
            return new KeyMetricResult(String.valueOf(ch), "채널", ch == 0 ? Verdict.FAIL : Verdict.OK);
        }
    },

    /** 9 내부 연계 — 마지막 중계 시각 + 기관 N곳 연결. 30분 주의 · 1곳이라도 끊기면 주의. value=연결, total=전체. */
    RELAY_AGE_AND_PEERS {
        @Override public KeyMetricResult apply(KeyMetricSample s, Instant now) {
            if (s.lastActivityAt() == null) return KeyMetricResult.PENDING;
            KeyMetricResult age = ageResult(s.lastActivityAt(), now, "");
            if (s.value() == null || s.total() == null) return age;
            long ok = Math.round(s.value()), all = Math.round(s.total());
            Verdict peers = ok < all ? Verdict.WARN : Verdict.OK;
            String aux = ok < all ? (all - ok) + "곳 끊김" + (s.aux() == null ? "" : " · " + s.aux()) : all + "곳 정상";
            return new KeyMetricResult(age.value(), aux, age.verdict().worse(peers));
        }
    },

    /** 12 외부 연계 — 외부 기관 N곳 중 수신 중. 1곳 끊김 주의 · 3곳 이상 장애. aux = 끊긴 곳 설명(「산림청 42분 전」). */
    RECEIVED_OF_TOTAL {
        @Override public KeyMetricResult apply(KeyMetricSample s, Instant now) {
            if (s.value() == null || s.total() == null) return KeyMetricResult.PENDING;
            long ok = Math.round(s.value()), all = Math.round(s.total()), down = all - ok;
            Verdict v = down >= 3 ? Verdict.FAIL : down >= 1 ? Verdict.WARN : Verdict.OK;
            String aux = down == 0 ? "전부 수신 중" : (s.aux() != null ? s.aux() : down + "곳 끊김");
            return new KeyMetricResult(ok + " / " + all, aux, v);
        }
    };

    public abstract KeyMetricResult apply(KeyMetricSample sample, Instant now);

    // ── 공통 ──────────────────────────────────────────────────────────────
    static final ZoneId KST = ZoneId.of("Asia/Seoul");
    static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm").withZone(KST);

    static String hhmm(Instant t) { return HHMM.format(t); }

    static String fmt1(double d) {
        String s = String.format("%.1f", d);
        return s.endsWith(".0") ? s.substring(0, s.length() - 2) : s;
    }

    /** 마지막 활동 → 「HH:MM」 + 「N분 전」. 30분 초과 주의, 2시간 초과 장애. */
    static KeyMetricResult ageResult(Instant last, Instant now, String suffix) {
        Duration age = Duration.between(last, now);
        long min = Math.max(0, age.toMinutes());
        Verdict v = min > 120 ? Verdict.FAIL : min > 30 ? Verdict.WARN : Verdict.OK;
        String ago = min < 60 ? min + "분 전" : (min / 60) + "시간 " + (min % 60) + "분 전";
        return new KeyMetricResult(hhmm(last), ago + suffix, v);
    }
}
