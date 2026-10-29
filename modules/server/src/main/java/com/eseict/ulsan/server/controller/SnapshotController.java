package com.eseict.ulsan.server.controller;

import com.eseict.ulsan.server.dto.SnapshotRequest;
import com.eseict.ulsan.server.dto.SnapshotResponse;
import com.eseict.ulsan.server.service.SnapshotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "snapshots", description = "실측 스냅샷 — 수집기·수동 입력이 쓰고 그래프가 읽는다")
@RestController
@RequestMapping("/api")
public class SnapshotController {

    private final SnapshotService snapshots;

    public SnapshotController(SnapshotService snapshots) {
        this.snapshots = snapshots;
    }

    @Operation(summary = "측정값 1건 기록 (host 가 키)")
    @PostMapping("/snapshots")
    @ResponseStatus(HttpStatus.CREATED)
    public SnapshotResponse record(@Valid @RequestBody SnapshotRequest req) {
        return snapshots.record(req);
    }

    @Operation(summary = "한 대의 이력 (최신순)")
    @GetMapping("/servers/{host}/snapshots")
    public List<SnapshotResponse> history(@PathVariable String host, @RequestParam(defaultValue = "288") int limit) {
        return snapshots.history(host, limit);
    }
}
