package com.eseict.ulsan.server.service;

import com.eseict.ulsan.server.domain.Judgement;
import com.eseict.ulsan.server.domain.Verdict;
import com.eseict.ulsan.server.dto.OverviewResponse;
import com.eseict.ulsan.server.dto.RackSlotResponse;
import com.eseict.ulsan.server.dto.ServerCardResponse;
import com.eseict.ulsan.server.entity.Server;
import com.eseict.ulsan.server.repository.ServerRepository;
import com.eseict.ulsan.server.repository.ServerSnapshotRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** 메인 「시스템 운영현황」 + 섹션1·2 랙. */
@Service
@Transactional(readOnly = true)
public class OverviewService {

    private final ServerRepository servers;
    private final ServerSnapshotRepository snapshots;
    private final JudgementService judgement;

    public OverviewService(ServerRepository servers, ServerSnapshotRepository snapshots, JudgementService judgement) {
        this.servers = servers;
        this.snapshots = snapshots;
        this.judgement = judgement;
    }

    public OverviewResponse overview() {
        List<Server> all = servers.findAllByOrderBySeqAsc();
        Map<Long, JudgementService.Judged> judged = judgement.judgeAll(all);
        List<ServerCardResponse> cards = new ArrayList<>(all.size());
        int ok = 0, warn = 0, fail = 0, pending = 0;
        for (Server s : all) {
            Judgement j = judged.get(s.getId()).judgement();
            switch (j.overall()) {
                case OK -> ok++;
                case WARN -> warn++;
                case FAIL -> fail++;
                default -> pending++;
            }
            cards.add(card(s, j));
        }
        Instant lastSync = snapshots.findLastCollectedAt().orElse(null);
        return new OverviewResponse(new OverviewResponse.Counts(ok, warn, fail, pending, all.size()), lastSync, cards);
    }

    public List<RackSlotResponse> rack() {
        List<Server> all = servers.findAllByOrderBySeqAsc();
        Map<Long, JudgementService.Judged> judged = judgement.judgeAll(all);
        List<RackSlotResponse> out = new ArrayList<>(all.size());
        for (Server s : all) {
            Verdict v = judged.get(s.getId()).judgement().overall();
            out.add(new RackSlotResponse(s.getSeq(), s.getHost(), s.getShortName(), s.getShape(), s.getRackU(), v, v.color(),
                    s.getMeasureMode().isDirect()));
        }
        return out;
    }

    static ServerCardResponse card(Server s, Judgement j) {
        boolean indirect = s.getMeasureMode().isIndirect();
        String sub = indirect ? "행정망 · 간접 확인"
                : j.overall() == Verdict.UNKNOWN ? j.uptimeText()
                : j.uptimeText() + " · 응답 정상";
        return new ServerCardResponse(s.getSeq(), s.getHost(), s.getShortName(), j.overall(), j.overall().label(),
                j.overall().color(), !indirect, sub, s.getKeyMetricLabel(), j.keyMetric().value(), j.keyMetric().aux(),
                j.keyMetric().verdict());
    }
}
