package com.eseict.ulsan.server.sw.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/** 스위치 카드 한 장. */
public record SwitchSummary(
        @Schema(description = "① 마지막 수집 시각") OffsetDateTime collectedAt,
        @Schema(description = "② 가동 일수") Long uptimeDays,
        @Schema(description = "② 마지막 재시작 시각 = 읽은 시각 − 가동 시간") OffsetDateTime restartedAt,
        @Schema(description = "② 응답 ms") Integer rttMs,
        @Schema(description = "1분 부하") BigDecimal load1m,
        @Schema(description = "메모리 사용률 %") Integer memPct,
        @Schema(description = "⑤ 링크 UP 포트 수") long portsUp,
        @Schema(description = "⑤ 전체 포트 수") long portsTotal,
        @Schema(description = "⑤ 에러가 늘어난 포트 (앞면 라벨 P6 / SFP2). 기간은 switch.error-window(기본 1시간)") List<String> errorPorts,
        @Schema(description = "④ 지금 전체 트래픽 Gbps (포트마다 받은 양의 합). 재기동 첫 샘플이면 null") Double trafficGbps,
        @Schema(description = "④ 브로드캐스트 비율 % = 받은 브로드캐스트 ÷ 받은 패킷. 계산 전이면 null") Double broadcastPct,
        @Schema(description = "④ 브로드캐스트 5% 이상이면 true (루핑·브로드캐스트 폭풍 전조)") boolean broadcastHigh,
        @Schema(description = "⑩ AC 인렛 「결선」(SNMP 응답 있음). 수집 기록 없으면 null") String powerStatus) {
}
