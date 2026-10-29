package com.eseict.ulsan.slope.facility;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ObservationItemRepository extends JpaRepository<ObservationItem, Long> {

    Optional<ObservationItem> findByVendorId(Long vendorId);

    /** 계측기·급경사지까지 한 번에. 목록 화면이 N+1 없이 그려진다. */
    @Query("""
            SELECT oi FROM ObservationItem oi
            JOIN FETCH oi.instrument i
            JOIN FETCH i.area
            ORDER BY i.area.id, i.category, i.displayNo, oi.category
            """)
    List<ObservationItem> findAllWithInstrument();
}
