package com.eseict.ulsan.gis.common.layer;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 지도 레이어 메뉴.
 *
 * <p>{@code GET /api/layers} — 화면 좌측 레이어 목록 구성용 메타 (사용중인 것만, 순서대로).
 * <p>{@code PUT /api/layers/colors} — 레이어 색 일괄 변경 (컬러 피커, bulk).
 */
@RestController
@RequestMapping("/api/layers")
@RequiredArgsConstructor
public class LayerController {

    private final LayerService service;

    @GetMapping
    public List<LayerResponse> list() {
        return service.listActive();
    }

    @PutMapping("/colors")
    public void updateColors(@RequestBody List<LayerColorUpdate> updates) {
        service.updateColors(updates);
    }
}
