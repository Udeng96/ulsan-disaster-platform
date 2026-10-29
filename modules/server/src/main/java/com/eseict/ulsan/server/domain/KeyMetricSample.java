package com.eseict.ulsan.server.domain;

import java.time.Instant;

/**
 * 메인 카드 「핵심 한 가지」의 재료. 규칙(KeyMetricRule)이 이걸 받아 값·보조 문구·판정을 만든다.
 * 어떤 서버든 같은 네 칸으로 담는다 — 서버마다 다른 건 규칙이지 자료 모양이 아니다(정중동).
 *
 * value    : 주 숫자 (차단 건수 · Gbps · 디스크 % · 가동 중인 서비스 수 · 채널 수 · 수신 기관 수 …)
 * total    : 분모가 있을 때 (6종 중 N · 5곳 중 N)
 * baseline : 평소값이 있을 때 (차단 건수의 평소 24시간 평균)
 * aux      : 숫자로 못 담는 보조 사실 (에러 포트 수 · 끊긴 기관 이름 · 응답 상태 "OK/SLOW/DOWN")
 * lastActivityAt : 마지막 활동 시각 (센서 수신 · 연계 전송 · 백업 · 요청)
 */
public record KeyMetricSample(Double value, Double total, Double baseline, String aux, Instant lastActivityAt) {

    public static final KeyMetricSample EMPTY = new KeyMetricSample(null, null, null, null, null);

    public boolean isEmpty() {
        return value == null && total == null && aux == null && lastActivityAt == null;
    }
}
