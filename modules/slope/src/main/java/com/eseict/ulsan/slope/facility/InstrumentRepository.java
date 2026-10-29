package com.eseict.ulsan.slope.facility;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstrumentRepository extends JpaRepository<Instrument, Long> {

    Optional<Instrument> findByVendorId(Long vendorId);

    /** 지도·목록용 전건. 지구 → 종류 → 번호 순. */
    List<Instrument> findAllByOrderByAreaIdAscCategoryAscDisplayNoAsc();
}
