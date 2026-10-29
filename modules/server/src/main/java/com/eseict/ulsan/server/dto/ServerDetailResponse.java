package com.eseict.ulsan.server.dto;

import com.eseict.ulsan.server.domain.Verdict;

import java.time.Instant;
import java.util.List;

/**
 * 섹션3 (한 대 상세) — 5줄 가동 / 자원 / 연결 상대 / 최근 활동 / 처리량 + 접이식 자산대장에 필요한 값.
 * 연결 상대 · 최근 활동 · 처리량 (못 읽은 칸은 null → 화면 「실측 대기」):
 *  - 3번: db-stats (2026-10-15). lastActivityText 「마지막 저장 … — 모듈들」. 모듈별 「무엇이 들어왔나」는 GET /api/servers/{host}/db-stats.
 *  - 4~10·12번 (SSH, 사용자 2026-10-16): 「3대 접속 — IoT(.104) 5 · …」 · 「nginx 실행 중 · 10-02 09:13부터」 · 「오늘 받음 1.2GB · 보냄 340.0MB」.
 *  - 5번 · 13번: 최근 활동·처리량은 3번 DB 기록 「마지막 수신 … — 모듈들」 · 「오늘 수신 N건」. 13번은 (3번 DB 기록) 간접.
 *  - 11번: 10번 값에 (간접).
 */
public record ServerDetailResponse(
        int seq,
        String host,
        boolean hostConfirmed,
        String name,
        String shortName,
        String ip,
        String networkName,
        String measureMode,
        Verdict verdict,
        String verdictLabel,
        String uptimeText,
        List<ResourceResponse> resources,
        String keyLabel,
        String keyValue,
        String keyAux,
        Verdict keyVerdict,
        String lastActivityText,
        Verdict lastActivityVerdict,
        String connectionText,
        Verdict connectionVerdict,
        String throughputText,
        Instant measuredAt,
        Instant collectedAt,
        String source,
        Verdict staleness,
        List<String> reasons,
        LedgerResponse ledger,
        SpecResponse spec) {
}
