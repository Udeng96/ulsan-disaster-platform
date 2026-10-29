package com.eseict.ulsan.server.controller;

import com.eseict.ulsan.server.dto.OverviewResponse;
import com.eseict.ulsan.server.dto.RackSlotResponse;
import com.eseict.ulsan.server.service.OverviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "overview", description = "관리자 메인 「시스템 운영현황」 · 섹션1·2 랙")
@RestController
@RequestMapping("/api")
public class OverviewController {

    private final OverviewService overview;

    public OverviewController(OverviewService overview) {
        this.overview = overview;
    }

    @Operation(summary = "메인 카드 13장 + 집계 + 갱신 시각")
    @GetMapping("/overview")
    public OverviewResponse overview() {
        return overview.overview();
    }

    @Operation(summary = "섹션1·2 — 랙 칸 13개 (형상·판정색·점 모양)")
    @GetMapping("/rack-slots")
    public List<RackSlotResponse> rack() {
        return overview.rack();
    }
}
