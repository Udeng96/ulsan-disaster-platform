package com.eseict.ulsan.server.firewall.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/** 방화벽 카드 한 장. */
public record FirewallSummary(
        @Schema(description = "마지막 수집 시각. 10초 넘게 지났으면 수집 중단으로 표시") OffsetDateTime collectedAt,
        @Schema(description = "가동 일수") Long uptimeDays,
        @Schema(description = "② 마지막 재시작 시각 = 읽은 시각 − 가동 시간") OffsetDateTime restartedAt,
        @Schema(description = "SNMP 응답 ms") Integer rttMs,
        Integer sessionCnt,
        BigDecimal cpuPct,
        Short memPct,
        BigDecimal cpuTempC,
        List<Integer> fanRpm,
        @Schema(description = "적용 정책 수") int policyCount,
        @Schema(description = "허용 정책 수") long allowCount,
        @Schema(description = "⑤ 정책 표가 마지막으로 바뀐 시각. 바뀐 기록이 없으면 null") OffsetDateTime policyChangedAt,
        @Schema(description = "⑤ 「변경」(바뀐 지 24시간 안) / 「유지」") String policyStatus,
        @Schema(description = "④ 24시간 차단 건수 (IPv4 차단 · IPv6 차단 · 위협 로그)") long blockedLast24h,
        @Schema(description = "④ 평소값 = 지난 7일 하루 평균 차단 건수") double blockedBaseline,
        @Schema(description = "④ 배수 = 24시간 차단 ÷ 평소값. 평소값이 0 이면 null") Double blockedRatio,
        @Schema(description = "④ 판정 OK / WARN(2배 이상) / FAIL(3배 이상)") String blockedVerdict,
        @Schema(description = "24시간 경고 건수") long alertsLast24h,
        @Schema(description = "⑩ PSU 「공급 중」 / 「이상」(24시간 안 전원 경고 로그 있음). 수집 기록 없으면 null") String psuStatus,
        @Schema(description = "⑩ 전원 스위치 「ON」(SNMP 응답 있음). 수집 기록 없으면 null") String powerSwitch) {
}
