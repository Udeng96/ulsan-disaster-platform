package com.eseict.ulsan.gis.facility.shelter;

import com.eseict.ulsan.gis.facility.shelter.dto.CoolingShelterResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class CoolingShelterService {

    private final CoolingShelterRepository repository;

    public List<CoolingShelterResponse> listAll() {
        return repository.findAllWithRegion().stream()
                .map(CoolingShelterResponse::from)
                .toList();
    }
}
