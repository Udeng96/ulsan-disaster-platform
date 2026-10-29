package com.eseict.ulsan.gis.common.region;

import com.eseict.ulsan.gis.common.region.dto.RegionResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 행정동 조회.
 *
 * <p>{@code GET /api/regions} — 남구 행정동 목록 (display_order 순). 지역 필터용.
 */
@RestController
@RequestMapping("/api/regions")
@RequiredArgsConstructor
public class RegionController {

    private final RegionRepository repository;

    @GetMapping
    public List<RegionResponse> list() {
        return repository.findAllByOrderByDisplayOrderAsc().stream()
                .map(RegionResponse::from)
                .toList();
    }
}
