package com.eseict.ulsan.server.firewall.api;

import com.eseict.ulsan.server.firewall.api.dto.FirewallBlockChart;
import com.eseict.ulsan.server.firewall.api.dto.FirewallBlockType;
import com.eseict.ulsan.server.firewall.api.dto.FirewallEvent;
import com.eseict.ulsan.server.firewall.api.dto.FirewallPort;
import com.eseict.ulsan.server.firewall.api.dto.FirewallSummary;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "방화벽", description = "서버 운영 화면 방화벽 카드·전면 포트·이벤트")
@RestController
@RequestMapping("/api/firewall")
@RequiredArgsConstructor
public class FirewallController {

    private final FirewallQueryService service;

    @Operation(summary = "방화벽 카드 (가동·자원·정책·차단 건수)")
    @GetMapping("/summary")
    public FirewallSummary summary() {
        return service.summary();
    }

    @Operation(summary = "③ 차단 그래프 — range=24h(끝난 1시간 × 24점, 값 = 건수×24) | 7d(끝난 하루 × 7점)")
    @GetMapping("/blocks")
    public FirewallBlockChart blocks(@RequestParam(defaultValue = "24h") String range) {
        return service.blocks(range);
    }

    @Operation(summary = "⑪ 유형별 내역 — 24시간 차단을 IPv4 차단 · IPv6 차단 · 위협으로 나눈 건수")
    @GetMapping("/block-types")
    public List<FirewallBlockType> blockTypes() {
        return service.blockTypes();
    }

    @Operation(summary = "전면 포트 표 (라벨 순)")
    @GetMapping("/ports")
    public List<FirewallPort> ports() {
        return service.ports();
    }

    @Operation(summary = "⑥ 최근 활동 N건 (경고·관리자·차단 로그 + 정책 변경)")
    @GetMapping("/events")
    public List<FirewallEvent> events(@RequestParam(defaultValue = "20") int limit) {
        return service.events(limit);
    }
}
