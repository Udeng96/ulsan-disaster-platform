package com.eseict.ulsan.gis.facility.air;

import com.eseict.ulsan.gis.facility.air.dto.AirStationResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 대기질 측정소 조회.
 *
 * <p>{@code GET /api/air/stations} — 7 측정소 + 소속 행정동 이름.
 */
@RestController
@RequestMapping("/api/air/stations")
@RequiredArgsConstructor
public class AirStationController {

    private final AirStationService service;

    @GetMapping
    public List<AirStationResponse> list() {
        return service.listAll();
    }
}
