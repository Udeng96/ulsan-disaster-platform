package com.eseict.ulsan.server.sw.api;

import com.eseict.ulsan.server.sw.api.dto.KnownMac;
import com.eseict.ulsan.server.sw.api.dto.KnownMacRequest;
import com.eseict.ulsan.server.sw.api.dto.SwitchEvent;
import com.eseict.ulsan.server.sw.api.dto.SwitchPort;
import com.eseict.ulsan.server.sw.api.dto.SwitchSummary;
import com.eseict.ulsan.server.sw.api.dto.SwitchTraffic;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "스위치", description = "서버 운영 화면 스위치 상세")
@RestController
@RequestMapping("/api/switch")
@RequiredArgsConstructor
public class SwitchController {

    private final SwitchQueryService service;

    @Operation(summary = "스위치 카드 (가동·재시작·지금 트래픽·브로드캐스트·에러 포트·전원)")
    @GetMapping("/summary")
    public SwitchSummary summary() {
        return service.summary();
    }

    @Operation(summary = "③ 트래픽 그래프 — range=24h(끝난 1시간 평균 × 24점) | 7d(끝난 하루 평균 × 7점), 응답·브로드캐스트 구간 표시")
    @GetMapping("/traffic")
    public SwitchTraffic traffic(@RequestParam(defaultValue = "24h") String range) {
        return service.traffic(range);
    }

    @Operation(summary = "⑥ 최근 활동 N건 (연결됨·끊김·에러 늘어남·처음 보는 장비)")
    @GetMapping("/events")
    public List<SwitchEvent> events(@RequestParam(defaultValue = "20") int limit) {
        return service.events(limit);
    }

    @Operation(summary = "⑨ 포트 28개 (링크·속도·bps·에러·MAC·미확인 장비)")
    @GetMapping("/ports")
    public List<SwitchPort> ports() {
        return service.ports();
    }

    @Operation(summary = "아는 장비 목록")
    @GetMapping("/known-macs")
    public List<KnownMac> knownMacs() {
        return service.knownMacs();
    }

    @Operation(summary = "아는 장비로 등록 — 미확인 장비를 확인한 뒤 부른다. 다음 화면 갱신부터 빨간 줄이 사라진다")
    @PostMapping("/known-macs")
    public KnownMac registerKnownMac(@Valid @RequestBody KnownMacRequest req) {
        return service.registerKnownMac(req);
    }
}
