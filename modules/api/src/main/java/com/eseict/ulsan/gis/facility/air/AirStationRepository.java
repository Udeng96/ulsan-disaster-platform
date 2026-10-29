package com.eseict.ulsan.gis.facility.air;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AirStationRepository extends JpaRepository<AirStation, Long> {

    /** 모든 측정소 + 소속 행정동 한 번에 fetch. */
    @Query("""
            SELECT s FROM AirStation s
            LEFT JOIN FETCH s.region
            ORDER BY s.id ASC
            """)
    List<AirStation> findAllWithRegion();
}
