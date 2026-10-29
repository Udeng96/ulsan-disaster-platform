package com.eseict.ulsan.server.domain;

import java.time.Instant;
import java.util.List;

/**
 * 한 장비의 한 번 측정값. 엔티티(ServerSnapshot + SnapshotResource)와 1:1이지만 도메인은 JPA를 모른다.
 * measuredAt  = 값을 잰 시각.
 * collectedAt = 장비를 실제로 읽은 시각. 「갱신 HH:MM:SS」와 오래됨 판정의 기준.
 *               SSH 는 접속한 그 순간, 방화벽·스위치는 SNMP 로 읽은 fw_status·sw_status 의 시각이다.
 * resources   = 자원 동그라미 4칸 (칸 순서대로). 비어 있으면 실측 대기.
 */
public record Snapshot(
        Instant measuredAt,
        Instant collectedAt,
        String source,
        Double uptimeDays,
        String nicLinks,
        String services,
        List<ResourceReading> resources,
        KeyMetricSample keyMetric,
        String note) {

    public Snapshot {
        resources = resources == null ? List.of() : List.copyOf(resources);
        keyMetric = keyMetric == null ? KeyMetricSample.EMPTY : keyMetric;
    }
}
