package com.eseict.ulsan.server.dto;

import com.eseict.ulsan.server.domain.HostMetrics;
import com.eseict.ulsan.server.domain.KeyMetricSample;
import com.eseict.ulsan.server.domain.ResourceLayout;
import com.eseict.ulsan.server.domain.Snapshot;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.Instant;

/**
 * POST /api/snapshots 요청. 외부(수동 입력 · 다른 수집기)가 측정값을 넣는 입구. 비율은 % (0~100).
 * host 가 키다. measuredAt 생략 시 지금. 자원 값은 서버 원재료(디스크·메모리·부하 …)로 받아 그 서버의 칸 구성으로 바꾼다.
 */
public record SnapshotRequest(
        @NotBlank String host,
        Instant measuredAt,
        @Pattern(regexp = "SNAPSHOT|SSH|SNMP|INDIRECT|MANUAL") String source,
        Double uptimeDays,
        Integer threads,
        Double load1, Double load5, Double load15,
        @DecimalMin("0") @DecimalMax("100") Double cpuPct,
        @DecimalMin("0") @DecimalMax("100") Double memPct,
        @DecimalMin("0") @DecimalMax("100") Double diskRootPct,
        @DecimalMin("0") @DecimalMax("100") Double diskDataPct,
        @DecimalMin("0") @DecimalMax("100") Double networkPct,
        String nicLinks,
        String services,
        Double keyValue, Double keyTotal, Double keyBaseline, String keyAux, Instant lastActivityAt,
        String note) {

    public Snapshot toDomain(Instant now, ResourceLayout layout) {
        Instant measured = measuredAt == null ? now : measuredAt;
        HostMetrics m = new HostMetrics(threads, load1, load5, load15, cpuPct, memPct, diskRootPct, diskDataPct, networkPct);
        return new Snapshot(measured, now, source == null ? "MANUAL" : source, uptimeDays, nicLinks, services,
                m.resources(layout), new KeyMetricSample(keyValue, keyTotal, keyBaseline, keyAux, lastActivityAt), note);
    }
}
