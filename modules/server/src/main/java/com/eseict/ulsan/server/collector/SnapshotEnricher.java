package com.eseict.ulsan.server.collector;

import com.eseict.ulsan.server.domain.Snapshot;
import com.eseict.ulsan.server.entity.Server;

/** 수집기가 만든 측정에 다른 곳에서 읽은 값을 덧붙인다 (예: 3번 마지막 저장 시각). 기록 직전에 부른다. */
public interface SnapshotEnricher {
    Snapshot enrich(Server server, Snapshot snapshot);
}
