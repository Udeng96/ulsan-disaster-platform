package com.eseict.ulsan.server.service;

import com.eseict.ulsan.server.domain.Judgement;
import com.eseict.ulsan.server.domain.ServerJudge;
import com.eseict.ulsan.server.domain.Snapshot;
import com.eseict.ulsan.server.entity.Server;
import com.eseict.ulsan.server.entity.ServerSnapshot;
import com.eseict.ulsan.server.repository.ServerSnapshotRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 「서버 + 최신 스냅샷 → 판정」을 서비스 한 곳에서만 한다. 메인·섹션1·2·3 어디서 불러도 같은 답.
 */
@Service
@Transactional(readOnly = true)
public class JudgementService {

    private final ServerSnapshotRepository snapshots;
    private final ServerJudge judge;
    private final Clock clock;

    public JudgementService(ServerSnapshotRepository snapshots, ServerJudge judge, Clock clock) {
        this.snapshots = snapshots;
        this.judge = judge;
        this.clock = clock;
    }

    public Instant now() { return clock.instant(); }

    /** 서버 1대. */
    public Judged judgeOne(Server server) {
        Optional<ServerSnapshot> latest = snapshots.findFirstByServerIdOrderByCollectedAtDesc(server.getId());
        return judge(server, latest.orElse(null), now());
    }

    /** 13대 — 최신 스냅샷을 한 번에 읽어 N+1 을 피한다. */
    public Map<Long, Judged> judgeAll(List<Server> servers) {
        Map<Long, ServerSnapshot> latest = new HashMap<>();
        for (ServerSnapshot s : snapshots.findLatestPerServer()) latest.put(s.getServer().getId(), s);
        Instant now = now();
        Map<Long, Judged> out = new HashMap<>();
        for (Server sv : servers) out.put(sv.getId(), judge(sv, latest.get(sv.getId()), now));
        return out;
    }

    private Judged judge(Server server, ServerSnapshot entity, Instant now) {
        Snapshot snap = entity == null ? null : entity.toDomain();
        Judgement j = judge.judge(server.getMeasureMode(), server.getKeyRule(), server.getResourceLayout(), snap, now);
        return new Judged(server, snap, j);
    }

    public record Judged(Server server, Snapshot snapshot, Judgement judgement) {}
}
