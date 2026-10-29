package com.eseict.ulsan.gis.facility.pump;

import com.eseict.ulsan.gis.facility.pump.dto.PumpStationResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PumpStationService {

    private final PumpStationRepository repository;

    public List<PumpStationResponse> listAll() {
        return repository.findAllWithEquipments().stream()
                .map(PumpStationResponse::from)
                .toList();
    }
}
