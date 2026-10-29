package com.eseict.ulsan.earthquake.instrument;

import com.eseict.ulsan.earthquake.instrument.dto.InstrumentResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class InstrumentService {

    private final InstrumentRepository repository;

    /** 계측기 목록. 4대뿐이라 전건을 내려준다. */
    public List<InstrumentResponse> list() {
        return repository.findAllByOrderByIdAsc().stream()
                .map(InstrumentResponse::from)
                .toList();
    }
}
