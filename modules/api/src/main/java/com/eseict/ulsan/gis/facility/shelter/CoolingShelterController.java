package com.eseict.ulsan.gis.facility.shelter;

import com.eseict.ulsan.gis.facility.shelter.dto.CoolingShelterResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 무더위쉼터 조회.
 *
 * <p>{@code GET /api/shelter/cooling} — 71 무더위쉼터 + 소속 행정동 이름.
 */
@RestController
@RequestMapping("/api/shelter/cooling")
@RequiredArgsConstructor
public class CoolingShelterController {

    private final CoolingShelterService service;

    @GetMapping
    public List<CoolingShelterResponse> list() {
        return service.listAll();
    }
}
