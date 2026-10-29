package com.eseict.ulsan.gis.common.search;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 주소 검색 — 도로명주소 API 통합 검색 (도로명 + 지번 + 건물명).
 *
 * <p>{@code GET /api/search?q=가상시설0411로143번길} — 도로명만 쳐도 그 도로 주소 전부.
 * {@code page} 로 다음 페이지 조회 (기본 1).
 */
@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService service;

    @GetMapping
    public List<SearchResultItem> search(
            @RequestParam("q") String q,
            @RequestParam(name = "page", defaultValue = "1") int page) {
        return service.search(q, page);
    }
}
