package com.eseict.ulsan.server.controller;

import com.eseict.ulsan.server.host.db.dto.DbStats;
import com.eseict.ulsan.server.host.part.HostPartService;
import com.eseict.ulsan.server.host.part.HostParts;

import com.eseict.ulsan.server.dto.LedgerResponse;
import com.eseict.ulsan.server.dto.ServerDetailResponse;
import com.eseict.ulsan.server.dto.SpecResponse;
import com.eseict.ulsan.server.service.ServerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "servers", description = "자산대장(관리·계약 · 기술 사양) · 섹션3 한 대 상세")
@RestController
@RequestMapping("/api")
public class ServerController {

    private final ServerService servers;
    private final HostPartService parts;

    public ServerController(ServerService servers, HostPartService parts) {
        this.servers = servers;
        this.parts = parts;
    }

    @Operation(summary = "자산대장 「관리·계약」 13열 × 13대")
    @GetMapping("/servers")
    public List<LedgerResponse> ledger() {
        return servers.ledger();
    }

    @Operation(summary = "자산대장 「기술 사양」 19열 × 13대")
    @GetMapping("/server-specs")
    public List<SpecResponse> specs() {
        return servers.specs();
    }

    @Operation(summary = "섹션3 — 한 대 상세 (판정·가동·자원·핵심값·접이식 자산대장)")
    @GetMapping("/servers/{host}")
    public ServerDetailResponse detail(@PathVariable String host) {
        return servers.detail(host);
    }

    @Operation(summary = "3번 데이터베이스 — ④ 연결 상대 · ⑤ 마지막 저장 · ⑥ 처리량(모듈별 무엇이 들어왔나). 다른 서버는 404")
    @GetMapping("/servers/{host}/db-stats")
    public DbStats dbStats(@PathVariable String host) {
        return servers.dbStats(host);
    }

    @Operation(summary = "전면·후면 표 — 수기항목 엑셀 값 + 서버에서 읽은 디스크·랜카드. 없는 서버는 404")
    @GetMapping("/servers/{host}/parts")
    public HostParts parts(@PathVariable String host) {
        servers.byHost(host);
        return parts.parts(host);
    }

    @Operation(summary = "핵심 항목 규칙 이름 목록")
    @GetMapping("/key-rules")
    public List<String> rules() {
        return servers.rules();
    }
}
