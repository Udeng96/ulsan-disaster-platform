package com.eseict.ulsan.gis.facility.air;

import com.eseict.ulsan.gis.facility.air.dto.AirStationResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AirStationService {

    private final AirStationRepository repository;

    public List<AirStationResponse> listAll() {
        return repository.findAllWithRegion().stream()
                .map(AirStationResponse::from)
                .toList();
    }
}
