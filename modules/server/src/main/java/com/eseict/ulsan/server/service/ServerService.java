package com.eseict.ulsan.server.service;

import com.eseict.ulsan.server.domain.Verdict;
import com.eseict.ulsan.server.host.db.DbStatsService;
import com.eseict.ulsan.server.host.db.dto.DbStats;
import com.eseict.ulsan.server.host.live.HostDetail;
import com.eseict.ulsan.server.host.live.HostLiveService;

import com.eseict.ulsan.server.common.NotFoundException;
import com.eseict.ulsan.server.domain.Judgement;
import com.eseict.ulsan.server.domain.KeyMetricRule;
import com.eseict.ulsan.server.domain.Snapshot;
import com.eseict.ulsan.server.dto.LedgerResponse;
import com.eseict.ulsan.server.dto.ResourceResponse;
import com.eseict.ulsan.server.dto.ServerDetailResponse;
import com.eseict.ulsan.server.dto.SpecResponse;
import com.eseict.ulsan.server.entity.Server;
import com.eseict.ulsan.server.entity.ServerSpec;
import com.eseict.ulsan.server.repository.ServerRepository;
import com.eseict.ulsan.server.repository.ServerSpecRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** 자산대장 두 탭 + 섹션3 한 대 상세. */
@Service
@Transactional(readOnly = true)
public class ServerService {

    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.of("Asia/Seoul"));

    private final ServerRepository servers;
    private final ServerSpecRepository specs;
    private final JudgementService judgement;
    private final DbStatsService dbStats;
    private final HostLiveService hostLive;

    public ServerService(ServerRepository servers, ServerSpecRepository specs, JudgementService judgement, DbStatsService dbStats,
                         HostLiveService hostLive) {
        this.servers = servers;
        this.specs = specs;
        this.judgement = judgement;
        this.dbStats = dbStats;
        this.hostLive = hostLive;
    }

    public Server byHost(String host) {
        return servers.findByHost(host).orElseThrow(() -> new NotFoundException("서버 없음: " + host));
    }

    /** 관리·계약 탭 (13열). */
    public List<LedgerResponse> ledger() {
        return servers.findAllByOrderBySeqAsc().stream().map(LedgerResponse::from).toList();
    }

    /** 기술 사양 탭 (19열). */
    public List<SpecResponse> specs() {
        Map<Long, ServerSpec> byServer = new HashMap<>();
        for (ServerSpec p : specs.findAll()) byServer.put(p.getServer().getId(), p);
        return servers.findAllByOrderBySeqAsc().stream().map(s -> SpecResponse.from(s, byServer.get(s.getId()))).toList();
    }

    /** 섹션3. */
    public ServerDetailResponse detail(String host) {
        Server s = byHost(host);
        JudgementService.Judged jd = judgement.judgeOne(s);
        Judgement j = jd.judgement();
        Snapshot snap = jd.snapshot();
        ServerSpec spec = specs.findByServerId(s.getId()).orElse(null);
        Instant last = snap == null || snap.keyMetric() == null ? null : snap.keyMetric().lastActivityAt();
        String lastText = last == null ? null : "마지막 활동 " + HHMM.format(last);
        Verdict lastVerdict = last == null ? null : j.keyMetric().verdict();
        DbStats db = dbStats.stats(host).orElse(null);
        if (db != null && db.lastSave() != null) { lastText = db.lastSave().text(); lastVerdict = db.lastSave().verdict(); }
        DbStats.Connections conn = db == null ? null : db.connections();
        DbStats.Throughput thru = db == null ? null : db.throughput();
        String connText = conn == null ? null : conn.text(), thruText = thru == null ? null : thru.text();
        Verdict connVerdict = conn == null ? null : conn.verdict();
        HostDetail h = db == null ? hostLive.detail(host).orElse(null) : null;   // 3번 말고 (사용자 10-16 공통 규칙)
        if (h != null) {
            connText = h.connectionText(); connVerdict = h.connectionVerdict(); thruText = h.throughputText();
            if (h.lastText() != null) { lastText = h.lastText(); lastVerdict = h.lastVerdict(); }
        }
        return new ServerDetailResponse(s.getSeq(), s.getHost(), s.isHostConfirmed(), s.getName(), s.getShortName(), s.getIp(),
                s.getNetworkName(), s.getMeasureMode().name(), j.overall(), j.overall().label(), j.uptimeText(),
                j.resources().stream().map(ResourceResponse::from).toList(),
                s.getKeyMetricLabel(), j.keyMetric().value(), j.keyMetric().aux(), j.keyMetric().verdict(),
                lastText, lastVerdict,
                connText, connVerdict, thruText,
                snap == null ? null : snap.measuredAt(), snap == null ? null : snap.collectedAt(), snap == null ? null : snap.source(),
                j.staleness(), j.reasons(), LedgerResponse.from(s), SpecResponse.from(s, spec));
    }

    /** 3번 데이터베이스 — 연결 상대 · 처리량(모듈별 무엇이 들어왔나) · 마지막 저장. 다른 서버는 404. */
    public DbStats dbStats(String host) {
        byHost(host);
        return dbStats.stats(host).orElseThrow(() -> new NotFoundException("DB 통계는 " + host + " 에 없음"));
    }

    /** 규칙 이름 목록 — 화면 개발자가 /api/rules 로 바로 확인. */
    public List<String> rules() {
        return java.util.Arrays.stream(KeyMetricRule.values()).map(Enum::name).toList();
    }
}
