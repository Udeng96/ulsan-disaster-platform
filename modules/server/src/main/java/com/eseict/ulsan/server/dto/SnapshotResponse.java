package com.eseict.ulsan.server.dto;

import com.eseict.ulsan.server.domain.Snapshot;
import com.eseict.ulsan.server.entity.ServerSnapshot;

import java.time.Instant;
import java.util.List;

/** 스냅샷 이력 한 행 (섹션3 그래프 재료). resources = 자원 4칸. */
public record SnapshotResponse(
        Long id, String host, Instant measuredAt, Instant collectedAt, String source,
        Double uptimeDays, String nicLinks, String services,
        List<ResourceResponse> resources,
        Double keyValue, Double keyTotal, Double keyBaseline, String keyAux, Instant lastActivityAt,
        String note) {

    public static SnapshotResponse from(ServerSnapshot e) {
        Snapshot s = e.toDomain();
        return new SnapshotResponse(e.getId(), e.getServer().getHost(), s.measuredAt(), s.collectedAt(), s.source(),
                s.uptimeDays(), s.nicLinks(), s.services(),
                s.resources().stream().map(ResourceResponse::from).toList(),
                s.keyMetric().value(), s.keyMetric().total(), s.keyMetric().baseline(), s.keyMetric().aux(),
                s.keyMetric().lastActivityAt(), s.note());
    }
}
