package com.eseict.ulsan.earthquake.instrument;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstrumentRepository extends JpaRepository<Instrument, Long> {

    /** 전체 계측기. 시드 순서(NGG/NGT/NGV/NGB)가 유지되도록 id 오름차순 고정. */
    List<Instrument> findAllByOrderByIdAsc();
}
