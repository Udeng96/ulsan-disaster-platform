package com.eseict.ulsan.server.host.db.dto;

import com.eseict.ulsan.server.domain.Verdict;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

/** 3번 데이터베이스 상세 — ④ 연결 상대 · ⑤ 최근 활동(마지막 저장) · ⑥ 처리량. 읽지 못한 칸은 null (화면 「실측 대기」). */
public record DbStats(
        String host,
        @Schema(description = "읽은 시각") Instant collectedAt,
        @Schema(description = "④ 연결 상대") Connections connections,
        @Schema(description = "⑥ 처리량") Throughput throughput,
        @Schema(description = "⑤ 최근 활동 — 마지막 저장") LastSave lastSave) {

    public record Connections(
            @Schema(description = "화면 한 줄. 예: 4대 접속 — 대시보드(.103) 12 · IoT(.104) 5") String text,
            Verdict verdict,
            @Schema(description = "접속한 서버 수") int peerCount,
            @Schema(description = "접속 수 합계") long total,
            List<Peer> peers) {}

    public record Peer(String ip, @Schema(description = "자산대장 짧은 이름. 모르는 IP 면 null") String name, long count) {}

    public record Throughput(
            @Schema(description = "화면 한 줄. 예: 25테이블 · 오늘 증가 12,400행") String text,
            int tableCount,
            @Schema(description = "오늘(서울 0시부터) 들어온 행. 지운 행은 빼지 않음") long todayRows,
            @Schema(description = "무엇이 들어왔나 — 모듈(스키마)별, 많은 순. 0행인 모듈은 뺌") List<Module> modules) {}

    public record Module(String schema, @Schema(description = "화면 이름 (db-stats.schema-labels)") String label, long rows, List<Table> tables) {}

    public record Table(String table, long rows) {}

    public record LastSave(
            @Schema(description = "화면 한 줄. 예: 마지막 저장 09:05 — 지진 · CCTV · 급경사지 / 저장 기록 대기") String text,
            @Schema(description = "30분 넘게 저장이 없으면 주의 · 2시간 장애") Verdict verdict,
            @Schema(description = "가장 최근 저장 시각 (60초 단위로 알아챔)") Instant at,
            @Schema(description = "가장 최근에 저장한 모듈 (최대 3개)") List<String> modules) {}
}
