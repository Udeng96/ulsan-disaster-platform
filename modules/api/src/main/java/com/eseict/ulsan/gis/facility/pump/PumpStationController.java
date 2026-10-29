package com.eseict.ulsan.gis.facility.pump;

import com.eseict.ulsan.gis.facility.pump.dto.PumpStationResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 펌프장 조회.
 *
 * <p>{@code GET /api/pump/stations} — 12 펌프장 전체 + 화면 표출 장비 한 번에.
 * 마커 / 리스트 / 상세 페이지가 다 이 한 endpoint 를 사용한다.
 */
@RestController
@RequestMapping("/api/pump/stations")
@RequiredArgsConstructor
public class PumpStationController {

    private final PumpStationService service;

    @GetMapping
    public List<PumpStationResponse> list() {
        return service.listAll();
    }
}
