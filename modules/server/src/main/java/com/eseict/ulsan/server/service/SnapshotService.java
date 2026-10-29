package com.eseict.ulsan.server.service;

import com.eseict.ulsan.server.common.NotFoundException;
import com.eseict.ulsan.server.domain.Snapshot;
import com.eseict.ulsan.server.dto.SnapshotRequest;
import com.eseict.ulsan.server.dto.SnapshotResponse;
import com.eseict.ulsan.server.entity.Server;
import com.eseict.ulsan.server.entity.ServerSnapshot;
import com.eseict.ulsan.server.repository.ServerRepository;
import com.eseict.ulsan.server.repository.ServerSnapshotRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.Optional;

/** 스냅샷 쓰기(수집기·수동 입력)와 이력 읽기. 오래된 기록 정리는 RetentionService. */
@Service
public class SnapshotService {

    private final ServerRepository servers;
    private final ServerSnapshotRepository snapshots;
    private final Clock clock;

    public SnapshotService(ServerRepository servers, ServerSnapshotRepository snapshots, Clock clock) {
        this.servers = servers;
        this.snapshots = snapshots;
        this.clock = clock;
    }

    /** 수집기가 쓴다. 같은 읽은 시각의 측정이 이미 있으면 저장하지 않고 empty. */
    @Transactional
    public Optional<SnapshotResponse> record(String host, Snapshot snapshot) {
        Server server = byHost(host);
        if (snapshots.existsByServerIdAndCollectedAt(server.getId(), snapshot.collectedAt())) return Optional.empty();
        ServerSnapshot saved = snapshots.save(new ServerSnapshot(server, snapshot));
        return Optional.of(SnapshotResponse.from(saved));
    }

    /** POST /api/snapshots (수동 입력). 서버 원재료 값을 그 서버의 칸 구성으로 바꿔 저장한다. */
    @Transactional
    public SnapshotResponse record(SnapshotRequest req) {
        Server server = byHost(req.host());
        Snapshot snap = req.toDomain(clock.instant(), server.getResourceLayout());
        return SnapshotResponse.from(snapshots.save(new ServerSnapshot(server, snap)));
    }

    @Transactional(readOnly = true)
    public List<SnapshotResponse> history(String host, int limit) {
        Server server = byHost(host);
        int n = Math.max(1, Math.min(limit, 2000));
        return snapshots.findByServerIdOrderByCollectedAtDesc(server.getId(), PageRequest.of(0, n))
                .stream().map(SnapshotResponse::from).toList();
    }

    private Server byHost(String host) {
        return servers.findByHost(host).orElseThrow(() -> new NotFoundException("서버 없음: " + host));
    }
}
